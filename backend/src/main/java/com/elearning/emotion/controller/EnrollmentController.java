package com.elearning.emotion.controller;

import com.elearning.emotion.dto.EnrollmentDto;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.Enrollment;
import com.elearning.emotion.entity.Order;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.EnrollmentRepository;
import com.elearning.emotion.repository.OrderRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** BR-12: hoc vien bat buoc da dang ky (enroll) khoa hoc moi duoc mo bat ky noi dung nao ben trong */
@RestController
@RequiredArgsConstructor
public class EnrollmentController {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    @GetMapping("/api/enrollments/mine")
    public List<EnrollmentDto> mine(@AuthenticationPrincipal String userId) {
        // B6: Tự tạo bù enrollment nếu có đơn PAID nhưng thiếu enrollment (để tiến độ và đánh giá không lỗi)
        List<Order> paidOrders = orderRepository.findByUserIdAndStatus(userId, "PAID");
        for (Order o : paidOrders) {
            if (!enrollmentRepository.existsByUserIdAndCourseId(userId, o.getCourse().getId())) {
                Enrollment e = Enrollment.builder()
                        .user(o.getUser())
                        .course(o.getCourse())
                        .progressPercent(0f)
                        .build();
                enrollmentRepository.save(e);
            }
        }
        return enrollmentRepository.findByUserId(userId).stream().map(EnrollmentDto::from).toList();
    }

    @PostMapping("/api/courses/{courseId}/enroll")
    public EnrollmentDto enroll(@AuthenticationPrincipal String userId, @PathVariable String courseId) {
        // B5: Báo đã sở hữu nếu đã có enrollment hoặc có đơn PAID
        if (enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)
                || orderRepository.existsByUserIdAndCourseIdAndStatus(userId, courseId, "PAID")) {
            throw new IllegalArgumentException("Bạn đã sở hữu khóa học này rồi");
        }
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));
        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new IllegalArgumentException("Khóa học chưa được mở bán");
        }
        if ("EXAM".equalsIgnoreCase(course.getProfile()) || "BANK".equalsIgnoreCase(course.getProfile())) {
            throw new IllegalArgumentException("Khóa học nội bộ chứa đề thi, không hỗ trợ ghi danh trực tiếp");
        }
        if (course.getPrice() != null && course.getPrice().compareTo(java.math.BigDecimal.ZERO) > 0) {
            throw new IllegalArgumentException("Khóa học có phí, vui lòng tạo đơn hàng và thanh toán để ghi danh");
        }
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        Enrollment enrollment = Enrollment.builder().user(user).course(course).build();
        return EnrollmentDto.from(enrollmentRepository.save(enrollment));
    }

    /** Dung o cac controller khac (ContentItem/Attempt) de chan hoc vien chua enroll (BR-12) */
    public static boolean isEnrolled(EnrollmentRepository repo, String userId, String courseId) {
        return repo.existsByUserIdAndCourseId(userId, courseId);
    }
}
