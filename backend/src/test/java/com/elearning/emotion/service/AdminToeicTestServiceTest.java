package com.elearning.emotion.service;

import com.elearning.emotion.dto.test.ToeicTestDto;
import com.elearning.emotion.entity.ToeicTest;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.ToeicTestPartRepository;
import com.elearning.emotion.repository.ToeicTestRepository;
import com.elearning.emotion.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminToeicTestServiceTest {

    @Mock
    private ToeicTestRepository toeicTestRepository;
    @Mock
    private ToeicTestPartRepository toeicTestPartRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AuditService auditService;
    @Mock
    private ToeicTestSnapshotService toeicTestSnapshotService;
    @Mock
    private SystemToeicTestSeederService systemToeicTestSeederService;
    @Mock
    private com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    @InjectMocks
    private AdminToeicTestService adminToeicTestService;

    private User admin;
    private User author;
    private ToeicTest pendingTest;

    @BeforeEach
    void setUp() {
        admin = User.builder().id("admin-1").fullName("Quản trị viên").role("ADMIN").build();
        author = User.builder().id("teacher-1").fullName("Thầy Nam").role("TEACHER").build();
        pendingTest = ToeicTest.builder()
                .id("test-p-1")
                .author(author)
                .title("ETS Test 2024")
                .status("PENDING_REVIEW")
                .version(1)
                .build();
    }

    @Test
    @DisplayName("Admin phê duyệt đề thi: chuyển sang PUBLISHED, gửi thông báo cho GV, ghi audit log")
    void testApproveTest() {
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));
        when(toeicTestRepository.findById("test-p-1")).thenReturn(Optional.of(pendingTest));
        when(toeicTestRepository.save(any(ToeicTest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-p-1")).thenReturn(List.of());

        ToeicTestDto res = adminToeicTestService.approveTest("admin-1", "test-p-1");

        assertEquals("PUBLISHED", res.status());
        assertNotNull(res.publishedAt());
        assertNull(res.rejectionReason());

        verify(notificationService).send(
                eq("teacher-1"),
                contains("phê duyệt"),
                anyString(),
                eq("TEST_MODERATION"),
                eq("test-p-1"),
                anyString()
        );
        verify(auditService).log(eq(admin), eq("APPROVE_TOEIC_TEST"), eq("TOEIC_TEST"), eq("test-p-1"), anyString());
    }

    @Test
    @DisplayName("Admin từ chối đề thi: chuyển sang REJECTED kèm lý do, gửi thông báo cho GV")
    void testRejectTest() {
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));
        when(toeicTestRepository.findById("test-p-1")).thenReturn(Optional.of(pendingTest));
        when(toeicTestRepository.save(any(ToeicTest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-p-1")).thenReturn(List.of());

        ToeicTestDto res = adminToeicTestService.rejectTest("admin-1", "test-p-1", "Câu hỏi Part 5 bị trùng lặp nhiều");

        assertEquals("REJECTED", res.status());
        assertEquals("Câu hỏi Part 5 bị trùng lặp nhiều", res.rejectionReason());

        verify(notificationService).send(
                eq("teacher-1"),
                contains("từ chối"),
                contains("Câu hỏi Part 5 bị trùng lặp nhiều"),
                eq("TEST_MODERATION"),
                eq("test-p-1"),
                anyString()
        );
        verify(auditService).log(eq(admin), eq("REJECT_TOEIC_TEST"), eq("TOEIC_TEST"), eq("test-p-1"), anyString());
    }

    @Test
    @DisplayName("Admin gỡ bỏ đề thi vi phạm khỏi thư viện: chuyển sang HIDDEN kèm lý do")
    void testHideViolationTest() {
        ToeicTest publishedTest = ToeicTest.builder()
                .id("test-pub-1")
                .author(author)
                .title("Đề có vi phạm")
                .status("PUBLISHED")
                .build();

        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));
        when(toeicTestRepository.findById("test-pub-1")).thenReturn(Optional.of(publishedTest));
        when(toeicTestRepository.save(any(ToeicTest.class))).thenAnswer(inv -> inv.getArgument(0));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-pub-1")).thenReturn(List.of());

        ToeicTestDto res = adminToeicTestService.hideViolationTest("admin-1", "test-pub-1", "Vi phạm bản quyền nội dung");

        assertEquals("HIDDEN", res.status());
        assertEquals("Vi phạm bản quyền nội dung", res.rejectionReason());

        verify(notificationService).send(
                eq("teacher-1"),
                contains("gỡ khỏi thư viện"),
                contains("Vi phạm bản quyền nội dung"),
                eq("TEST_MODERATION"),
                eq("test-pub-1"),
                anyString()
        );
    }

    @Test
    @DisplayName("Admin khởi tạo các đề thi mẫu Hệ thống chuẩn ETS TOEIC")
    void testSeedSampleSystemTests() {
        ToeicTest t1 = ToeicTest.builder().id("t1").title("ETS Test 1").source("SYSTEM").status("PUBLISHED").build();
        ToeicTest t2 = ToeicTest.builder().id("t2").title("ETS Test 2").source("SYSTEM").status("PUBLISHED").build();

        when(systemToeicTestSeederService.seedSystemTests("admin-1")).thenReturn(List.of(t1, t2));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc(anyString())).thenReturn(List.of());

        List<ToeicTestDto> result = adminToeicTestService.seedSampleSystemTests("admin-1");

        assertEquals(2, result.size());
        assertEquals("ETS Test 1", result.get(0).title());
        assertEquals("ETS Test 2", result.get(1).title());
        verify(systemToeicTestSeederService).seedSystemTests("admin-1");
    }
}
