package com.elearning.emotion.service;

import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.Enrollment;
import com.elearning.emotion.entity.Order;
import com.elearning.emotion.repository.EnrollmentRepository;
import com.elearning.emotion.repository.RewardEscrowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnrollmentLifecycleService {

    private final EnrollmentRepository enrollmentRepository;
    private final RewardEscrowRepository escrowRepo;
    private final RewardProperties props;

    /** Gọi khi đơn PAID (kể cả mua lại sau khi hết hạn): mở chu kỳ mới, chưa bắt đầu. */
    @Transactional
    public Enrollment openCycle(Order order) {
        String userId = order.getUser().getId();
        String courseId = order.getCourse().getId();
        Enrollment e = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseGet(() -> Enrollment.builder()
                        .user(order.getUser())
                        .course(order.getCourse())
                        .progressPercent(0f)
                        .build());

        e.setAccessMonths(order.getAccessMonths());
        e.setStartedAt(null);
        e.setExpiresAt(LocalDateTime.now().plusDays(props.getStartDeadlineDays()));
        Enrollment saved = enrollmentRepository.save(e);
        log.info("Opened learning cycle for student {} in course {}, expiresAt={}",
                userId, courseId, saved.getExpiresAt());
        return saved;
    }

    /** Gọi ở mọi hành động học của học viên. Chỉ có tác dụng ở lần đầu của mỗi chu kỳ. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markStartedIfNeeded(String userId, Course course) {
        if (userId == null || course == null) return;
        Enrollment e = enrollmentRepository.findByUserIdAndCourseId(userId, course.getId()).orElse(null);
        if (e == null || e.getStartedAt() != null || e.getAccessMonths() == null) {
            return; // đã bắt đầu, hoặc enrollment cũ không giới hạn
        }

        LocalDateTime now = LocalDateTime.now();
        e.setStartedAt(now);
        e.setExpiresAt(now.plusMonths(e.getAccessMonths()));
        enrollmentRepository.save(e);

        // mốc chuyển 10% sang giảng viên đi theo hạn mới
        escrowRepo.syncHoldingUntil(userId, course.getId(), e.getExpiresAt());
        log.info("Student {} started course {}: startedAt={}, expiresAt={}",
                userId, course.getId(), now, e.getExpiresAt());
    }
}
