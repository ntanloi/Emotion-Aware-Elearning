package com.elearning.emotion.service;

import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.Role;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.EnrollmentRepository;
import com.elearning.emotion.repository.OrderRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CourseAccessService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final OrderRepository orderRepository;
    private final EnrollmentLifecycleService enrollmentLifecycleService;

    /**
     * Kiểm tra xem user hiện tại (có thể null nếu là khách vãng lai) có quyền xem nội dung khoá học hay không.
     * PUBLISHED: công khai cho mọi người xem.
     * DRAFT / PENDING_REVIEW / REJECTED / HIDDEN: chỉ giảng viên sở hữu hoặc ADMIN được xem.
     */
    public void validateCanView(String userId, Course course) {
        if ("PUBLISHED".equals(course.getStatus())) {
            return;
        }

        if (userId == null) {
            throw new SecurityException("Khoá học này chưa được xuất bản công khai");
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            throw new SecurityException("Không tìm thấy thông tin tài khoản");
        }

        if (Role.ADMIN.name().equals(user.getRole())) {
            return; // Quản trị viên được xem để kiểm duyệt
        }

        if (course.getTeacher() != null && course.getTeacher().getId().equals(userId)) {
            return; // Chính giảng viên phụ trách khoá học được xem
        }

        throw new SecurityException("Khoá học này chưa được xuất bản hoặc bạn không có quyền truy cập");
    }

    /**
     * B1/B2: Kiểm tra xem user có quyền HỌC nội dung chi tiết (videoUrl, bài tập, đề thi, flashcard...) hay không.
     * Quyền học = Giảng viên chủ khóa HOẶC Admin HOẶC có đơn PAID HOẶC có enrollment (cho khóa miễn phí).
     */
    public void validateCanLearn(String userId, Course course) {
        validateCanView(userId, course);
        if (userId == null) {
            throw new SecurityException("Cần đăng nhập để học nội dung này");
        }
        boolean owner = course.getTeacher() != null && course.getTeacher().getId().equals(userId);
        if (owner || isAdmin(userId)) {
            return;
        }

        boolean expired = enrollmentRepository.findByUserIdAndCourseId(userId, course.getId())
                .map(com.elearning.emotion.entity.Enrollment::getExpiresAt)
                .map(t -> t.isBefore(java.time.LocalDateTime.now()))
                .orElse(false);
        if (expired) {
            throw new IllegalArgumentException("Khóa học đã hết hạn, vui lòng mua lại để học tiếp");
        }

        boolean hasPaidOrder = orderRepository.existsByUserIdAndCourseIdAndStatus(userId, course.getId(), "PAID");
        boolean hasEnrollment = enrollmentRepository.existsByUserIdAndCourseId(userId, course.getId());
        if (!hasPaidOrder && !hasEnrollment) {
            throw new SecurityException("Bạn cần ghi danh khóa học này để học nội dung");
        }

        enrollmentLifecycleService.markStartedIfNeeded(userId, course);
    }

    /**
     * Trả về true nếu user có quyền học chi tiết (giảng viên sở hữu, admin, có đơn PAID hoặc đã ghi danh).
     */
    public boolean canLearn(String userId, Course course) {
        if (userId == null || course == null) return false;
        try {
            validateCanLearn(userId, course);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public boolean isAdmin(String userId) {
        if (userId == null) return false;
        return userRepository.findById(userId)
                .map(u -> Role.ADMIN.name().equals(u.getRole()))
                .orElse(false);
    }

    public boolean canManageOrModerate(String userId, Course course) {
        if (userId == null || course == null) return false;
        boolean isOwner = course.getTeacher() != null && course.getTeacher().getId().equals(userId);
        return isOwner || isAdmin(userId);
    }
}
