package com.elearning.emotion.moderation;

import com.elearning.emotion.dto.moderation.AdminModerationReportDto;
import com.elearning.emotion.dto.moderation.ModerationDecisionDto;
import com.elearning.emotion.dto.moderation.ModerationDecisionRequest;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.service.AdminModerationService;
import com.elearning.emotion.service.ModerationAnalysisService;
import com.elearning.emotion.service.PolicyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminModerationServiceTest {

    @Mock
    private CourseRepository courseRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ModerationRunRepository moderationRunRepository;
    @Mock
    private ModerationIssueRepository moderationIssueRepository;
    @Mock
    private ModerationIssueDecisionRepository moderationIssueDecisionRepository;
    @Mock
    private PolicyService policyService;
    @Mock
    private ModerationAnalysisService moderationAnalysisService;
    @Mock
    private ModerationContextBuilder moderationContextBuilder;

    private AdminModerationService adminModerationService;

    @BeforeEach
    void setUp() {
        adminModerationService = new AdminModerationService(
                courseRepository,
                userRepository,
                moderationRunRepository,
                moderationIssueRepository,
                moderationIssueDecisionRepository,
                policyService,
                moderationAnalysisService,
                moderationContextBuilder
        );
    }

    @Test
    @DisplayName("getCourseModerationReport: Trả về trạng thái NO_RUN nếu khóa học chưa được quét")
    void testGetReport_NoRun() {
        String courseId = "course-1";
        Course course = Course.builder().id(courseId).title("Khóa học test").build();
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(courseId)).thenReturn(Optional.empty());

        AdminModerationReportDto report = adminModerationService.getCourseModerationReport(courseId);

        assertNotNull(report);
        assertEquals("NO_RUN", report.getStatus());
        assertFalse(report.isCanApprove());
        assertEquals(1, report.getApprovalBlockReasons().size());
    }

    @Test
    @DisplayName("getCourseModerationReport: Tính toán chính xác số lượng lỗi, rủi ro và lý do chặn phê duyệt")
    void testGetReport_WithIssues() {
        String courseId = "course-1";
        Course course = Course.builder().id(courseId).title("Khóa học TOEIC 750").build();
        ModerationRun run = ModerationRun.builder()
                .id("run-1")
                .course(course)
                .status("READY_FOR_REVIEW")
                .riskScore(45)
                .riskLevel("MEDIUM")
                .submittedAt(LocalDateTime.now())
                .build();

        ModerationIssue issueError = ModerationIssue.builder()
                .id("issue-1")
                .run(run)
                .ruleId("CM-01")
                .issueKey("course-1:CM-01:q1")
                .severity("ERROR")
                .message("Câu hỏi chưa có đáp án đúng")
                .build();

        ModerationIssue issueWarning = ModerationIssue.builder()
                .id("issue-2")
                .run(run)
                .ruleId("MED-02")
                .issueKey("course-1:MED-02:m1")
                .severity("WARNING")
                .message("Ảnh dung lượng hơi lớn")
                .build();

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(course));
        when(moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(courseId)).thenReturn(Optional.of(run));
        when(moderationIssueRepository.findByRunId("run-1")).thenReturn(Arrays.asList(issueError, issueWarning));
        when(moderationIssueDecisionRepository.findByCourseId(courseId)).thenReturn(Collections.emptyList());

        AdminModerationReportDto report = adminModerationService.getCourseModerationReport(courseId);

        assertNotNull(report);
        assertEquals("READY_FOR_REVIEW", report.getStatus());
        assertEquals(2, report.getTotalIssues());
        assertEquals(1, report.getErrorCount());
        assertEquals(1, report.getWarningCount());
        assertEquals(1, report.getUndecidedErrorCount());
        assertFalse(report.isCanApprove());
        assertTrue(report.getApprovalBlockReasons().stream().anyMatch(r -> r.contains("lỗi ERROR bắt buộc")));
    }

    @Test
    @DisplayName("updateIssueDecision: Tạo mới quyết định thành công cho issue")
    void testUpdateIssueDecision_Success() {
        String adminId = "admin-1";
        String issueId = "issue-1";
        User admin = User.builder().id(adminId).fullName("Nguyễn Admin").build();
        Course course = Course.builder().id("course-1").build();
        ModerationRun run = ModerationRun.builder().id("run-1").course(course).contentHash("hash123").build();
        ModerationIssue issue = ModerationIssue.builder()
                .id(issueId)
                .run(run)
                .ruleId("CM-01")
                .issueKey("course-1:CM-01:q1")
                .build();

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(moderationIssueRepository.findById(issueId)).thenReturn(Optional.of(issue));
        when(moderationIssueDecisionRepository.findByCourseIdAndIssueKey("course-1", issue.getIssueKey()))
                .thenReturn(Optional.empty());
        when(moderationIssueDecisionRepository.save(any(ModerationIssueDecision.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ModerationDecisionRequest req = new ModerationDecisionRequest();
        req.setDecision("DISMISS");
        req.setNote("Đã xác minh qua bản ghi âm");

        ModerationDecisionDto result = adminModerationService.updateIssueDecision(adminId, issueId, req);

        assertNotNull(result);
        assertEquals("DISMISS", result.getDecision());
        assertEquals("Đã xác minh qua bản ghi âm", result.getNote());
        assertEquals("Nguyễn Admin", result.getDecidedByName());
    }

    @Test
    @DisplayName("updateIssueDecision: Ném ngoại lệ khi quyết định không hợp lệ")
    void testUpdateIssueDecision_InvalidDecision() {
        String adminId = "admin-1";
        String issueId = "issue-1";
        User admin = User.builder().id(adminId).build();
        Course course = Course.builder().id("c1").build();
        ModerationRun run = ModerationRun.builder().id("r1").course(course).build();
        ModerationIssue issue = ModerationIssue.builder().id(issueId).run(run).build();

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(moderationIssueRepository.findById(issueId)).thenReturn(Optional.of(issue));

        ModerationDecisionRequest req = new ModerationDecisionRequest();
        req.setDecision("INVALID_STATUS");

        assertThrows(IllegalArgumentException.class, () ->
                adminModerationService.updateIssueDecision(adminId, issueId, req)
        );
    }
}
