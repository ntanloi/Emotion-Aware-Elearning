package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.config.WalletProperties;
import com.elearning.emotion.dto.OrderDto;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class Phase5WalletPurchaseTest {

    private StudentWalletService walletService;
    private OrderService orderService;
    private OrderRepository orderRepository;
    private CourseRepository courseRepository;
    private EnrollmentRepository enrollmentRepository;
    private ContentItemRepository contentItemRepository;
    private UserRepository userRepository;
    private RewardProperties rewardProps;
    private WalletProperties walletProps;
    private PaymentProperties paymentProperties;
    private TeacherWalletEntryRepository teacherWalletEntryRepository;
    private PayoutRequestRepository payoutRequestRepository;
    private NotificationService notificationService;
    private AuditService auditService;
    private RealtimePublisher realtimePublisher;
    private WalletTopupService walletTopupService;
    private EnrollmentLifecycleService enrollmentLifecycleService;
    private RewardEscrowService rewardEscrowService;
    private RewardEscrowRepository rewardEscrowRepository;
    private RewardEscrowVideoRepository rewardEscrowVideoRepository;
    private CourseAccessService courseAccessService;

    private WalletPurchaseService walletPurchaseService;

    @BeforeEach
    void setUp() {
        walletService = mock(StudentWalletService.class);
        orderRepository = mock(OrderRepository.class);
        courseRepository = mock(CourseRepository.class);
        enrollmentRepository = mock(EnrollmentRepository.class);
        contentItemRepository = mock(ContentItemRepository.class);
        userRepository = mock(UserRepository.class);

        rewardProps = new RewardProperties();
        rewardProps.setEnabled(true);
        rewardProps.setEscrowPercent(BigDecimal.TEN); // 10%
        rewardProps.setRequiredVideoPercent(BigDecimal.valueOf(70));
        rewardProps.setMinAccessMonths(6);
        rewardProps.setStartDeadlineDays(365);

        walletProps = new WalletProperties();
        walletProps.setLegacyQrEnabled(true);

        paymentProperties = new PaymentProperties();
        paymentProperties.setPlatformFeePercent(BigDecimal.valueOf(5)); // 5%
        paymentProperties.setAccountNo("0123456789");

        teacherWalletEntryRepository = mock(TeacherWalletEntryRepository.class);
        payoutRequestRepository = mock(PayoutRequestRepository.class);
        notificationService = mock(NotificationService.class);
        auditService = mock(AuditService.class);
        realtimePublisher = mock(RealtimePublisher.class);
        walletTopupService = mock(WalletTopupService.class);

        rewardEscrowRepository = mock(RewardEscrowRepository.class);
        rewardEscrowVideoRepository = mock(RewardEscrowVideoRepository.class);
        when(rewardEscrowRepository.save(any(RewardEscrow.class))).thenAnswer(inv -> inv.getArgument(0));
        rewardEscrowService = new RewardEscrowService(rewardEscrowRepository, rewardEscrowVideoRepository, rewardProps);

        enrollmentLifecycleService = new EnrollmentLifecycleService(enrollmentRepository, rewardEscrowRepository, rewardProps);

        orderService = new OrderService(
                orderRepository,
                courseRepository,
                userRepository,
                enrollmentRepository,
                mock(PaymentTransactionRepository.class),
                teacherWalletEntryRepository,
                payoutRequestRepository,
                paymentProperties,
                notificationService,
                auditService,
                realtimePublisher,
                walletTopupService,
                contentItemRepository,
                rewardProps,
                walletProps,
                enrollmentLifecycleService,
                rewardEscrowService,
                mock(SepayPayoutVerificationService.class)
        );

        walletPurchaseService = new WalletPurchaseService(
                walletService,
                orderService,
                orderRepository,
                courseRepository,
                enrollmentRepository,
                contentItemRepository,
                userRepository,
                rewardProps
        );

        courseAccessService = new CourseAccessService(
                userRepository,
                enrollmentRepository,
                orderRepository,
                enrollmentLifecycleService
        );
    }

    @Test
    @DisplayName("5.1: Course 500,000 VND splits 5% platform fee (25k), 10% escrow (50k), 85% teacher (425k)")
    void testFeeEscrowSplitStandard() {
        User teacher = User.builder().id("teacher-1").fullName("Teacher One").build();
        User student = User.builder().id("student-1").fullName("Student One").build();
        Course course = Course.builder()
                .id("c1")
                .title("Khóa học 500k")
                .price(BigDecimal.valueOf(500000))
                .teacher(teacher)
                .accessMonths(6)
                .build();

        when(courseRepository.findById("c1")).thenReturn(Optional.of(course));
        when(userRepository.getReferenceById("student-1")).thenReturn(student);
        when(userRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(contentItemRepository.findTrackableVideoIds("c1")).thenReturn(List.of("vid-1", "vid-2"));
        when(enrollmentRepository.findByUserIdAndCourseId("student-1", "c1")).thenReturn(Optional.empty());

        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(rewardEscrowRepository.save(any(RewardEscrow.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDto dto = walletPurchaseService.purchase("student-1", "c1", true);

        // Verify debit wallet
        verify(walletService).debitForPurchase(eq("student-1"), eq(BigDecimal.valueOf(500000)), any(), any());

        // Verify order fees
        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, atLeastOnce()).save(orderCaptor.capture());
        Order savedOrder = orderCaptor.getValue();

        assertEquals(new BigDecimal("25000"), savedOrder.getPlatformFee());
        assertEquals(new BigDecimal("50000"), savedOrder.getRewardEscrowAmount());
        assertEquals(new BigDecimal("425000"), savedOrder.getTeacherAmount());

        // Verify Escrow created
        verify(rewardEscrowRepository).save(argThat(escrow ->
                escrow.getAmount().compareTo(new BigDecimal("50000")) == 0 &&
                "HOLDING".equals(escrow.getStatus())
        ));
        verify(rewardEscrowVideoRepository).save(argThat(v -> "vid-1".equals(v.getContentItemId())));
        verify(rewardEscrowVideoRepository).save(argThat(v -> "vid-2".equals(v.getContentItemId())));

        // Verify teacher wallet SALE entry
        verify(teacherWalletEntryRepository).save(argThat(e ->
                e.getAmount().compareTo(new BigDecimal("425000")) == 0 &&
                "SALE".equals(e.getType())
        ));
    }

    @Test
    @DisplayName("5.2: Course 333,333 VND rounding: 16,667 fee + 33,333 escrow + 283,333 teacher = 333,333")
    void testFeeEscrowSplitOddNumber() {
        User teacher = User.builder().id("teacher-1").build();
        User student = User.builder().id("student-1").build();
        Course course = Course.builder()
                .id("c2")
                .title("Khóa học 333k")
                .price(BigDecimal.valueOf(333333))
                .teacher(teacher)
                .accessMonths(6)
                .build();

        when(courseRepository.findById("c2")).thenReturn(Optional.of(course));
        when(userRepository.getReferenceById("student-1")).thenReturn(student);
        when(userRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(contentItemRepository.findTrackableVideoIds("c2")).thenReturn(List.of("vid-1"));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        walletPurchaseService.purchase("student-1", "c2", true);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, atLeastOnce()).save(orderCaptor.capture());
        Order savedOrder = orderCaptor.getValue();

        assertEquals(new BigDecimal("16667"), savedOrder.getPlatformFee());
        assertEquals(new BigDecimal("33333"), savedOrder.getRewardEscrowAmount());
        assertEquals(new BigDecimal("283333"), savedOrder.getTeacherAmount());

        BigDecimal sum = savedOrder.getPlatformFee()
                .add(savedOrder.getRewardEscrowAmount())
                .add(savedOrder.getTeacherAmount());
        assertEquals(new BigDecimal("333333"), sum);
    }

    @Test
    @DisplayName("5.3: Reward disabled (reward.enabled=false) -> 5% fee, 0 escrow, 95% teacher")
    void testRewardDisabled() {
        rewardProps.setEnabled(false);

        User teacher = User.builder().id("teacher-1").build();
        User student = User.builder().id("student-1").build();
        Course course = Course.builder()
                .id("c3")
                .price(BigDecimal.valueOf(1000000))
                .teacher(teacher)
                .accessMonths(6)
                .build();

        when(courseRepository.findById("c3")).thenReturn(Optional.of(course));
        when(userRepository.getReferenceById("student-1")).thenReturn(student);
        when(userRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        walletPurchaseService.purchase("student-1", "c3", false);

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, atLeastOnce()).save(orderCaptor.capture());
        Order savedOrder = orderCaptor.getValue();

        assertEquals(new BigDecimal("50000"), savedOrder.getPlatformFee());
        assertEquals(BigDecimal.ZERO, savedOrder.getRewardEscrowAmount());
        assertEquals(new BigDecimal("950000"), savedOrder.getTeacherAmount());

        verify(rewardEscrowRepository, never()).save(any());
    }

    @Test
    @DisplayName("5.4: Teacher cannot purchase their own course")
    void testTeacherCannotPurchaseOwnCourse() {
        User teacher = User.builder().id("teacher-1").build();
        Course course = Course.builder().id("c4").teacher(teacher).price(BigDecimal.valueOf(100000)).build();
        when(courseRepository.findById("c4")).thenReturn(Optional.of(course));

        assertThrows(IllegalArgumentException.class, () ->
                walletPurchaseService.purchase("teacher-1", "c4", true)
        );
    }

    @Test
    @DisplayName("5.5: D1 Learning cycle: purchase opens cycle with startedAt=null, first learning action sets startedAt and syncs escrow")
    void testLearningCycleD1() {
        User student = User.builder().id("student-1").build();
        Course course = Course.builder().id("c5").accessMonths(6).status("PUBLISHED").build();
        Order order = Order.builder()
                .id("order-1")
                .user(student)
                .course(course)
                .accessMonths(6)
                .status("PAID")
                .build();

        when(enrollmentRepository.findByUserIdAndCourseId("student-1", "c5")).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. Mở chu kỳ học khi đơn PAID: startedAt null, expiresAt = now + 365 days
        Enrollment e = enrollmentLifecycleService.openCycle(order);
        assertNull(e.getStartedAt());
        assertNotNull(e.getExpiresAt());
        assertTrue(e.getExpiresAt().isAfter(LocalDateTime.now().plusDays(360)));

        // 2. Lần đầu học viên vào học: markStartedIfNeeded kích hoạt startedAt và cập nhật expiresAt = now + 6 months
        when(enrollmentRepository.findByUserIdAndCourseId("student-1", "c5")).thenReturn(Optional.of(e));
        enrollmentLifecycleService.markStartedIfNeeded("student-1", course);

        assertNotNull(e.getStartedAt());
        assertTrue(e.getExpiresAt().isBefore(LocalDateTime.now().plusMonths(7)));
        verify(rewardEscrowRepository).syncHoldingUntil(eq("student-1"), eq("c5"), eq(e.getExpiresAt()));

        // 3. Lần thứ hai vào học: startedAt không bị ghi đè
        LocalDateTime initialStartedAt = e.getStartedAt();
        enrollmentLifecycleService.markStartedIfNeeded("student-1", course);
        assertEquals(initialStartedAt, e.getStartedAt());
    }

    @Test
    @DisplayName("5.6: CourseAccessService blocks learning when enrollment is expired")
    void testCourseAccessServiceBlockedWhenExpired() {
        User student = User.builder().id("student-1").role("STUDENT").build();
        Course course = Course.builder().id("c6").status("PUBLISHED").build();

        Enrollment expiredEnrollment = Enrollment.builder()
                .user(student)
                .course(course)
                .expiresAt(LocalDateTime.now().minusDays(1)) // đã hết hạn
                .build();

        when(userRepository.findById("student-1")).thenReturn(Optional.of(student));
        when(enrollmentRepository.findByUserIdAndCourseId("student-1", "c6")).thenReturn(Optional.of(expiredEnrollment));

        // validateCanLearn phải ném lỗi hết hạn
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                courseAccessService.validateCanLearn("student-1", course)
        );
        assertTrue(ex.getMessage().contains("hết hạn"));
        assertFalse(courseAccessService.canLearn("student-1", course));
    }

    @Test
    @DisplayName("5.7: D7 Webhook handles legacy ELN code by crediting student wallet without auto-fulfilling order")
    void testD7WebhookCreditToWallet() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx-eln-1")
                .transferAmount(BigDecimal.valueOf(450000))
                .accountNumber("0123456789")
                .transferType("in")
                .content("ELN7K2M9QXP")
                .build();

        User student = User.builder().id("student-an").build();
        Order order = Order.builder()
                .id("order-eln-1")
                .orderCode("ELN7K2M9QXP")
                .user(student)
                .status("CANCELLED") // đơn cũ đã hủy khi phát hành
                .build();

        when(orderRepository.findByOrderCode("ELN7K2M9QXP")).thenReturn(Optional.of(order));
        when(walletTopupService.creditToOrderOwner(any(), any(), any(), any())).thenReturn(
                Map.of("success", true, "status", "MATCHED", "type", "TOPUP")
        );

        Map<String, Object> result = orderService.processSepayWebhook(
                new com.elearning.emotion.dto.SepayWebhookPayload(
                        12345L, "MB", "2026-12-01 10:15:00", "0123456789", null,
                        "ELN7K2M9QXP", "in", BigDecimal.valueOf(450000), BigDecimal.ZERO,
                        null, "ELN7K2M9QXP", "ELN7K2M9QXP"
                ),
                "{}"
        );

        verify(walletTopupService).creditToOrderOwner(any(), eq(order), eq(new BigDecimal("450000")), any());
        assertEquals("MATCHED", result.get("status"));
    }

    @Test
    @DisplayName("5.8: Legacy QR creation is blocked when legacy-qr-enabled=false")
    void testLegacyQrBlocked() {
        walletProps.setLegacyQrEnabled(false);

        assertThrows(IllegalArgumentException.class, () ->
                orderService.createOrder("student-1", "c1")
        );
    }
}
