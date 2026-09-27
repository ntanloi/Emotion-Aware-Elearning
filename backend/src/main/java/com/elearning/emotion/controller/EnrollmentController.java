package com.elearning.emotion.controller;

import com.elearning.emotion.dto.EnrollmentDto;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.Enrollment;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.EnrollmentRepository;
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

    @GetMapping("/api/enrollments/mine")
    public List<EnrollmentDto> mine(@AuthenticationPrincipal String userId) {
        return enrollmentRepository.findByUserId(userId).stream().map(EnrollmentDto::from).toList();
    }

    @PostMapping("/api/courses/{courseId}/enroll")
    public EnrollmentDto enroll(@AuthenticationPrincipal String userId, @PathVariable String courseId) {
        if (enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)) {
            throw new IllegalArgumentException("Ban da dang ky khoa hoc nay roi");
        }
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new IllegalArgumentException("Khoa hoc chua duoc mo ban");
        }
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nguoi dung"));

        Enrollment enrollment = Enrollment.builder().user(user).course(course).build();
        return EnrollmentDto.from(enrollmentRepository.save(enrollment));
    }

    /** Dung o cac controller khac (ContentItem/Attempt) de chan hoc vien chua enroll (BR-12) */
    public static boolean isEnrolled(EnrollmentRepository repo, String userId, String courseId) {
        return repo.existsByUserIdAndCourseId(userId, courseId);
    }
}
