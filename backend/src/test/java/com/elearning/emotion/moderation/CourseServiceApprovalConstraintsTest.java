package com.elearning.emotion.moderation;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.engine.CourseReadinessService;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceApprovalConstraintsTest {

    @Mock
    private CourseRepository courseRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MediaAssetRepository mediaAssetRepository;
    @Mock
    private ContentItemRepository contentItemRepository;
    @Mock
    private ToeicFormatAuditorService toeicFormatAuditorService;
    @Mock
    private CourseReviewLogRepository courseReviewLogRepository;
    @Mock
    private AuditService auditService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private CourseReadinessService courseReadinessService;
    @Mock
    private ModerationRunRepository moderationRunRepository;
    @Mock
    private ModerationIssueRepository moderationIssueRepository;
    @Mock
    private ModerationIssueDecisionRepository moderationIssueDecisionRepository;
    @Mock
    private ModerationContextBuilder moderationContextBuilder;
    @Mock
    private ModerationAnalysisService moderationAnalysisService;
    @Mock
    private HtmlSanitizerService htmlSanitizerService;

    private ObjectMapper objectMapper;
    private CourseService courseService;

    private User admin;
    private User teacher;
    private Course course;

    private final String validChecklist = "{\"contentAppropriate\":true,\"answersAccurate\":true,\"mediaPlayable\":true,\"copyrightClean\":true}";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        courseService = new CourseService(
                courseRepository,
                userRepository,
                mediaAssetRepository,
                contentItemRepository,
                toeicFormatAuditorService,
                courseReviewLogRepository,
                auditService,
                notificationService,
                objectMapper,
                courseReadinessService,
                moderationRunRepository,
                moderationIssueRepository,
                moderationIssueDecisionRepository,
                moderationContextBuilder,
                moderationAnalysisService,
                htmlSanitizerService,
                null,
                null
        );

        admin = User.builder().id("admin-1").fullName("Admin Duyệt").role("ADMIN").build();
        teacher = User.builder().id("teacher-1").fullName("Giảng viên A").build();
        course = Course.builder()
                .id("course-1")
                .title("Khóa học TOEIC 600+")
                .status("PENDING_REVIEW")
                .teacher(teacher)
                .build();
    }

    @Test
    @DisplayName("Ràng buộc 1: Chặn phê duyệt nếu ModerationRun chưa READY_FOR_REVIEW")
    void testConstraint1_RunNotReady() {
        when(courseRepository.findByIdWithLock("course-1")).thenReturn(Optional.of(course));
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        ModerationRun run = ModerationRun.builder()
                .id("run-1")
                .course(course)
                .status("SCANNING")
                .build();
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc("course-1"))
                .thenReturn(Optional.of(run));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseService.approve("admin-1", "course-1", "Ghi chú hợp lệ trên mười ký tự", validChecklist)
        );
        assertTrue(ex.getMessage().contains("chưa hoàn tất"));
    }

    @Test
    @DisplayName("Ràng buộc 2: Chặn phê duyệt nếu còn lỗi ERROR chưa có quyết định")
    void testConstraint2_UndecidedErrors() {
        when(courseRepository.findByIdWithLock("course-1")).thenReturn(Optional.of(course));
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        ModerationRun run = ModerationRun.builder()
                .id("run-1")
                .course(course)
                .status("READY_FOR_REVIEW")
                .riskLevel("LOW")
                .build();
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc("course-1"))
                .thenReturn(Optional.of(run));

        ModerationIssue errorIssue = ModerationIssue.builder()
                .id("i1")
                .run(run)
                .severity("ERROR")
                .issueKey("course-1:CM-01:q1")
                .build();
        when(moderationIssueRepository.findByRunId("run-1")).thenReturn(Collections.singletonList(errorIssue));
        when(moderationIssueDecisionRepository.findByCourseId("course-1")).thenReturn(Collections.emptyList());

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseService.approve("admin-1", "course-1", "Ghi chú hợp lệ trên mười ký tự", validChecklist)
        );
        assertTrue(ex.getMessage().contains("lỗi ERROR bắt buộc"));
    }

    @Test
    @DisplayName("Ràng buộc 3: Chặn phê duyệt nếu còn issue có quyết định NEED_FIX")
    void testConstraint3_NeedFixIssues() {
        when(courseRepository.findByIdWithLock("course-1")).thenReturn(Optional.of(course));
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        ModerationRun run = ModerationRun.builder()
                .id("run-1")
                .course(course)
                .status("READY_FOR_REVIEW")
                .riskLevel("LOW")
                .build();
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc("course-1"))
                .thenReturn(Optional.of(run));

        ModerationIssue errorIssue = ModerationIssue.builder()
                .id("i1")
                .run(run)
                .severity("ERROR")
                .issueKey("course-1:CM-01:q1")
                .build();
        ModerationIssueDecision needFixDecision = ModerationIssueDecision.builder()
                .issueKey("course-1:CM-01:q1")
                .decision("NEED_FIX")
                .build();

        when(moderationIssueRepository.findByRunId("run-1")).thenReturn(Collections.singletonList(errorIssue));
        when(moderationIssueDecisionRepository.findByCourseId("course-1")).thenReturn(Collections.singletonList(needFixDecision));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseService.approve("admin-1", "course-1", "Ghi chú hợp lệ trên mười ký tự", validChecklist)
        );
        assertTrue(ex.getMessage().contains("yêu cầu sửa (NEED_FIX)"));
    }

    @Test
    @DisplayName("Ràng buộc 4: Chặn phê duyệt nếu checklist thẩm định chưa đủ 4 mục")
    void testConstraint4_IncompleteChecklist() {
        when(courseRepository.findByIdWithLock("course-1")).thenReturn(Optional.of(course));
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        ModerationRun run = ModerationRun.builder()
                .id("run-1")
                .course(course)
                .status("READY_FOR_REVIEW")
                .riskLevel("LOW")
                .build();
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc("course-1"))
                .thenReturn(Optional.of(run));
        when(moderationIssueRepository.findByRunId("run-1")).thenReturn(Collections.emptyList());
        when(moderationIssueDecisionRepository.findByCourseId("course-1")).thenReturn(Collections.emptyList());

        // Checklist chỉ có 3 mục true, 1 mục false
        String incomplete = "{\"contentAppropriate\":true,\"answersAccurate\":true,\"mediaPlayable\":true,\"copyrightClean\":false}";

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseService.approve("admin-1", "course-1", "Ghi chú hợp lệ trên mười ký tự", incomplete)
        );
        assertTrue(ex.getMessage().contains("Chưa tích chọn đầy đủ 4 mục"));
    }

    @Test
    @DisplayName("Ràng buộc 5: Chặn phê duyệt nếu rủi ro HIGH mà note dưới 10 ký tự")
    void testConstraint5_HighRiskRequiresNote() {
        when(courseRepository.findByIdWithLock("course-1")).thenReturn(Optional.of(course));
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));

        ModerationRun run = ModerationRun.builder()
                .id("run-1")
                .course(course)
                .status("READY_FOR_REVIEW")
                .riskLevel("HIGH")
                .build();
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc("course-1"))
                .thenReturn(Optional.of(run));
        when(moderationIssueRepository.findByRunId("run-1")).thenReturn(Collections.emptyList());
        when(moderationIssueDecisionRepository.findByCourseId("course-1")).thenReturn(Collections.emptyList());

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseService.approve("admin-1", "course-1", "ngắn", validChecklist)
        );
        assertTrue(ex.getMessage().contains("mức rủi ro CAO (HIGH)"));
    }

    @Test
    @DisplayName("Phê duyệt thành công khi thỏa mãn toàn bộ 5 ràng buộc")
    void testApprove_Success() {
        when(courseRepository.findByIdWithLock("course-1")).thenReturn(Optional.of(course));
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));
        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

        ModerationRun run = ModerationRun.builder()
                .id("run-1")
                .course(course)
                .status("READY_FOR_REVIEW")
                .riskLevel("LOW")
                .build();
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc("course-1"))
                .thenReturn(Optional.of(run));

        ModerationIssue errorIssue = ModerationIssue.builder()
                .id("i1")
                .run(run)
                .severity("ERROR")
                .issueKey("course-1:CM-01:q1")
                .build();
        ModerationIssueDecision acceptDecision = ModerationIssueDecision.builder()
                .issueKey("course-1:CM-01:q1")
                .decision("ACCEPT")
                .build();

        when(moderationIssueRepository.findByRunId("run-1")).thenReturn(Collections.singletonList(errorIssue));
        when(moderationIssueDecisionRepository.findByCourseId("course-1")).thenReturn(Collections.singletonList(acceptDecision));

        Course approved = courseService.approve("admin-1", "course-1", "Ghi chú hợp lệ trên mười ký tự", validChecklist);

        assertNotNull(approved);
        assertEquals("PUBLISHED", approved.getStatus());
        verify(courseReviewLogRepository, times(1)).save(any(CourseReviewLog.class));
        verify(notificationService, times(1)).send(
                eq("teacher-1"),
                anyString(),
                anyString(),
                eq("COURSE_APPROVED"),
                eq("course-1"),
                anyString()
        );
    }

    @Test
    @DisplayName("Từ chối khóa học: Tự động gom các lỗi NEED_FIX gửi vào nội dung phản hồi cho giảng viên")
    void testReject_BundlesNeedFixIssues() {
        when(courseRepository.findByIdWithLock("course-1")).thenReturn(Optional.of(course));
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));
        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

        ModerationRun run = ModerationRun.builder().id("run-1").course(course).build();
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc("course-1")).thenReturn(Optional.of(run));

        ModerationIssue issue1 = ModerationIssue.builder()
                .id("i1")
                .ruleId("CM-01")
                .issueKey("course-1:CM-01:q1")
                .message("Câu 1 thiếu đáp án đúng")
                .build();
        ModerationIssueDecision dec1 = ModerationIssueDecision.builder()
                .issueKey("course-1:CM-01:q1")
                .decision("NEED_FIX")
                .note("Chọn lại đáp án đúng là C")
                .build();

        when(moderationIssueRepository.findByRunId("run-1")).thenReturn(Collections.singletonList(issue1));
        when(moderationIssueDecisionRepository.findByCourseId("course-1")).thenReturn(Collections.singletonList(dec1));

        courseService.reject("admin-1", "course-1", "CONTENT_QUALITY", "Nội dung cần chỉnh sửa theo yêu cầu");

        ArgumentCaptor<String> notifCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService, times(1)).send(
                eq("teacher-1"),
                anyString(),
                notifCaptor.capture(),
                eq("COURSE_REJECTED"),
                eq("course-1"),
                anyString()
        );

        String capturedMessage = notifCaptor.getValue();
        assertTrue(capturedMessage.contains("CONTENT_QUALITY"));
        assertTrue(capturedMessage.contains("CM-01"));
        assertTrue(capturedMessage.contains("Câu 1 thiếu đáp án đúng"));
        assertTrue(capturedMessage.contains("Chọn lại đáp án đúng là C"));
    }
}
