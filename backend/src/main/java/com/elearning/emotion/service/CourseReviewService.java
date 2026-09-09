package com.elearning.emotion.service;

import com.elearning.emotion.dto.CourseReviewDto;
import com.elearning.emotion.dto.CourseReviewListDto;
import com.elearning.emotion.dto.CourseReviewRequest;
import com.elearning.emotion.dto.MyCourseReviewDto;
import com.elearning.emotion.entity.CourseReview;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.CourseReviewRepository;
import com.elearning.emotion.repository.EnrollmentRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * BR: hoc vien CHUA dang ky khoa hoc chi duoc xem review + so sao (xem list() - khong yeu cau dang nhap).
 *     Chi hoc vien DA dang ky (co Enrollment) moi duoc tao/sua/xoa danh gia cua chinh minh.
 *     Moi hoc vien chi danh gia 1 lan / khoa hoc (unique course_id+user_id) - danh gia lai = sua (PUT).
 */
@Service
@RequiredArgsConstructor
public class CourseReviewService {

    private final CourseReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    /** Cong khai - ai cung xem duoc, khong can dang nhap. */
    public CourseReviewListDto list(String courseId) {
        List<CourseReview> reviews = reviewRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        List<CourseReviewDto> dtos = reviews.stream().map(CourseReviewDto::from).toList();
        double avg = reviews.isEmpty() ? 0.0
                : reviews.stream().mapToInt(CourseReview::getRating).average().orElse(0.0);
        return new CourseReviewListDto(dtos, round1(avg), reviews.size());
    }

    /** Trang thai danh gia cua nguoi dang dang nhap (userId co the null neu chua dang nhap). */
    public MyCourseReviewDto mine(String userId, String courseId) {
        if (userId == null) return new MyCourseReviewDto(false, null);
        boolean enrolled = enrollmentRepository.existsByUserIdAndCourseId(userId, courseId);
        CourseReviewDto review = reviewRepository.findByCourseIdAndUserId(courseId, userId)
                .map(CourseReviewDto::from).orElse(null);
        return new MyCourseReviewDto(enrolled, review);
    }

    public CourseReviewDto create(String userId, String courseId, CourseReviewRequest req) {
        if (!enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)) {
            throw new SecurityException("Ban can dang ky khoa hoc nay truoc khi danh gia");
        }
        if (reviewRepository.existsByCourseIdAndUserId(courseId, userId)) {
            throw new IllegalStateException("Ban da danh gia khoa hoc nay roi, vui long chinh sua danh gia cu");
        }
        var course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nguoi dung"));

        CourseReview review = CourseReview.builder()
                .course(course)
                .user(user)
                .rating(req.rating())
                .comment(normalize(req.comment()))
                .build();
        return CourseReviewDto.from(reviewRepository.save(review));
    }

    public CourseReviewDto update(String userId, String courseId, CourseReviewRequest req) {
        CourseReview review = getOwnedOrThrow(userId, courseId);
        review.setRating(req.rating());
        review.setComment(normalize(req.comment()));
        return CourseReviewDto.from(reviewRepository.save(review));
    }

    public void delete(String userId, String courseId) {
        reviewRepository.delete(getOwnedOrThrow(userId, courseId));
    }

    /** Dung o CourseController de hien ⭐ trung binh + so luong review tren danh sach/chi tiet khoa hoc. */
    public Map<String, double[]> summariesFor(List<String> courseIds) {
        Map<String, double[]> result = new HashMap<>();
        if (courseIds.isEmpty()) return result;
        for (var row : reviewRepository.aggregateForCourses(courseIds)) {
            result.put(row.getCourseId(), new double[]{round1(row.getAvgRating()), row.getTotal()});
        }
        return result;
    }

    private CourseReview getOwnedOrThrow(String userId, String courseId) {
        return reviewRepository.findByCourseIdAndUserId(courseId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Ban chua danh gia khoa hoc nay"));
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
