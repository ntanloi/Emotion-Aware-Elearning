package com.elearning.emotion.service;

import com.elearning.emotion.dto.CourseReviewDto;
import com.elearning.emotion.dto.CourseReviewListDto;
import com.elearning.emotion.dto.CourseReviewRequest;
import com.elearning.emotion.dto.MyCourseReviewDto;
import com.elearning.emotion.dto.ReviewReportRequest;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.CourseReview;
import com.elearning.emotion.entity.Enrollment;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.entity.ReviewImage;
import com.elearning.emotion.entity.ReviewReport;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.CourseReviewRepository;
import com.elearning.emotion.repository.EnrollmentRepository;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.ReviewImageRepository;
import com.elearning.emotion.repository.ReviewReportRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Dịch vụ đánh giá khóa học (Phase 0 - Phase 3):
 * - Học viên chưa đăng ký hoặc chưa học >= 20% chỉ được xem review + điểm sao.
 * - Giảng viên và Admin không được tự đánh giá khóa học.
 * - Ảnh đính kèm tối đa 3 ảnh, phải do chính người đó tải lên.
 * - Xóa đánh giá là xóa mềm (status = DELETED).
 * - Cập nhật điểm trung bình (avg_rating), số lượng và phân bố sao lưu sẵn trên Course trong cùng transaction.
 * - Tự động phát hiện vi phạm (SĐT, URL, từ khóa cấm) và chuyển FLAGGED.
 * - Báo cáo vi phạm từ người dùng và tự động gắn cờ khi có >= 3 báo cáo.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CourseReviewService {

    public static final int REQUIRED_PROGRESS_PERCENT = 20;

    private final CourseReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final NotificationService notificationService;
    private final ReviewContentFilterService contentFilterService;
    private final ReviewReportRepository reviewReportRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final com.elearning.emotion.repository.CourseFeaturedReviewRepository featuredReviewRepository;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    /**
     * Danh sách đánh giá công khai - ai cũng xem được, chỉ hiển thị review có trạng thái PUBLISHED.
     */
    public CourseReviewListDto list(String courseId) {
        return list(courseId, null, null, "newest", 0, 10);
    }

    /**
     * Danh sách đánh giá công khai có hỗ trợ lọc theo sao, lọc có ảnh, sắp xếp và phân trang (Phase 1).
     */
    public CourseReviewListDto list(String courseId, Integer rating, Boolean hasImage, String sort, int page, int size) {
        Course course = courseRepository.findById(courseId).orElse(null);
        List<CourseReview> allPublished = reviewRepository.findByCourseIdAndStatusOrderByCreatedAtDesc(courseId, "PUBLISHED");

        Map<Integer, Integer> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0);
        }

        double avgRating = 0.0;
        long totalReviews = allPublished.size();

        if (course != null && course.getReviewCount() != null && course.getReviewCount() > 0) {
            avgRating = course.getAvgRating() != null ? course.getAvgRating() : 0.0;
            totalReviews = course.getReviewCount();
            distribution.put(1, course.getRating1() != null ? course.getRating1() : 0);
            distribution.put(2, course.getRating2() != null ? course.getRating2() : 0);
            distribution.put(3, course.getRating3() != null ? course.getRating3() : 0);
            distribution.put(4, course.getRating4() != null ? course.getRating4() : 0);
            distribution.put(5, course.getRating5() != null ? course.getRating5() : 0);
        } else if (!allPublished.isEmpty()) {
            double sum = 0;
            for (CourseReview r : allPublished) {
                int star = r.getRating() != null ? r.getRating() : 0;
                sum += star;
                if (star >= 1 && star <= 5) {
                    distribution.put(star, distribution.get(star) + 1);
                }
            }
            avgRating = round1(sum / allPublished.size());
        }

        // 1. Lọc theo số sao & có ảnh
        List<CourseReview> filtered = allPublished.stream()
                .filter(r -> rating == null || (r.getRating() != null && r.getRating().equals(rating)))
                .filter(r -> !Boolean.TRUE.equals(hasImage) || (r.getImages() != null && !r.getImages().isEmpty()))
                .toList();

        // 2. Sắp xếp
        List<CourseReview> sorted = new ArrayList<>(filtered);
        String safeSort = sort != null ? sort.trim().toLowerCase() : "newest";
        switch (safeSort) {
            case "oldest" -> sorted.sort((a, b) -> {
                if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                return a.getCreatedAt().compareTo(b.getCreatedAt());
            });
            case "highest" -> sorted.sort((a, b) -> {
                int rA = a.getRating() != null ? a.getRating() : 0;
                int rB = b.getRating() != null ? b.getRating() : 0;
                int cmp = Integer.compare(rB, rA);
                if (cmp != 0) return cmp;
                if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });
            case "lowest" -> sorted.sort((a, b) -> {
                int rA = a.getRating() != null ? a.getRating() : 0;
                int rB = b.getRating() != null ? b.getRating() : 0;
                int cmp = Integer.compare(rA, rB);
                if (cmp != 0) return cmp;
                if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });
            default -> { // "newest"
                sorted.sort((a, b) -> {
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                });
            }
        }

        // 3. Phân trang
        long totalFiltered = sorted.size();
        int safeSize = size > 0 ? size : 10;
        int safePage = Math.max(0, page);
        int totalPages = totalFiltered > 0 ? (int) Math.ceil((double) totalFiltered / safeSize) : 0;
        int fromIndex = Math.min(safePage * safeSize, sorted.size());
        int toIndex = Math.min(fromIndex + safeSize, sorted.size());

        List<CourseReviewDto> pagedDtos = sorted.subList(fromIndex, toIndex).stream()
                .map(CourseReviewDto::from)
                .toList();

        return new CourseReviewListDto(pagedDtos, avgRating, totalReviews, distribution, safePage, safeSize, totalFiltered, totalPages);
    }

    /**
     * Trạng thái đánh giá của người dùng hiện tại đối với khóa học.
     */
    public MyCourseReviewDto mine(String userId, String courseId) {
        if (userId == null) {
            return new MyCourseReviewDto(false, false, 0, REQUIRED_PROGRESS_PERCENT, null, "Vui lòng đăng nhập để đánh giá");
        }

        User user = userRepository.findById(userId).orElse(null);
        Course course = courseRepository.findById(courseId).orElse(null);
        if (user == null || course == null) {
            return new MyCourseReviewDto(false, false, 0, REQUIRED_PROGRESS_PERCENT, null, "Không tìm thấy khóa học hoặc người dùng");
        }

        // Chặn giảng viên hoặc quản trị viên tự đánh giá
        boolean isCourseTeacher = course.getTeacher() != null && course.getTeacher().getId().equals(userId);
        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.getRole());
        if (isCourseTeacher || isAdmin) {
            String roleReason = isCourseTeacher
                    ? "Giảng viên không thể tự đánh giá khóa học của chính mình"
                    : "Quản trị viên không thể tham gia đánh giá khóa học";
            return new MyCourseReviewDto(false, false, 0, REQUIRED_PROGRESS_PERCENT, null, roleReason);
        }

        Optional<Enrollment> enrollmentOpt = enrollmentRepository.findByUserIdAndCourseId(userId, courseId);
        boolean enrolled = enrollmentOpt.isPresent();
        int progress = 0;
        if (enrolled) {
            Float p = enrollmentOpt.get().getProgressPercent();
            progress = p != null ? Math.round(p) : 0;
        }

        CourseReview existing = reviewRepository.findByCourseIdAndUserId(courseId, userId).orElse(null);
        CourseReviewDto reviewDto = (existing != null && !"DELETED".equals(existing.getStatus()))
                ? CourseReviewDto.from(existing)
                : null;

        boolean canReview = enrolled && (progress >= REQUIRED_PROGRESS_PERCENT || reviewDto != null);
        String reason = null;
        if (!enrolled) {
            reason = "Bạn cần đăng ký khóa học này để có thể đánh giá";
        } else if (progress < REQUIRED_PROGRESS_PERCENT && reviewDto == null) {
            reason = "Bạn cần hoàn thành ít nhất " + REQUIRED_PROGRESS_PERCENT + "% khóa học để mở đánh giá (hiện tại: " + progress + "%)";
        }

        return new MyCourseReviewDto(enrolled, canReview, progress, REQUIRED_PROGRESS_PERCENT, reviewDto, reason);
    }

    /**
     * Tạo đánh giá mới (hoặc kích hoạt lại đánh giá đã xóa mềm)
     */
    @Transactional
    public CourseReviewDto create(String userId, String courseId, CourseReviewRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        // Chặn giảng viên hoặc admin tự đánh giá
        if (course.getTeacher() != null && course.getTeacher().getId().equals(userId)) {
            throw new SecurityException("Giảng viên không thể tự đánh giá khóa học của chính mình");
        }
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new SecurityException("Quản trị viên không thể tham gia đánh giá khóa học");
        }

        // Kiểm tra đăng ký & tiến độ học tập tối thiểu
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new SecurityException("Bạn cần đăng ký khóa học này trước khi đánh giá"));

        int progress = enrollment.getProgressPercent() != null ? Math.round(enrollment.getProgressPercent()) : 0;
        if (progress < REQUIRED_PROGRESS_PERCENT) {
            throw new SecurityException("Bạn cần hoàn thành ít nhất " + REQUIRED_PROGRESS_PERCENT + "% khóa học để đánh giá (hiện tại: " + progress + "%)");
        }

        // Kiểm tra nội dung bình luận qua bộ lọc từ khóa tự động (Phase 3)
        ReviewContentFilterService.FilterResult filterResult = contentFilterService.inspect(req.comment());
        String initialStatus = filterResult.flagged() ? "FLAGGED" : "PUBLISHED";
        String flagReason = filterResult.flagged()
                ? ("Tự động gắn cờ vi phạm: " + filterResult.reason() + (filterResult.matchedSnippet() != null ? " (" + filterResult.matchedSnippet() + ")" : ""))
                : null;

        Optional<CourseReview> existingOpt = reviewRepository.findByCourseIdAndUserId(courseId, userId);
        CourseReview review;
        if (existingOpt.isPresent()) {
            review = existingOpt.get();
            if (!"DELETED".equals(review.getStatus())) {
                throw new IllegalStateException("Bạn đã đánh giá khóa học này rồi, vui lòng chỉnh sửa đánh giá cũ");
            }
            // Khôi phục đánh giá đã xóa mềm trước đó
            review.setStatus(initialStatus);
            review.setHiddenReason(flagReason);
            review.setRating(req.rating());
            review.setComment(normalize(req.comment()));
            review.setProgressAtReview(progress);
            review.setIsEdited(false);
            review.setAllowFeature(Boolean.TRUE.equals(req.allowFeature()));
            review.getImages().clear();
        } else {
            review = CourseReview.builder()
                    .course(course)
                    .user(user)
                    .rating(req.rating())
                    .comment(normalize(req.comment()))
                    .status(initialStatus)
                    .hiddenReason(flagReason)
                    .progressAtReview(progress)
                    .isEdited(false)
                    .allowFeature(Boolean.TRUE.equals(req.allowFeature()))
                    .images(new ArrayList<>())
                    .build();
        }

        attachImages(review, req.imageMediaIds(), userId);
        review = reviewRepository.save(review);

        // Cập nhật thống kê sao vào courses cùng transaction (chỉ cộng review PUBLISHED)
        updateCourseRatingStats(courseId);

        // Gửi thông báo đến giảng viên phụ trách khóa học nếu review được PUBLISHED (Phase 2)
        if ("PUBLISHED".equals(initialStatus) && course.getTeacher() != null) {
            String anonName = CourseReviewDto.anonymizeName(user.getFullName());
            notificationService.send(
                    course.getTeacher().getId(),
                    "Đánh giá mới cho khóa học: " + course.getTitle(),
                    "Học viên " + anonName + " vừa gửi đánh giá " + review.getRating() + " sao.",
                    "NEW_REVIEW",
                    review.getId(),
                    "/teacher/courses/" + course.getId() + "/reviews"
            );
        } else if ("FLAGGED".equals(initialStatus)) {
            // Thông báo cho học viên biết bài đánh giá đang được kiểm duyệt
            notificationService.send(
                    userId,
                    "Đánh giá của bạn đang chờ kiểm duyệt",
                    "Hệ thống phát hiện nội dung có thể vi phạm quy chế (" + filterResult.reason() + "). Đánh giá sẽ được hiển thị sau khi quản trị viên phê duyệt.",
                    "REVIEW_MODERATION",
                    review.getId(),
                    "/courses/" + course.getId()
            );
        }

        // Phát SSE sau khi transaction commit
        publishReviewEvent(course, courseId, review.getRating(), initialStatus);

        return CourseReviewDto.from(review);
    }

    /**
     * Chỉnh sửa đánh giá của chính mình
     */
    @Transactional
    public CourseReviewDto update(String userId, String courseId, CourseReviewRequest req) {
        CourseReview review = getOwnedOrThrow(userId, courseId);
        if ("DELETED".equals(review.getStatus())) {
            throw new IllegalArgumentException("Đánh giá này đã bị xóa");
        }

        // Kiểm tra nội dung bình luận qua bộ lọc tự động (Phase 3)
        ReviewContentFilterService.FilterResult filterResult = contentFilterService.inspect(req.comment());
        if (filterResult.flagged()) {
            review.setStatus("FLAGGED");
            review.setHiddenReason("Tự động gắn cờ vi phạm: " + filterResult.reason() + (filterResult.matchedSnippet() != null ? " (" + filterResult.matchedSnippet() + ")" : ""));
        } else if ("FLAGGED".equals(review.getStatus())) {
            // Đã sửa sạch từ khóa vi phạm -> đưa lại về PUBLISHED
            review.setStatus("PUBLISHED");
            review.setHiddenReason(null);
        } else if ("HIDDEN".equals(review.getStatus())) {
            // Học viên sửa lại bài đánh giá bị admin ẩn -> chuyển thành FLAGGED để admin duyệt lại
            review.setStatus("FLAGGED");
            review.setHiddenReason("Học viên đã chỉnh sửa sau khi bị ẩn, chờ quản trị viên duyệt lại");
        }

        review.setRating(req.rating());
        review.setComment(normalize(req.comment()));
        review.setIsEdited(true);
        if (req.allowFeature() != null) {
            review.setAllowFeature(req.allowFeature());
        }

        // Cập nhật lại ảnh đính kèm
        review.getImages().clear();
        attachImages(review, req.imageMediaIds(), userId);

        review = reviewRepository.save(review);
        updateCourseRatingStats(courseId);

        // Phát SSE khi chỉnh sửa đánh giá
        publishReviewEvent(review.getCourse(), courseId, review.getRating(), review.getStatus());

        // Tự động gỡ khỏi bảng giới thiệu nếu không còn đủ điều kiện (Phase 4)
        var featuredList = featuredReviewRepository.findByReviewId(review.getId());
        if (!featuredList.isEmpty()) {
            boolean eligible = "PUBLISHED".equals(review.getStatus())
                    && Boolean.TRUE.equals(review.getAllowFeature())
                    && review.getRating() != null && review.getRating() >= 4
                    && review.getImages() != null && review.getImages().stream().anyMatch(img -> !Boolean.TRUE.equals(img.getIsHidden()));
            if (!eligible) {
                featuredReviewRepository.deleteByReviewId(review.getId());
            }
        }

        return CourseReviewDto.from(review);
    }

    /**
     * Báo cáo đánh giá hoặc ảnh vi phạm (Phase 3)
     */
    @Transactional
    public void reportReview(String userId, String reviewId, ReviewReportRequest req) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));
        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đánh giá"));

        if (review.getUser() != null && review.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không thể tự báo cáo đánh giá của chính mình");
        }

        if (reviewReportRepository.existsByReviewIdAndReporterId(reviewId, userId)) {
            throw new IllegalArgumentException("Bạn đã gửi báo cáo cho đánh giá này rồi");
        }

        ReviewImage targetImage = null;
        if (req.imageId() != null && !req.imageId().isBlank()) {
            targetImage = reviewImageRepository.findById(req.imageId()).orElse(null);
        }

        ReviewReport report = ReviewReport.builder()
                .review(review)
                .image(targetImage)
                .reporter(reporter)
                .reason(req.reason())
                .details(req.details())
                .status("PENDING")
                .build();
        ReviewReport savedReport = reviewReportRepository.save(report);

        try {
            realtimePublisher.publishToModerationStaff("admin-stats", Map.of(
                    "reason", "NEW_REVIEW_REPORT",
                    "reportId", savedReport.getId()
            ));
        } catch (Exception ignored) {}

        // Quy tắc: Nếu tích lũy >= 3 báo cáo chờ duyệt trên một đánh giá PUBLISHED, tự động chuyển sang FLAGGED
        long pendingReports = reviewReportRepository.findByReviewIdAndStatus(reviewId, "PENDING").size();
        if (pendingReports >= 3 && "PUBLISHED".equals(review.getStatus())) {
            review.setStatus("FLAGGED");
            review.setHiddenReason("Tự động gắn cờ chờ duyệt do nhận từ 3 báo cáo vi phạm");
            reviewRepository.save(review);
            updateCourseRatingStats(review.getCourse().getId());
            publishReviewEvent(review.getCourse(), review.getCourse().getId(), null, "FLAGGED");
        }
    }

    /**
     * Xóa mềm đánh giá (status = DELETED)
     */
    @Transactional
    public void delete(String userId, String courseId) {
        CourseReview review = getOwnedOrThrow(userId, courseId);
        review.setStatus("DELETED");
        reviewRepository.save(review);
        featuredReviewRepository.deleteByReviewId(review.getId());
        updateCourseRatingStats(courseId);
        // Phát SSE khi xóa đánh giá
        publishReviewEvent(review.getCourse(), courseId, null, "DELETED");
    }

    /**
     * Phát sự kiện SSE khi có thay đổi đánh giá:
     * - Gửi "course-review" tới giảng viên sở hữu khóa học (nếu review PUBLISHED)
     * - Gửi "course-review-public" broadcast tới tất cả người dùng (để học viên khác xem trang detail cập nhật)
     */
    private void publishReviewEvent(Course course, String courseId, Integer rating, String status) {
        if (realtimePublisher == null || courseId == null) return;
        try {
            Course c = course;
            if (c == null || c.getTeacher() == null) {
                c = courseRepository.findById(courseId).orElse(null);
            }
            if (c != null && c.getTeacher() != null) {
                realtimePublisher.publishToUser(
                        c.getTeacher().getId(),
                        "course-review",
                        Map.of("courseId", courseId, "action", status != null ? status : "CHANGED")
                );
            }
        } catch (Exception e) {
            log.warn("[CourseReviewService] Không thể gửi SSE tới giảng viên: {}", e.getMessage());
        }
        try {
            realtimePublisher.publishToAll(
                    "course-review-public",
                    Map.of("courseId", courseId, "action", status != null ? status : "CHANGED")
            );
        } catch (Exception e) {
            log.warn("[CourseReviewService] Không thể broadcast SSE course-review-public: {}", e.getMessage());
        }
    }

    /**
     * Cập nhật điểm trung bình, số lượng và phân bố sao vào bảng courses
     */
    @Transactional
    public void updateCourseRatingStats(String courseId) {
        Course course = courseRepository.findById(courseId).orElse(null);
        if (course == null) return;

        List<CourseReview> published = reviewRepository.findByCourseIdAndStatus(courseId, "PUBLISHED");
        int count = published.size();
        int r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0;
        double sum = 0;
        for (CourseReview r : published) {
            int stars = r.getRating() != null ? r.getRating() : 0;
            sum += stars;
            switch (stars) {
                case 1 -> r1++;
                case 2 -> r2++;
                case 3 -> r3++;
                case 4 -> r4++;
                case 5 -> r5++;
                default -> {}
            }
        }
        double avg = count > 0 ? round1(sum / count) : 0.0;
        course.setAvgRating(avg);
        course.setReviewCount(count);
        course.setRating1(r1);
        course.setRating2(r2);
        course.setRating3(r3);
        course.setRating4(r4);
        course.setRating5(r5);
        courseRepository.save(course);
    }

    /**
     * Dùng ở CourseController để hiển thị ⭐ trung bình + số lượng review trên danh sách/chi tiết khóa học.
     * Tận dụng trường avgRating & reviewCount lưu sẵn trong Course, loại bỏ N+1 và truy vấn nặng.
     */
    public Map<String, double[]> summariesFor(List<String> courseIds) {
        Map<String, double[]> result = new HashMap<>();
        if (courseIds.isEmpty()) return result;

        List<Course> courses = courseRepository.findAllById(courseIds);
        for (Course c : courses) {
            double avg = c.getAvgRating() != null ? c.getAvgRating() : 0.0;
            long count = c.getReviewCount() != null ? c.getReviewCount() : 0L;
            result.put(c.getId(), new double[]{avg, (double) count});
        }
        return result;
    }

    private void attachImages(CourseReview review, List<String> imageMediaIds, String userId) {
        if (imageMediaIds == null || imageMediaIds.isEmpty()) {
            return;
        }
        if (imageMediaIds.size() > 3) {
            throw new IllegalArgumentException("Chỉ được đính kèm tối đa 3 ảnh trong mỗi đánh giá");
        }

        int order = 0;
        for (String mediaId : imageMediaIds) {
            if (mediaId == null || mediaId.isBlank()) continue;
            MediaAsset asset = mediaAssetRepository.findById(mediaId.trim())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ảnh: " + mediaId));

            // Bảo mật: Chỉ dùng được ảnh do chính người này tải lên
            if (asset.getUploader() == null || !userId.equals(asset.getUploader().getId())) {
                throw new SecurityException("Bạn chỉ được đính kèm ảnh do chính bạn tải lên");
            }

            ReviewImage ri = ReviewImage.builder()
                    .review(review)
                    .mediaAsset(asset)
                    .sortOrder(order++)
                    .build();
            review.getImages().add(ri);
        }
    }

    private CourseReview getOwnedOrThrow(String userId, String courseId) {
        return reviewRepository.findByCourseIdAndUserId(courseId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Bạn chưa đánh giá khóa học này"));
    }

    private static String normalize(String comment) {
        if (comment == null) return null;
        String trimmed = comment.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
