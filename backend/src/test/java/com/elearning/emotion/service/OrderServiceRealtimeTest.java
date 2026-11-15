package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class OrderServiceRealtimeTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;
    @Mock
    private TeacherWalletEntryRepository teacherWalletEntryRepository;
    @Mock
    private PayoutRequestRepository payoutRequestRepository;
    @Mock
    private PaymentProperties paymentProperties;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AuditService auditService;
    @Mock
    private RealtimePublisher realtimePublisher;
    @Mock
    private WalletTopupService walletTopupService;
    @Mock
    private ContentItemRepository contentItemRepository;
    @Mock
    private com.elearning.emotion.config.RewardProperties rewardProperties;
    @Mock
    private com.elearning.emotion.config.WalletProperties walletProperties;
    @Mock
    private EnrollmentLifecycleService enrollmentLifecycleService;
    @Mock
    private RewardEscrowService rewardEscrowService;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(
                orderRepository,
                courseRepository,
                userRepository,
                enrollmentRepository,
                paymentTransactionRepository,
                teacherWalletEntryRepository,
                payoutRequestRepository,
                paymentProperties,
                notificationService,
                auditService,
                realtimePublisher,
                walletTopupService,
                contentItemRepository,
                rewardProperties,
                walletProperties,
                enrollmentLifecycleService,
                rewardEscrowService
        );
    }

    @Test
    @DisplayName("expireOverdueOrders: Quét đơn hết hạn và phát sự kiện payment EXPIRED tới học viên")
    void testExpireOverdueOrdersPublishesRealtime() {
        when(paymentProperties.getOrderExpireHours()).thenReturn(24);

        User student = User.builder().id("student-1").email("student@test.com").build();
        Order order = Order.builder()
                .id("order-1")
                .orderCode("ELN12345678")
                .user(student)
                .status("PENDING")
                .build();

        when(orderRepository.findPendingOrdersOlderThan(any())).thenReturn(List.of(order));

        int expiredCount = orderService.expireOverdueOrders();

        assertEquals(1, expiredCount);
        assertEquals("EXPIRED", order.getStatus());

        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(realtimePublisher).publishToUser(eq("student-1"), eq("payment"), captor.capture());

        Map<String, Object> payload = captor.getValue();
        assertEquals("order-1", payload.get("orderId"));
        assertEquals("EXPIRED", payload.get("status"));
    }

    @Test
    @DisplayName("manualMatchTransaction: Khớp đơn thủ công phát sự kiện payment PAID tới học viên")
    void testManualMatchPublishesRealtime() {
        User admin = User.builder().id("admin-1").role("ADMIN").build();
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        User student = User.builder().id("student-2").fullName("Học viên B").build();
        User teacher = User.builder().id("teacher-1").fullName("Giáo viên A").build();
        Course course = Course.builder().id("course-1").title("Khóa học Java").teacher(teacher).build();

        Order order = Order.builder()
                .id("order-2")
                .orderCode("ELN87654321")
                .user(student)
                .course(course)
                .amount(BigDecimal.valueOf(500000))
                .status("PENDING")
                .build();

        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx-1")
                .sepayId(9999L)
                .transferAmount(BigDecimal.valueOf(500000))
                .status("UNMATCHED")
                .build();

        when(paymentTransactionRepository.findById("tx-1")).thenReturn(Optional.of(tx));
        when(orderRepository.findByOrderCodeWithLock("ELN87654321")).thenReturn(Optional.of(order));
        when(paymentProperties.getPlatformFeePercent()).thenReturn(BigDecimal.valueOf(5));
        when(paymentProperties.getBankId()).thenReturn("MB");
        when(paymentProperties.getAccountNo()).thenReturn("0000000000");
        when(paymentProperties.getAccountName()).thenReturn("E-Learning AI");
        when(paymentProperties.getTemplate()).thenReturn("compact2");

        orderService.manualMatchTransaction("admin-1", "tx-1", "ELN87654321", "Khớp tiền chuyển khoản");

        assertEquals("PAID", order.getStatus());

        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(realtimePublisher).publishToUser(eq("student-2"), eq("payment"), captor.capture());

        Map<String, Object> payload = captor.getValue();
        assertEquals("order-2", payload.get("orderId"));
        assertEquals("PAID", payload.get("status"));
    }
}
