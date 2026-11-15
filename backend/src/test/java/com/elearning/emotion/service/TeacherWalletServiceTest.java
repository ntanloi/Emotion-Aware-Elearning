package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.dto.TeacherEscrowDto;
import com.elearning.emotion.dto.TeacherWalletSummaryDto;
import com.elearning.emotion.entity.Order;
import com.elearning.emotion.entity.RewardEscrow;
import com.elearning.emotion.entity.TeacherWalletEntry;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeacherWalletServiceTest {

    @Mock
    private TeacherWalletEntryRepository walletEntryRepository;
    @Mock
    private PayoutRequestRepository payoutRequestRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditService auditService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private RealtimePublisher realtimePublisher;
    @Mock
    private RewardEscrowRepository rewardEscrowRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private VideoViewAttemptRepository attemptRepo;
    @Mock
    private StudentWalletService studentWalletService;

    private PaymentProperties paymentProperties;
    private TeacherWalletService teacherWalletService;
    private RewardSettlementService rewardSettlementService;

    @BeforeEach
    void setUp() {
        paymentProperties = new PaymentProperties();
        paymentProperties.setMinPayoutAmount(new BigDecimal("50000"));
        paymentProperties.setPlatformFeePercent(new BigDecimal("5"));

        teacherWalletService = new TeacherWalletService(
                walletEntryRepository,
                payoutRequestRepository,
                userRepository,
                paymentProperties,
                auditService,
                notificationService,
                realtimePublisher,
                rewardEscrowRepository,
                orderRepository
        );

        rewardSettlementService = new RewardSettlementService(
                rewardEscrowRepository,
                attemptRepo,
                studentWalletService,
                walletEntryRepository,
                orderRepository,
                userRepository,
                notificationService
        );
    }

    @Test
    @DisplayName("8.1: Hệ thức: thực nhận = có thể rút + chờ duyệt + đã rút")
    void summaryIdentityHolds() {
        String teacherId = "teacher-1";
        User teacher = User.builder()
                .id(teacherId)
                .bankId("VCB")
                .bankAccountNo("123456789")
                .bankAccountName("NGUYEN VAN A")
                .build();
        when(userRepository.findById(teacherId)).thenReturn(Optional.of(teacher));

        // 1 đơn bán khóa học 1.000.000 đ:
        // Doanh số 1.000.000 đ, platform fee 50.000 đ (5%), teacher nhận 850.000 đ (85%), escrow 100.000 đ (10%)
        // Sổ cái ghi SALE: +850.000 đ
        // 1 lệnh rút PENDING: 200.000 đ
        // 1 lệnh rút APPROVED: 300.000 đ (đã ghi PAYOUT: -300.000 đ trong sổ cái)
        // sumAvailableLedger = 850.000 - 300.000 = 550.000 đ
        // pendingPayout = 200.000 đ => availableBalance = 550.000 - 200.000 = 350.000 đ
        // totalPaidOut = 300.000 đ
        // totalEarned = 850.000 đ
        when(walletEntryRepository.sumAvailableLedgerByTeacherId(eq(teacherId), any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("550000"));
        when(payoutRequestRepository.sumPendingPayoutByTeacherId(teacherId))
                .thenReturn(new BigDecimal("200000"));
        when(payoutRequestRepository.sumApprovedPayoutByTeacherId(teacherId))
                .thenReturn(new BigDecimal("300000"));
        when(payoutRequestRepository.existsByTeacherIdAndStatus(teacherId, "PENDING"))
                .thenReturn(true);
        when(walletEntryRepository.sumEarnedByTeacherId(teacherId))
                .thenReturn(new BigDecimal("850000"));
        when(orderRepository.sumRevenueByTeacherId(teacherId))
                .thenReturn(new BigDecimal("1000000"));
        when(orderRepository.sumPlatformFeeByTeacherId(teacherId))
                .thenReturn(new BigDecimal("50000"));
        when(rewardEscrowRepository.sumHoldingByTeacher(teacherId))
                .thenReturn(new BigDecimal("100000"));
        when(rewardEscrowRepository.sumByTeacherAndStatus(teacherId, "CLAIMED"))
                .thenReturn(BigDecimal.ZERO);
        when(rewardEscrowRepository.sumByTeacherAndStatus(teacherId, "CLAIMED"))
                .thenReturn(BigDecimal.ZERO);
        when(rewardEscrowRepository.countHoldingByTeacher(teacherId))
                .thenReturn(1L);
        when(rewardEscrowRepository.minHoldingUntilByTeacher(teacherId))
                .thenReturn(LocalDateTime.now().plusDays(30));

        TeacherWalletSummaryDto summary = teacherWalletService.getWalletSummary(teacherId);

        BigDecimal right = summary.availableBalance()
                .add(summary.pendingPayoutAmount())
                .add(summary.totalPaidOut());

        assertEquals(0, summary.totalEarned().compareTo(right),
                "Hệ thức Thực nhận = Có thể rút + Chờ duyệt chi + Đã nhận về TK phải luôn đúng");
        assertEquals(new BigDecimal("350000"), summary.availableBalance());
        assertEquals(new BigDecimal("200000"), summary.pendingPayoutAmount());
        assertEquals(new BigDecimal("300000"), summary.totalPaidOut());
        assertEquals(new BigDecimal("850000"), summary.totalEarned());
        assertEquals(new BigDecimal("1000000"), summary.grossSales());
        assertEquals(new BigDecimal("50000"), summary.platformFeeTotal());
        assertEquals(new BigDecimal("100000"), summary.pendingRewardAmount());
        assertEquals(1L, summary.holdingCount());
        assertTrue(summary.hasPendingPayoutRequest());
    }

    @Test
    @DisplayName("8.2: Luồng giải ngân giữ hộ (release escrow) làm tăng totalEarned và availableBalance, pendingReward về 0")
    void testReleaseEscrowFlow() {
        String teacherId = "teacher-1";
        String orderId = "order-1";
        String escrowId = "escrow-1";

        User teacher = User.builder()
                .id(teacherId)
                .bankId("VCB")
                .bankAccountNo("123456789")
                .bankAccountName("NGUYEN VAN A")
                .build();
        when(userRepository.findById(teacherId)).thenReturn(Optional.of(teacher));

        RewardEscrow escrow = RewardEscrow.builder()
                .id(escrowId)
                .teacherId(teacherId)
                .orderId(orderId)
                .courseId("course-1")
                .amount(new BigDecimal("100000"))
                .status("HOLDING")
                .build();

        // Ban đầu: chỉ có SALE 850.000, 0 payout, 1 escrow HOLDING 100.000
        when(walletEntryRepository.sumAvailableLedgerByTeacherId(eq(teacherId), any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("850000"));
        when(payoutRequestRepository.sumPendingPayoutByTeacherId(teacherId))
                .thenReturn(BigDecimal.ZERO);
        when(payoutRequestRepository.sumApprovedPayoutByTeacherId(teacherId))
                .thenReturn(BigDecimal.ZERO);
        when(payoutRequestRepository.existsByTeacherIdAndStatus(teacherId, "PENDING"))
                .thenReturn(false);
        when(walletEntryRepository.sumEarnedByTeacherId(teacherId))
                .thenReturn(new BigDecimal("850000"));
        when(rewardEscrowRepository.sumHoldingByTeacher(teacherId))
                .thenReturn(new BigDecimal("100000"));
        when(rewardEscrowRepository.sumByTeacherAndStatus(teacherId, "CLAIMED"))
                .thenReturn(BigDecimal.ZERO);

        TeacherWalletSummaryDto beforeRelease = teacherWalletService.getWalletSummary(teacherId);
        assertEquals(new BigDecimal("850000"), beforeRelease.availableBalance());
        assertEquals(new BigDecimal("850000"), beforeRelease.totalEarned());
        assertEquals(new BigDecimal("100000"), beforeRelease.pendingRewardAmount());

        // Gọi RewardSettlementService.release(...)
        when(userRepository.getReferenceById(teacherId)).thenReturn(teacher);
        Order mockOrder = Order.builder().id(orderId).build();
        when(orderRepository.getReferenceById(orderId)).thenReturn(mockOrder);

        rewardSettlementService.release(escrow);

        // Kiểm tra settlementService đã tạo đúng dòng REWARD_RELEASE
        ArgumentCaptor<TeacherWalletEntry> entryCaptor = ArgumentCaptor.forClass(TeacherWalletEntry.class);
        verify(walletEntryRepository).save(entryCaptor.capture());
        TeacherWalletEntry releasedEntry = entryCaptor.getValue();
        assertEquals("REWARD_RELEASE", releasedEntry.getType());
        assertEquals(new BigDecimal("100000"), releasedEntry.getAmount());
        assertEquals("RELEASED", escrow.getStatus());
        assertNotNull(escrow.getSettledAt());
        verify(rewardEscrowRepository).save(escrow);

        // Sau khi release: ledger có thêm dòng REWARD_RELEASE 100.000 đ
        // totalEarned tăng lên 950.000 đ, availableLedger tăng lên 950.000 đ, pendingReward về 0
        when(walletEntryRepository.sumAvailableLedgerByTeacherId(eq(teacherId), any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("950000"));
        when(walletEntryRepository.sumEarnedByTeacherId(teacherId))
                .thenReturn(new BigDecimal("950000"));
        when(rewardEscrowRepository.sumHoldingByTeacher(teacherId))
                .thenReturn(BigDecimal.ZERO);

        TeacherWalletSummaryDto afterRelease = teacherWalletService.getWalletSummary(teacherId);
        assertEquals(new BigDecimal("950000"), afterRelease.availableBalance());
        assertEquals(new BigDecimal("950000"), afterRelease.totalEarned());
        assertEquals(BigDecimal.ZERO, afterRelease.pendingRewardAmount());

        // Kiểm tra hệ thức sau khi release vẫn tuyệt đối chính xác
        BigDecimal right = afterRelease.availableBalance()
                .add(afterRelease.pendingPayoutAmount())
                .add(afterRelease.totalPaidOut());
        assertEquals(0, afterRelease.totalEarned().compareTo(right));
    }

    @Test
    @DisplayName("8.3: getEscrows phân trang và ánh xạ đúng thông tin khóa học")
    void testGetEscrows() {
        String teacherId = "teacher-1";
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-1")
                .teacherId(teacherId)
                .orderId("order-1")
                .courseId("course-1")
                .amount(new BigDecimal("100000"))
                .status("HOLDING")
                .holdingUntil(LocalDateTime.now().plusMonths(6))
                .createdAt(LocalDateTime.now())
                .build();
        List<Object[]> rows = java.util.Collections.singletonList(new Object[]{escrow, "Khóa học React & Spring Boot"});
        Page<Object[]> page = new PageImpl<>(rows);
        when(rewardEscrowRepository.findTeacherEscrows(eq(teacherId), any(Pageable.class))).thenReturn(page);

        Page<TeacherEscrowDto> result = teacherWalletService.getEscrows(teacherId, PageRequest.of(0, 20));

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        TeacherEscrowDto dto = result.getContent().get(0);
        assertEquals("escrow-1", dto.id());
        assertEquals("course-1", dto.courseId());
        assertEquals("Khóa học React & Spring Boot", dto.courseTitle());
        assertEquals(new BigDecimal("100000"), dto.amount());
        assertEquals("HOLDING", dto.status());
    }
}
