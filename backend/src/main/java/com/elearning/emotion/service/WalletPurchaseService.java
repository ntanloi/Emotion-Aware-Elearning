package com.elearning.emotion.service;

import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.dto.OrderDto;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.Order;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.EnrollmentRepository;
import com.elearning.emotion.repository.OrderRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletPurchaseService {

    private final StudentWalletService walletService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ContentItemRepository contentItemRepository;
    private final UserRepository userRepository;
    private final RewardProperties rewardProps;

    @Transactional
    public OrderDto purchase(String userId, String courseId, boolean acceptRewardTerms) {
        // 1. Khóa ví trước để các lần mua của cùng một học viên chạy lần lượt (chặn bấm mua nhiều lần)
        walletService.lockOrCreate(userId);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        if (course.getTeacher() != null && userId.equals(course.getTeacher().getId())) {
            throw new IllegalArgumentException("Giảng viên không thể mua khóa học của chính mình");
        }

        // Chỉ chặn khi quyền học còn hạn (expires_at rỗng hoặc chưa tới), để học viên hết hạn có thể mua lại
        boolean hasActiveEnrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .map(e -> e.getExpiresAt() == null || e.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
        if (hasActiveEnrollment) {
            throw new IllegalArgumentException("Bạn đang sở hữu khóa học này rồi");
        }

        BigDecimal price = course.getPrice() == null ? BigDecimal.ZERO
                : course.getPrice().setScale(0, RoundingMode.HALF_UP);
        if (price.signum() <= 0) {
            throw new IllegalArgumentException("Khóa học miễn phí, hãy nhấn Đăng ký trực tiếp");
        }

        boolean holdsReward = rewardProps.isEnabled()
                && !contentItemRepository.findTrackableVideoIds(courseId).isEmpty();
        if (holdsReward && !acceptRewardTerms) {
            throw new IllegalArgumentException("Bạn cần xác nhận điều khoản chương trình thưởng trước khi mua");
        }

        // 2. Tạo đơn (mã WLT để webhook ELN không bao giờ khớp nhầm)
        Order order = orderRepository.save(Order.builder()
                .orderCode("WLT" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase())
                .user(userRepository.getReferenceById(userId))
                .course(course)
                .amount(price)
                .status("PENDING")
                .paymentMethod("WALLET")
                .platformFee(BigDecimal.ZERO)
                .teacherAmount(BigDecimal.ZERO)
                .rewardTermsAcceptedAt(holdsReward ? LocalDateTime.now() : null)
                .accessMonths(course.getAccessMonths())
                .build());

        // 3. Trừ ví (thiếu tiền thì ném InsufficientBalanceException: rollback cả đơn vừa tạo)
        walletService.debitForPurchase(userId, price, order.getId(), "Mua khóa học: " + course.getTitle());

        // 4. Hoàn tất: ghi danh, tách 5/10/85, tạo escrow, ghi ví giảng viên, thông báo
        orderService.fulfillOrder(order, price, "WALLET");

        log.info("Student {} successfully purchased course {} via WALLET (orderCode: {})",
                userId, courseId, order.getOrderCode());
        return orderService.toDto(order);
    }
}
