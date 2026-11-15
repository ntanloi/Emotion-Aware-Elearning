package com.elearning.emotion.service;

import com.elearning.emotion.dto.RewardProgressDto;
import com.elearning.emotion.dto.VideoRewardStatusDto;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.event.VideoAttemptValidatedEvent;
import com.elearning.emotion.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Phase6RewardSettlementTest {

    @Mock
    private RewardEscrowRepository escrowRepo;
    @Mock
    private RewardEscrowVideoRepository escrowVideoRepo;
    @Mock
    private VideoViewAttemptRepository attemptRepo;
    @Mock
    private StudentWalletService walletService;
    @Mock
    private TeacherWalletEntryRepository teacherWalletRepo;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CourseRepository courseRepo;
    @Mock
    private ContentItemRepository contentItemRepo;
    @Mock
    private NotificationService notificationService;
    @Mock
    private VideoViewAttemptService attemptService;
    @Mock
    private EntityManager entityManager;

    private RewardSettlementService settlementService;
    private RewardEventListener rewardEventListener;
    private RewardProgressService rewardProgressService;
    private WalletReconciliationService reconciliationService;

    @BeforeEach
    void setUp() {
        settlementService = new RewardSettlementService(
                escrowRepo,
                attemptRepo,
                walletService,
                teacherWalletRepo,
                orderRepository,
                userRepository,
                notificationService
        );

        rewardEventListener = new RewardEventListener(escrowRepo, settlementService);

        rewardProgressService = new RewardProgressService(
                escrowRepo,
                escrowVideoRepo,
                contentItemRepo,
                courseRepo,
                attemptRepo,
                attemptService
        );

        reconciliationService = new WalletReconciliationService(
                entityManager,
                userRepository,
                notificationService
        );
    }

    @Test
    @DisplayName("6.1: 10 videos, required 70% (7): 6 valid does not claim, 7th valid triggers claim (+10% BONUS)")
    void testClaimRewardWhen7Of10Valid() {
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-1")
                .userId("student-1")
                .teacherId("teacher-1")
                .courseId("course-1")
                .orderId("order-1")
                .amount(new BigDecimal("50000"))
                .requiredPercent(new BigDecimal("70.00"))
                .status("HOLDING")
                .createdAt(LocalDateTime.now().minusDays(5))
                .holdingUntil(LocalDateTime.now().plusMonths(6))
                .build();

        when(escrowRepo.lockById("escrow-1")).thenReturn(Optional.of(escrow));
        when(escrowRepo.countExistingVideos("escrow-1")).thenReturn(10);

        // Case A: 6 valid videos -> chưa đủ điều kiện (6/10 = 60% < 70%)
        when(attemptRepo.countValidVideos(eq("escrow-1"), eq("student-1"), any(LocalDateTime.class))).thenReturn(6);
        settlementService.evaluate("escrow-1");

        verify(walletService, never()).credit(any(), any(), any(), any(), any(), any(), any(), any());
        assertEquals("HOLDING", escrow.getStatus());

        // Case B: Video thứ 7 đạt VALID -> đủ 70% -> kích hoạt claim thưởng
        when(attemptRepo.countValidVideos(eq("escrow-1"), eq("student-1"), any(LocalDateTime.class))).thenReturn(7);
        settlementService.evaluate("escrow-1");

        verify(walletService).credit(
                eq("student-1"),
                eq("REWARD"),
                eq("BONUS"),
                eq(new BigDecimal("50000")),
                isNull(),
                eq("order-1"),
                eq("escrow-1"),
                contains("Thưởng hoàn thành khóa học")
        );
        assertEquals("CLAIMED", escrow.getStatus());
        assertNotNull(escrow.getSettledAt());
        verify(notificationService).send(eq("student-1"), contains("nhận thưởng"), anyString(), eq("WALLET"), eq("escrow-1"), eq("/wallet"));
    }

    @Test
    @DisplayName("6.2: Duplicate or concurrent events: already CLAIMED escrow returns immediately without double crediting")
    void testDuplicateOrConcurrentEventsIdempotency() {
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-1")
                .status("CLAIMED") // Đã quyết toán trước đó
                .build();

        when(escrowRepo.lockById("escrow-1")).thenReturn(Optional.of(escrow));

        settlementService.evaluate("escrow-1");

        verify(walletService, never()).credit(any(), any(), any(), any(), any(), any(), any(), any());
        verify(attemptRepo, never()).countValidVideos(any(), any(), any());
    }

    @Test
    @DisplayName("6.3: Valid attempt before purchase (createdAt of escrow) is excluded by query filter")
    void testValidBeforePurchaseExcluded() {
        LocalDateTime purchaseTime = LocalDateTime.now().minusDays(10);
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-1")
                .userId("student-1")
                .createdAt(purchaseTime)
                .requiredPercent(new BigDecimal("70.00"))
                .status("HOLDING")
                .build();

        when(escrowRepo.lockById("escrow-1")).thenReturn(Optional.of(escrow));
        when(escrowRepo.countExistingVideos("escrow-1")).thenReturn(10);
        when(attemptRepo.countValidVideos("escrow-1", "student-1", purchaseTime)).thenReturn(5);

        settlementService.evaluate("escrow-1");

        // Verify countValidVideos was invoked with exactly purchaseTime (e.getCreatedAt())
        verify(attemptRepo).countValidVideos("escrow-1", "student-1", purchaseTime);
        verify(walletService, never()).credit(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("6.4: Settle expired: only 5 of 10 valid at expiry -> RELEASED to teacher wallet")
    void testSettleIfExpired5Of10ToTeacher() {
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-expired-1")
                .userId("student-1")
                .teacherId("teacher-1")
                .orderId("order-1")
                .amount(new BigDecimal("60000"))
                .requiredPercent(new BigDecimal("70.00"))
                .status("HOLDING")
                .holdingUntil(LocalDateTime.now().minusHours(1)) // Đã quá hạn
                .build();

        User teacher = User.builder().id("teacher-1").build();
        Order order = Order.builder().id("order-1").build();

        when(escrowRepo.lockById("escrow-expired-1")).thenReturn(Optional.of(escrow));
        when(escrowRepo.countExistingVideos("escrow-expired-1")).thenReturn(10);
        when(attemptRepo.countValidVideos(any(), any(), any())).thenReturn(5); // Chỉ đạt 50%
        when(userRepository.getReferenceById("teacher-1")).thenReturn(teacher);
        when(orderRepository.getReferenceById("order-1")).thenReturn(order);

        settlementService.settleIfExpired("escrow-expired-1");

        // Học viên không được thưởng
        verify(walletService, never()).credit(any(), any(), any(), any(), any(), any(), any(), any());

        // Giảng viên nhận REWARD_RELEASE
        ArgumentCaptor<TeacherWalletEntry> entryCaptor = ArgumentCaptor.forClass(TeacherWalletEntry.class);
        verify(teacherWalletRepo).save(entryCaptor.capture());
        TeacherWalletEntry teacherEntry = entryCaptor.getValue();
        assertEquals("REWARD_RELEASE", teacherEntry.getType());
        assertEquals(new BigDecimal("60000"), teacherEntry.getAmount());
        assertNotNull(teacherEntry.getAvailableAt());

        assertEquals("RELEASED", escrow.getStatus());
        assertNotNull(escrow.getSettledAt());
        verify(notificationService).send(eq("teacher-1"), contains("tiền giữ hộ"), anyString(), eq("FINANCE"), eq("order-1"), anyString());
    }

    @Test
    @DisplayName("6.5: Settle expired: reached 7 of 10 but never evaluated -> CLAIMED prioritizes student")
    void testSettleIfExpired7Of10ToStudent() {
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-expired-2")
                .userId("student-1")
                .teacherId("teacher-1")
                .orderId("order-2")
                .amount(new BigDecimal("75000"))
                .requiredPercent(new BigDecimal("70.00"))
                .status("HOLDING")
                .holdingUntil(LocalDateTime.now().minusHours(2))
                .build();

        when(escrowRepo.lockById("escrow-expired-2")).thenReturn(Optional.of(escrow));
        when(escrowRepo.countExistingVideos("escrow-expired-2")).thenReturn(10);
        when(attemptRepo.countValidVideos(any(), any(), any())).thenReturn(7); // Đã đủ 70%

        settlementService.settleIfExpired("escrow-expired-2");

        // Ưu tiên thưởng cho học viên
        verify(walletService).credit(
                eq("student-1"),
                eq("REWARD"),
                eq("BONUS"),
                eq(new BigDecimal("75000")),
                isNull(),
                eq("order-2"),
                eq("escrow-expired-2"),
                anyString()
        );
        assertEquals("CLAIMED", escrow.getStatus());
        verify(teacherWalletRepo, never()).save(any());
    }

    @Test
    @DisplayName("6.6: Teacher deletes 1 video after purchase: total required videos drops dynamically (10 -> 9)")
    void testTeacherDeletesVideoReducesRequiredVideos() {
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-del-1")
                .userId("student-1")
                .amount(new BigDecimal("50000"))
                .requiredPercent(new BigDecimal("70.00"))
                .status("HOLDING")
                .build();

        when(escrowRepo.lockById("escrow-del-1")).thenReturn(Optional.of(escrow));
        // Giảng viên xóa 1 video nên chỉ còn 9 video tồn tại trong content_items
        when(escrowRepo.countExistingVideos("escrow-del-1")).thenReturn(9);

        // 6 valid: 6 * 100 = 600 < 70 * 9 = 630 -> chưa đạt
        when(attemptRepo.countValidVideos(any(), any(), any())).thenReturn(6);
        settlementService.evaluate("escrow-del-1");
        verify(walletService, never()).credit(any(), any(), any(), any(), any(), any(), any(), any());

        // 7 valid: 7 * 100 = 700 >= 630 -> đạt!
        when(attemptRepo.countValidVideos(any(), any(), any())).thenReturn(7);
        settlementService.evaluate("escrow-del-1");
        verify(walletService).credit(any(), eq("REWARD"), eq("BONUS"), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("6.7: RewardEventListener triggers evaluate when VideoAttemptValidatedEvent is received")
    void testRewardEventListenerTriggersEvaluate() {
        when(escrowRepo.findHoldingIdsForVideo("student-1", "vid-100"))
                .thenReturn(List.of("escrow-h1", "escrow-h2"));

        RewardEscrow e1 = RewardEscrow.builder().id("escrow-h1").status("HOLDING").requiredPercent(new BigDecimal("70.00")).build();
        RewardEscrow e2 = RewardEscrow.builder().id("escrow-h2").status("HOLDING").requiredPercent(new BigDecimal("70.00")).build();
        when(escrowRepo.lockById("escrow-h1")).thenReturn(Optional.of(e1));
        when(escrowRepo.lockById("escrow-h2")).thenReturn(Optional.of(e2));

        rewardEventListener.onValidated(new VideoAttemptValidatedEvent("student-1", "vid-100"));

        verify(escrowRepo).lockById("escrow-h1");
        verify(escrowRepo).lockById("escrow-h2");
    }

    @Test
    @DisplayName("6.8: RewardProgressService builds accurate DTO with ceil(required) and status per video")
    void testRewardProgressService() {
        RewardEscrow escrow = RewardEscrow.builder()
                .id("escrow-p1")
                .userId("student-1")
                .courseId("course-1")
                .amount(new BigDecimal("50000"))
                .requiredPercent(new BigDecimal("70.00"))
                .status("HOLDING")
                .createdAt(LocalDateTime.now().minusDays(2))
                .holdingUntil(LocalDateTime.now().plusMonths(6))
                .build();

        when(escrowRepo.findAllByUserId("student-1")).thenReturn(List.of(escrow));

        Course course = Course.builder().id("course-1").title("Khóa học TOEIC 750+").build();
        when(courseRepo.findById("course-1")).thenReturn(Optional.of(course));

        RewardEscrowVideo v1 = new RewardEscrowVideo("escrow-p1", "vid-1");
        RewardEscrowVideo v2 = new RewardEscrowVideo("escrow-p1", "vid-2");
        RewardEscrowVideo v3 = new RewardEscrowVideo("escrow-p1", "vid-3");
        RewardEscrowVideo vDeleted = new RewardEscrowVideo("escrow-p1", "vid-deleted");

        when(escrowVideoRepo.findByEscrowId("escrow-p1")).thenReturn(List.of(v1, v2, v3, vDeleted));

        // vid-deleted đã bị xóa khỏi content_items nên không có trong kết quả findAllById
        ContentItem item1 = ContentItem.builder().id("vid-1").title("Bài 1").build();
        ContentItem item2 = ContentItem.builder().id("vid-2").title("Bài 2").build();
        ContentItem item3 = ContentItem.builder().id("vid-3").title("Bài 3").build();
        when(contentItemRepo.findAllById(anyList())).thenReturn(List.of(item1, item2, item3));

        // vid-1 có attempt VALID
        VideoViewAttempt att1 = VideoViewAttempt.builder()
                .id("att-1")
                .contentItemId("vid-1")
                .status("VALID")
                .createdAt(LocalDateTime.now().minusDays(1))
                .finalizedAt(LocalDateTime.now().minusDays(1))
                .build();
        // vid-2 có attempt OPEN
        VideoViewAttempt att2 = VideoViewAttempt.builder()
                .id("att-2")
                .contentItemId("vid-2")
                .status("OPEN")
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();
        // vid-3 chưa học (không có attempt)

        when(attemptRepo.findByUserIdOrderByCreatedAtDesc("student-1")).thenReturn(List.of(att1, att2));
        when(attemptService.getSnapshot(att1)).thenReturn(new VideoViewAttemptService.AttemptSnapshot("att-1", "VALID", 85.0, 5.0));
        when(attemptService.getSnapshot(att2)).thenReturn(new VideoViewAttemptService.AttemptSnapshot("att-2", "OPEN", 40.0, 2.0));

        List<RewardProgressDto> dtos = rewardProgressService.getMyRewards("student-1", null);

        assertEquals(1, dtos.size());
        RewardProgressDto p = dtos.get(0);
        assertEquals("escrow-p1", p.escrowId());
        assertEquals("Khóa học TOEIC 750+", p.courseTitle());
        assertEquals(3, p.totalVideos()); // 4 ban đầu trừ 1 đã xóa còn 3
        assertEquals(3, p.requiredVideos()); // ceil(3 * 70 / 100) = ceil(2.1) = 3
        assertEquals(1, p.validVideos()); // Chỉ vid-1 đạt VALID

        List<VideoRewardStatusDto> vDtos = p.videos();
        assertEquals(3, vDtos.size());
        assertEquals("VALID", vDtos.get(0).status());
        assertEquals(85.0, vDtos.get(0).coveragePercent());
        assertEquals("IN_PROGRESS", vDtos.get(1).status());
        assertEquals(40.0, vDtos.get(1).coveragePercent());
        assertEquals("NOT_STARTED", vDtos.get(2).status());
        assertEquals(0.0, vDtos.get(2).coveragePercent());
    }

    @Test
    @DisplayName("6.9: WalletReconciliationService executes 8 ledger rules and notifies admins on discrepancies")
    void testReconciliationDetectsDiscrepancies() {
        Query mockQuery = mock(Query.class);
        // Rule 1 phát hiện 1 order lệch tiền
        when(entityManager.createNativeQuery(anyString())).thenReturn(mockQuery);
        when(mockQuery.getResultList())
                .thenReturn(List.of("order-mismatch-1")) // check 1 có lỗi
                .thenReturn(Collections.emptyList())    // check 2
                .thenReturn(Collections.emptyList())    // check 3
                .thenReturn(Collections.emptyList())    // check 4
                .thenReturn(Collections.emptyList())    // check 5
                .thenReturn(Collections.emptyList())    // check 6
                .thenReturn(Collections.emptyList())    // check 7
                .thenReturn(Collections.emptyList());   // check 8

        User admin = User.builder().id("admin-1").role("ADMIN").build();
        when(userRepository.findByRoleOrderByCreatedAtAsc("ADMIN")).thenReturn(List.of(admin));

        var discrepancies = reconciliationService.runReconciliation();

        assertEquals(1, discrepancies.size());
        assertEquals("CHECK_1_ORDERS_SPLIT", discrepancies.get(0).rule());
        verify(notificationService).send(eq("admin-1"), contains("Cảnh báo đối soát"), anyString(), eq("FINANCE"), isNull(), anyString());
    }
}
