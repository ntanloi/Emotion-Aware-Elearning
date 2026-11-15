package com.elearning.emotion.service;

import com.elearning.emotion.dto.CourseFeaturedReviewDto;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.CourseFeaturedReview;
import com.elearning.emotion.entity.CourseReview;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.CourseFeaturedReviewRepository;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.CourseReviewRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseFeaturedReviewService {

    public static final int MAX_FEATURED_REVIEWS = 6;
    public static final int MIN_RATING_FOR_FEATURE = 4;

    private final CourseFeaturedReviewRepository featuredRepository;
    private final CourseRepository courseRepository;
    private final CourseReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    /**
     * Danh sách đánh giá tiêu biểu công khai cho trang chi tiết khóa học (CourseDetailPage).
     * Chỉ trả về các đánh giá hợp lệ (PUBLISHED, allow_feature = true, rating >= 4, có ít nhất 1 ảnh không bị ẩn).
     * Nếu phát hiện đánh giá không còn thỏa mãn, hệ thống sẽ tự động gỡ khỏi bảng featured.
     */
    @Transactional
    public List<CourseFeaturedReviewDto> listPublicFeatured(String courseId) {
        List<CourseFeaturedReview> all = featuredRepository.findByCourseIdOrderBySortOrderAsc(courseId);
        List<CourseFeaturedReviewDto> validDtos = new ArrayList<>();

        for (CourseFeaturedReview cfr : all) {
            CourseReview r = cfr.getReview();
            if (isEligible(r)) {
                validDtos.add(CourseFeaturedReviewDto.from(cfr));
            } else {
                log.info("Tự động gỡ đánh giá {} khỏi danh sách giới thiệu của khóa {} do không còn đủ điều kiện",
                        r != null ? r.getId() : "null", courseId);
                featuredRepository.delete(cfr);
            }
        }
        return validDtos;
    }

    /**
     * Danh sách đánh giá đã ghim dành cho Giảng viên quản lý trong Tab Đánh giá.
     */
    @Transactional
    public List<CourseFeaturedReviewDto> listTeacherFeatured(String teacherId, String courseId) {
        verifyCourseTeacher(teacherId, courseId);
        return listPublicFeatured(courseId);
    }

    /**
     * Giảng viên ghim một đánh giá lên trang giới thiệu.
     * Quy tắc:
     * 1. Đánh giá phải ở trạng thái PUBLISHED.
     * 2. Học viên phải đồng ý (allow_feature = true).
     * 3. Phải có ít nhất 1 hình ảnh hợp lệ (không bị admin ẩn).
     * 4. Điểm đánh giá phải từ 4 sao trở lên.
     * 5. Tối đa 6 đánh giá được ghim mỗi khóa học.
     */
    @Transactional
    public CourseFeaturedReviewDto featureReview(String teacherId, String courseId, String reviewId) {
        User teacher = verifyCourseTeacher(teacherId, courseId);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        CourseReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đánh giá"));

        if (!courseId.equals(review.getCourse().getId())) {
            throw new IllegalArgumentException("Đánh giá này không thuộc về khóa học đã chọn");
        }

        // Kiểm tra đã ghim trước đó chưa
        Optional<CourseFeaturedReview> existingOpt = featuredRepository.findByCourseIdAndReviewId(courseId, reviewId);
        if (existingOpt.isPresent()) {
            return CourseFeaturedReviewDto.from(existingOpt.get());
        }

        // Kiểm tra các điều kiện ghim
        validateEligibleForFeatureOrThrow(review);

        // Kiểm tra giới hạn tối đa 6 đánh giá
        long count = featuredRepository.countByCourseId(courseId);
        if (count >= MAX_FEATURED_REVIEWS) {
            throw new IllegalStateException("Đã đạt giới hạn tối đa " + MAX_FEATURED_REVIEWS + " đánh giá được ghim cho khóa học này");
        }

        CourseFeaturedReview cfr = CourseFeaturedReview.builder()
                .course(course)
                .review(review)
                .sortOrder((int) count)
                .featuredBy(teacher)
                .build();

        cfr = featuredRepository.save(cfr);
        notifyFeaturedChanged(courseId);
        return CourseFeaturedReviewDto.from(cfr);
    }

    /**
     * Giảng viên bỏ ghim đánh giá khỏi trang giới thiệu.
     */
    @Transactional
    public void unfeatureReview(String teacherId, String courseId, String reviewId) {
        verifyCourseTeacher(teacherId, courseId);
        featuredRepository.deleteByCourseIdAndReviewId(courseId, reviewId);

        // Đánh số lại sort_order
        List<CourseFeaturedReview> remaining = featuredRepository.findByCourseIdOrderBySortOrderAsc(courseId);
        int order = 0;
        for (CourseFeaturedReview cfr : remaining) {
            cfr.setSortOrder(order++);
            featuredRepository.save(cfr);
        }
        notifyFeaturedChanged(courseId);
    }

    /**
     * Cập nhật thứ tự sắp xếp các đánh giá đã ghim (@dnd-kit).
     */
    @Transactional
    public List<CourseFeaturedReviewDto> reorder(String teacherId, String courseId, List<String> orderedReviewIds) {
        verifyCourseTeacher(teacherId, courseId);
        if (orderedReviewIds == null || orderedReviewIds.isEmpty()) {
            return listPublicFeatured(courseId);
        }

        List<CourseFeaturedReview> list = featuredRepository.findByCourseIdOrderBySortOrderAsc(courseId);
        Map<String, CourseFeaturedReview> map = new HashMap<>();
        for (CourseFeaturedReview cfr : list) {
            map.put(cfr.getReview().getId(), cfr);
        }

        int order = 0;
        for (String rId : orderedReviewIds) {
            CourseFeaturedReview cfr = map.get(rId);
            if (cfr != null) {
                cfr.setSortOrder(order++);
                featuredRepository.save(cfr);
            }
        }

        notifyFeaturedChanged(courseId);
        return listPublicFeatured(courseId);
    }

    /**
     * Tự gỡ khỏi danh sách giới thiệu nếu đánh giá bị xóa, bị ẩn, sửa xuống < 4 sao hoặc bỏ allowFeature.
     */
    @Transactional
    public void autoUnfeatureIfInvalid(String reviewId) {
        CourseReview review = reviewRepository.findById(reviewId).orElse(null);
        List<CourseFeaturedReview> list = featuredRepository.findByReviewId(reviewId);
        if (list.isEmpty()) return;

        if (review == null || !isEligible(review)) {
            for (CourseFeaturedReview cfr : list) {
                log.info("Tự động gỡ đánh giá {} khỏi bảng giới thiệu do không còn hợp lệ", reviewId);
                featuredRepository.delete(cfr);
            }
        }
    }

    /**
     * Kiểm tra đánh giá có đủ điều kiện để xuất hiện ở mục Giới thiệu không
     */
    public boolean isEligible(CourseReview r) {
        if (r == null) return false;
        if (!"PUBLISHED".equals(r.getStatus())) return false;
        if (!Boolean.TRUE.equals(r.getAllowFeature())) return false;
        if (r.getRating() == null || r.getRating() < MIN_RATING_FOR_FEATURE) return false;

        // Phải có ít nhất 1 ảnh không bị ẩn
        if (r.getImages() == null || r.getImages().isEmpty()) return false;
        return r.getImages().stream().anyMatch(img -> !Boolean.TRUE.equals(img.getIsHidden()));
    }

    private void validateEligibleForFeatureOrThrow(CourseReview r) {
        if (!"PUBLISHED".equals(r.getStatus())) {
            throw new IllegalArgumentException("Chỉ có thể ghim đánh giá đang hiển thị công khai (PUBLISHED)");
        }
        if (!Boolean.TRUE.equals(r.getAllowFeature())) {
            throw new IllegalArgumentException("Học viên chưa đồng ý cho phép sử dụng đánh giá này để giới thiệu khóa học");
        }
        if (r.getRating() == null || r.getRating() < MIN_RATING_FOR_FEATURE) {
            throw new IllegalArgumentException("Chỉ có thể ghim đánh giá từ " + MIN_RATING_FOR_FEATURE + " sao trở lên");
        }
        long validImages = r.getImages() != null
                ? r.getImages().stream().filter(img -> !Boolean.TRUE.equals(img.getIsHidden())).count()
                : 0;
        if (validImages < 1) {
            throw new IllegalArgumentException("Đánh giá phải có ít nhất 1 hình ảnh đính kèm hợp lệ để ghim");
        }
    }

    private void notifyFeaturedChanged(String courseId) {
        try {
            if (realtimePublisher != null && courseId != null) {
                realtimePublisher.publishToAll("course-review-public", Map.of("courseId", courseId, "action", "FEATURED_UPDATED"));
            }
        } catch (Exception e) {
            log.warn("[CourseFeaturedReviewService] Lỗi khi phát SSE featured: {}", e.getMessage());
        }
    }

    private User verifyCourseTeacher(String userId, String courseId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            return user;
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        if (course.getTeacher() == null || !course.getTeacher().getId().equals(userId)) {
            throw new SecurityException("Bạn không có quyền quản lý đánh giá của khóa học này");
        }

        return user;
    }
}
