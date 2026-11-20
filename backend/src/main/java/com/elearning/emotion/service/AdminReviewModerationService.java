package com.elearning.emotion.service;

import com.elearning.emotion.dto.AdminReviewDto;
import com.elearning.emotion.dto.ReviewReportDto;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.CourseReview;
import com.elearning.emotion.entity.ReviewImage;
import com.elearning.emotion.entity.ReviewReport;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.CourseReviewRepository;
import com.elearning.emotion.repository.ReviewImageRepository;
import com.elearning.emotion.repository.ReviewReportRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminReviewModerationService {

    private final CourseReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final ReviewReportRepository reviewReportRepository;
    private final UserRepository userRepository;
    private final CourseReviewService courseReviewService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final CourseFeaturedReviewService featuredReviewService;
    private final RealtimePublisher realtimePublisher;

    /**
     * Danh sách đánh giá dành cho Admin quản lý & kiểm duyệt (Phase 3)
     */
    public Map<String, Object> listReviews(
            String status,
            String courseId,
            String search,
            int page,
            int size
    ) {
        List<CourseReview> all = reviewRepository.findAll().stream()
                .filter(r -> courseId == null || (r.getCourse() != null && courseId.equals(r.getCourse().getId())))
                .filter(r -> {
                    if (status == null || "ALL".equalsIgnoreCase(status)) return true;
                    return status.equalsIgnoreCase(r.getStatus());
                })
                .filter(r -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.toLowerCase().trim();
                    boolean matchComment = r.getComment() != null && r.getComment().toLowerCase().contains(q);
                    boolean matchStudent = r.getUser() != null && (
                            r.getUser().getFullName().toLowerCase().contains(q) ||
                            r.getUser().getEmail().toLowerCase().contains(q)
                    );
                    boolean matchCourse = r.getCourse() != null && r.getCourse().getTitle().toLowerCase().contains(q);
                    return matchComment || matchStudent || matchCourse;
                })
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .toList();

        int total = all.size();
        int safeSize = size > 0 ? size : 15;
        int safePage = Math.max(0, page);
        int totalPages = total > 0 ? (int) Math.ceil((double) total / safeSize) : 0;
        int from = Math.min(safePage * safeSize, total);
        int to = Math.min(from + safeSize, total);

        List<AdminReviewDto> dtos = all.subList(from, to).stream().map(r -> {
            long reportCount = reviewReportRepository.findByReviewId(r.getId()).size();
            return AdminReviewDto.from(r, reportCount);
        }).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("reviews", dtos);
        result.put("total", total);
        result.put("page", safePage);
        result.put("size", safeSize);
        result.put("totalPages", totalPages);
        return result;
    }

    /**
     * Hàng đợi báo cáo vi phạm (review_reports)
     */
    public Map<String, Object> listReports(String status, int page, int size) {
        int safeSize = size > 0 ? size : 15;
        int safePage = Math.max(0, page);
        PageRequest pr = PageRequest.of(safePage, safeSize);

        List<ReviewReport> reports;
        long total;
        if (status == null || "ALL".equalsIgnoreCase(status)) {
            reports = reviewReportRepository.findAllByOrderByCreatedAtDesc(pr);
            total = reviewReportRepository.count();
        } else {
            reports = reviewReportRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pr);
            total = reviewReportRepository.countByStatus(status.toUpperCase());
        }

        int totalPages = total > 0 ? (int) Math.ceil((double) total / safeSize) : 0;
        List<ReviewReportDto> dtos = reports.stream().map(ReviewReportDto::from).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("reports", dtos);
        result.put("total", total);
        result.put("page", safePage);
        result.put("size", safeSize);
        result.put("totalPages", totalPages);
        return result;
    }

    /**
     * Phát realtime sau khi admin ẩn/khôi phục đánh giá hoặc ảnh: học viên đang xem trang khóa học
     * ("course-review-public") và giảng viên đang xem trang đánh giá ("course-review") tự làm mới danh sách,
     * không cần reload. Sự kiện chỉ thực sự được gửi SAU KHI transaction commit.
     */
    private void publishReviewChanged(CourseReview review, String action) {
        try {
            if (review == null || review.getCourse() == null) return;
            String courseId = review.getCourse().getId();
            realtimePublisher.publishToAll("course-review-public",
                    java.util.Map.of("courseId", courseId, "action", action));
            if (review.getCourse().getTeacher() != null) {
                realtimePublisher.publishToUser(review.getCourse().getTeacher().getId(), "course-review",
                        java.util.Map.of("courseId", courseId, "action", action));
            }
            realtimePublisher.publishToRole("ADMIN", "admin-stats",
                    java.util.Map.of("reason", "REVIEW_MODERATED", "courseId", courseId));
        } catch (Exception ignored) {
            // Realtime chỉ là phần bổ trợ, không được làm hỏng nghiệp vụ chính
        }
    }

    /**
     * Admin ẩn đánh giá vi phạm (kèm lý do)
     */
    @Transactional
    public AdminReviewDto hideReview(String adminId, String reviewId, String reason) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Admin: " + adminId));
        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đánh giá: " + reviewId));

        review.setStatus("HIDDEN");
        review.setHiddenReason(reason);
        review.setHiddenBy(admin);
        review.setHiddenAt(LocalDateTime.now());
        review = reviewRepository.save(review);

        // Cập nhật lại sao trung bình của khóa học (loại bỏ review bị ẩn khỏi thống kê)
        courseReviewService.updateCourseRatingStats(review.getCourse().getId());

        // Tự động gỡ khỏi trang giới thiệu nếu đang được ghim (Phase 4)
        featuredReviewService.autoUnfeatureIfInvalid(reviewId);

        // Đóng các báo cáo vi phạm liên quan
        List<ReviewReport> pendingReports = reviewReportRepository.findByReviewIdAndStatus(reviewId, "PENDING");
        for (ReviewReport rep : pendingReports) {
            rep.setStatus("RESOLVED_HIDDEN");
            rep.setResolvedBy(admin);
            rep.setResolvedAt(LocalDateTime.now());
            rep.setResolutionNote("Admin đã ẩn đánh giá vì lý do: " + reason);
            reviewReportRepository.save(rep);
        }

        // Ghi Audit Log
        auditService.log(admin, "HIDE_REVIEW", "COURSE_REVIEW", reviewId, "Reason: " + reason);
        publishReviewChanged(review, "HIDDEN");

        // Bắn thông báo cho học viên sở hữu đánh giá
        if (review.getUser() != null) {
            notificationService.send(
                    review.getUser().getId(),
                    "Đánh giá của bạn đã bị ẩn",
                    "Đánh giá của bạn về khóa học \"" + review.getCourse().getTitle() + "\" đã bị ẩn do vi phạm quy tắc: " + reason,
                    "REVIEW_MODERATION",
                    review.getId(),
                    "/courses/" + review.getCourse().getId()
            );
        }

        long repCount = reviewReportRepository.findByReviewId(reviewId).size();
        return AdminReviewDto.from(review, repCount);
    }

    /**
     * Admin phê duyệt / khôi phục đánh giá về trạng thái PUBLISHED
     */
    @Transactional
    public AdminReviewDto restoreReview(String adminId, String reviewId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Admin: " + adminId));
        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đánh giá: " + reviewId));

        review.setStatus("PUBLISHED");
        review.setHiddenReason(null);
        review.setHiddenBy(null);
        review.setHiddenAt(null);
        review = reviewRepository.save(review);

        // Tính lại điểm trung bình cho khóa học
        courseReviewService.updateCourseRatingStats(review.getCourse().getId());

        // Bác bỏ các báo cáo chờ duyệt
        List<ReviewReport> pendingReports = reviewReportRepository.findByReviewIdAndStatus(reviewId, "PENDING");
        for (ReviewReport rep : pendingReports) {
            rep.setStatus("RESOLVED_DISMISSED");
            rep.setResolvedBy(admin);
            rep.setResolvedAt(LocalDateTime.now());
            rep.setResolutionNote("Admin đã phê duyệt đánh giá hợp lệ");
            reviewReportRepository.save(rep);
        }

        // Ghi Audit Log
        auditService.log(admin, "RESTORE_REVIEW", "COURSE_REVIEW", reviewId, "Restored to PUBLISHED");
        publishReviewChanged(review, "RESTORED");

        // Gửi thông báo cho học viên
        if (review.getUser() != null) {
            notificationService.send(
                    review.getUser().getId(),
                    "Đánh giá của bạn đã được hiển thị công khai",
                    "Đánh giá của bạn về khóa học \"" + review.getCourse().getTitle() + "\" đã được duyệt và đăng tải công khai.",
                    "REVIEW_MODERATION",
                    review.getId(),
                    "/courses/" + review.getCourse().getId()
            );
        }

        long repCount = reviewReportRepository.findByReviewId(reviewId).size();
        return AdminReviewDto.from(review, repCount);
    }

    /**
     * Admin ẩn riêng ảnh vi phạm
     */
    @Transactional
    public void hideReviewImage(String adminId, String imageId, String reason) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Admin: " + adminId));
        ReviewImage ri = reviewImageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ảnh: " + imageId));

        ri.setIsHidden(true);
        ri.setHiddenReason(reason);
        reviewImageRepository.save(ri);

        // Tự động gỡ khỏi trang giới thiệu nếu review không còn ảnh hợp lệ (Phase 4)
        if (ri.getReview() != null) {
            featuredReviewService.autoUnfeatureIfInvalid(ri.getReview().getId());
        }

        auditService.log(admin, "HIDE_REVIEW_IMAGE", "REVIEW_IMAGE", imageId, "Reason: " + reason);
        publishReviewChanged(ri.getReview(), "IMAGE_HIDDEN");

        CourseReview review = ri.getReview();
        if (review != null && review.getUser() != null) {
            notificationService.send(
                    review.getUser().getId(),
                    "Hình ảnh trong đánh giá của bạn đã bị ẩn",
                    "Một hình ảnh bạn đính kèm trong đánh giá khóa học \"" + review.getCourse().getTitle() + "\" đã bị ẩn: " + reason,
                    "REVIEW_MODERATION",
                    review.getId(),
                    "/courses/" + review.getCourse().getId()
            );
        }
    }

    /**
     * Admin khôi phục ảnh bị ẩn
     */
    @Transactional
    public void restoreReviewImage(String adminId, String imageId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Admin: " + adminId));
        ReviewImage ri = reviewImageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ảnh: " + imageId));

        ri.setIsHidden(false);
        ri.setHiddenReason(null);
        reviewImageRepository.save(ri);

        auditService.log(admin, "RESTORE_REVIEW_IMAGE", "REVIEW_IMAGE", imageId, "Restored");
        publishReviewChanged(ri.getReview(), "IMAGE_RESTORED");
    }

    /**
     * Xử lý báo cáo vi phạm
     */
    @Transactional
    public void resolveReport(String adminId, String reportId, String action, String note) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy Admin: " + adminId));
        ReviewReport rep = reviewReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy báo cáo: " + reportId));

        if ("HIDE_REVIEW".equalsIgnoreCase(action)) {
            hideReview(adminId, rep.getReview().getId(), note != null ? note : rep.getReason());
        } else if ("HIDE_IMAGE".equalsIgnoreCase(action) && rep.getImage() != null) {
            hideReviewImage(adminId, rep.getImage().getId(), note != null ? note : rep.getReason());
            rep.setStatus("RESOLVED_HIDDEN");
            rep.setResolvedBy(admin);
            rep.setResolvedAt(LocalDateTime.now());
            rep.setResolutionNote(note != null ? note : "Đã ẩn ảnh vi phạm");
            reviewReportRepository.save(rep);
        } else {
            // DISMISS
            rep.setStatus("RESOLVED_DISMISSED");
            rep.setResolvedBy(admin);
            rep.setResolvedAt(LocalDateTime.now());
            rep.setResolutionNote(note != null ? note : "Bác bỏ báo cáo không vi phạm");
            reviewReportRepository.save(rep);
        }

        auditService.log(admin, "RESOLVE_REVIEW_REPORT", "REVIEW_REPORT", reportId, "Action: " + action + ", Note: " + note);
    }
}
