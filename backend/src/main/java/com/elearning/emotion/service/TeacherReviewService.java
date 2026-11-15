package com.elearning.emotion.service;

import com.elearning.emotion.dto.CourseReviewDto;
import com.elearning.emotion.dto.CourseReviewListDto;
import com.elearning.emotion.dto.TeacherReviewReplyRequest;
import com.elearning.emotion.dto.TeacherReviewStatsDto;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.CourseReview;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.CourseReviewRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherReviewService {

    private final CourseReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    /**
     * Lấy danh sách đánh giá của khóa học với các bộ lọc dành cho giảng viên (Phase 2):
     * - hasImage: lọc đánh giá có kèm ảnh
     * - minRating: lọc đánh giá từ minRating sao trở lên
     * - rating: lọc chính xác số sao
     * - unanswered: lọc đánh giá chưa được giảng viên phản hồi
     */
    public CourseReviewListDto listTeacherCourseReviews(
            String teacherId,
            String courseId,
            Boolean hasImage,
            Integer minRating,
            Integer rating,
            Boolean unanswered,
            String sort,
            int page,
            int size
    ) {
        Course course = validateCourseOwnership(teacherId, courseId);
        List<CourseReview> allPublished = reviewRepository.findByCourseIdAndStatusOrderByCreatedAtDesc(courseId, "PUBLISHED");

        Map<Integer, Integer> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) distribution.put(i, 0);

        for (CourseReview r : allPublished) {
            int star = r.getRating() != null ? r.getRating() : 0;
            if (star >= 1 && star <= 5) {
                distribution.put(star, distribution.get(star) + 1);
            }
        }

        double avgRating = course.getAvgRating() != null ? course.getAvgRating() : 0.0;
        long totalReviews = allPublished.size();

        // Áp dụng bộ lọc
        List<CourseReview> filtered = allPublished.stream()
                .filter(r -> rating == null || (r.getRating() != null && r.getRating().equals(rating)))
                .filter(r -> minRating == null || (r.getRating() != null && r.getRating() >= minRating))
                .filter(r -> !Boolean.TRUE.equals(hasImage) || (r.getImages() != null && !r.getImages().isEmpty()))
                .filter(r -> !Boolean.TRUE.equals(unanswered) || (r.getTeacherReply() == null || r.getTeacherReply().isBlank()))
                .toList();

        // Sắp xếp
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

        // Phân trang
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
     * Giảng viên phản hồi công khai đánh giá của học viên (1 phản hồi mỗi đánh giá).
     */
    @Transactional
    public CourseReviewDto replyToReview(String teacherId, String reviewId, TeacherReviewReplyRequest req) {
        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đánh giá: " + reviewId));

        Course course = review.getCourse();
        validateCourseOwnership(teacherId, course.getId());

        review.setTeacherReply(req.reply().trim());
        review.setTeacherRepliedAt(LocalDateTime.now());
        review = reviewRepository.save(review);

        // Gửi thông báo đến học viên sở hữu đánh giá
        if (review.getUser() != null) {
            String snippet = req.reply().length() > 60
                    ? req.reply().substring(0, 57) + "..."
                    : req.reply();
            notificationService.send(
                    review.getUser().getId(),
                    "Giảng viên đã phản hồi đánh giá của bạn",
                    "Giảng viên đã trả lời nhận xét về khóa học \"" + course.getTitle() + "\": \"" + snippet + "\"",
                    "TEACHER_REPLY",
                    review.getId(),
                    "/courses/" + course.getId()
            );
        }

        try {
            if (realtimePublisher != null) {
                realtimePublisher.publishToAll("course-review-public", Map.of("courseId", course.getId(), "action", "REPLY_ADDED"));
            }
        } catch (Exception e) {
            log.warn("[TeacherReviewService] Lỗi khi phát SSE reply: {}", e.getMessage());
        }

        return CourseReviewDto.from(review);
    }

    /**
     * Giảng viên xóa phản hồi của mình trên đánh giá.
     */
    @Transactional
    public CourseReviewDto deleteReply(String teacherId, String reviewId) {
        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đánh giá: " + reviewId));

        validateCourseOwnership(teacherId, review.getCourse().getId());

        review.setTeacherReply(null);
        review.setTeacherRepliedAt(null);
        CourseReview saved = reviewRepository.save(review);

        try {
            if (realtimePublisher != null) {
                realtimePublisher.publishToAll("course-review-public", Map.of("courseId", review.getCourse().getId(), "action", "REPLY_DELETED"));
            }
        } catch (Exception e) {
            log.warn("[TeacherReviewService] Lỗi khi phát SSE delete reply: {}", e.getMessage());
        }

        return CourseReviewDto.from(saved);
    }

    /**
     * Thống kê đánh giá khóa học: Trung bình, phân bố sao, số lượng chưa trả lời & xu hướng 6 tháng gần nhất.
     */
    public TeacherReviewStatsDto getCourseReviewStats(String teacherId, String courseId) {
        Course course = validateCourseOwnership(teacherId, courseId);
        List<CourseReview> allPublished = reviewRepository.findByCourseIdAndStatusOrderByCreatedAtDesc(courseId, "PUBLISHED");

        long unansweredCount = allPublished.stream()
                .filter(r -> r.getTeacherReply() == null || r.getTeacherReply().isBlank())
                .count();

        long withImagesCount = allPublished.stream()
                .filter(r -> r.getImages() != null && !r.getImages().isEmpty())
                .count();

        Map<Integer, Integer> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) distribution.put(i, 0);

        for (CourseReview r : allPublished) {
            int star = r.getRating() != null ? r.getRating() : 0;
            if (star >= 1 && star <= 5) {
                distribution.put(star, distribution.get(star) + 1);
            }
        }

        double avgRating = course.getAvgRating() != null ? course.getAvgRating() : 0.0;
        long totalReviews = allPublished.size();

        // Xu hướng theo tháng trong vòng 6 tháng gần nhất
        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("yyyy-MM");
        LocalDateTime sixMonthsAgo = LocalDateTime.now().minusMonths(5).withDayOfMonth(1).withHour(0).withMinute(0);

        Map<String, List<CourseReview>> byMonth = allPublished.stream()
                .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().isAfter(sixMonthsAgo))
                .collect(Collectors.groupingBy(r -> r.getCreatedAt().format(monthFmt)));

        List<TeacherReviewStatsDto.MonthlyTrendItem> monthlyTrend = new ArrayList<>();
        LocalDateTime cur = sixMonthsAgo;
        LocalDateTime now = LocalDateTime.now();
        while (!cur.isAfter(now)) {
            String mKey = cur.format(monthFmt);
            List<CourseReview> mReviews = byMonth.getOrDefault(mKey, List.of());
            long mCount = mReviews.size();
            double mAvg = mCount > 0
                    ? Math.round(mReviews.stream().mapToInt(CourseReview::getRating).average().orElse(0.0) * 10.0) / 10.0
                    : 0.0;
            monthlyTrend.add(new TeacherReviewStatsDto.MonthlyTrendItem(mKey, mCount, mAvg));
            cur = cur.plusMonths(1);
        }

        return new TeacherReviewStatsDto(avgRating, totalReviews, unansweredCount, withImagesCount, distribution, monthlyTrend);
    }

    private Course validateCourseOwnership(String teacherId, String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        User user = userRepository.findById(teacherId).orElse(null);
        boolean isAdmin = user != null && "ADMIN".equalsIgnoreCase(user.getRole());
        boolean isOwner = course.getTeacher() != null && course.getTeacher().getId().equals(teacherId);

        if (!isAdmin && !isOwner) {
            throw new SecurityException("Bạn không có quyền quản lý đánh giá của khóa học này");
        }
        return course;
    }
}
