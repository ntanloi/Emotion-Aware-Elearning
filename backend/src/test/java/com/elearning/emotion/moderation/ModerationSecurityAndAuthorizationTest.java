package com.elearning.emotion.moderation;

import com.elearning.emotion.dto.CourseUpdateRequest;
import com.elearning.emotion.dto.PassageCreateRequest;
import com.elearning.emotion.dto.PassageUpdateRequest;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.engine.CourseReadinessService;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.moderation.engine.ModerationRunner;
import com.elearning.emotion.moderation.engine.RuleRegistry;
import com.elearning.emotion.moderation.model.ReadinessReportDto;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.ContentItemService;
import com.elearning.emotion.service.CourseService;
import com.elearning.emotion.service.HtmlSanitizerService;
import com.elearning.emotion.service.PassageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModerationSecurityAndAuthorizationTest {

    @Mock
    private CourseRepository courseRepository;
    @Mock
    private ModerationContextBuilder contextBuilder;
    @Mock
    private RuleRegistry ruleRegistry;
    @Mock
    private ModerationRunner moderationRunner;
    @Mock
    private PassageRepository passageRepository;
    @Mock
    private ContentItemService contentItemService;
    @Mock
    private MediaAssetRepository mediaAssetRepository;
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private ModerationRunRepository moderationRunRepository;
    @Mock
    private ModerationIssueRepository moderationIssueRepository;
    @Mock
    private ModerationIssueDecisionRepository moderationIssueDecisionRepository;

    private HtmlSanitizerService htmlSanitizerService;
    private CourseReadinessService courseReadinessService;
    private PassageService passageService;
    private CourseService courseService;

    private User teacherA;
    private User teacherB;
    private Course courseA;

    @BeforeEach
    void setUp() {
        htmlSanitizerService = new HtmlSanitizerService();
        courseReadinessService = new CourseReadinessService(courseRepository, contextBuilder, ruleRegistry, moderationRunner);
        passageService = new PassageService(passageRepository, mediaAssetRepository, questionRepository, null, contentItemService, htmlSanitizerService);
        courseService = new CourseService(
                courseRepository,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                courseReadinessService,
                moderationRunRepository,
                moderationIssueRepository,
                moderationIssueDecisionRepository,
                contextBuilder,
                null,
                htmlSanitizerService,
                null,
                null
        );

        teacherA = User.builder().id("teacher-a").email("teacherA@elearning.vn").role("TEACHER").fullName("Giảng viên A").build();
        teacherB = User.builder().id("teacher-b").email("teacherB@elearning.vn").role("TEACHER").fullName("Giảng viên B").build();
        courseA = Course.builder().id("course-a").teacher(teacherA).title("TOEIC Căn Bản 1").status("DRAFT").build();
    }

    // =========================================================================
    // 1. KIỂM SOÁT QUYỀN SỞ HỮU (OWNERSHIP CHECKS)
    // =========================================================================

    @Test
    @DisplayName("Giảng viên B KHÔNG ĐƯỢC xem thông tin readiness/kiểm duyệt khóa học của Giảng viên A")
    void testTeacherCannotViewAnotherTeacherCourseReadiness() {
        when(courseRepository.findById("course-a")).thenReturn(Optional.of(courseA));

        SecurityException ex = assertThrows(SecurityException.class, () ->
                courseReadinessService.checkReadiness("course-a", teacherB.getId())
        );

        assertTrue(ex.getMessage().contains("không có quyền xem thông tin kiểm duyệt"),
                "Phải ném ngoại lệ bảo mật khi truy cập trái quyền sở hữu");
    }

    @Test
    @DisplayName("Giảng viên B KHÔNG ĐƯỢC gửi duyệt (submit) khóa học của Giảng viên A")
    void testTeacherCannotSubmitAnotherTeacherCourse() {
        when(courseRepository.findByIdForUpdate("course-a")).thenReturn(Optional.of(courseA));

        SecurityException ex = assertThrows(SecurityException.class, () ->
                courseService.submit(teacherB.getId(), "course-a")
        );

        assertTrue(ex.getMessage().contains("không có quyền"), "Phải chặn submit chéo giữa các giảng viên");
    }

    @Test
    @DisplayName("Giảng viên B KHÔNG ĐƯỢC rút duyệt (cancelSubmit) khóa học của Giảng viên A")
    void testTeacherCannotCancelSubmitAnotherTeacherCourse() {
        courseA.setStatus("PENDING_REVIEW");
        when(courseRepository.findById("course-a")).thenReturn(Optional.of(courseA));

        SecurityException ex = assertThrows(SecurityException.class, () ->
                courseService.cancelSubmit(teacherB.getId(), "course-a")
        );

        assertTrue(ex.getMessage().contains("không có quyền"));
    }

    // =========================================================================
    // 2. BẢO MẬT DUP-02: KHÔNG LỘ KHÓA NGUỒN CHO GIẢNG VIÊN
    // =========================================================================

    @Test
    @DisplayName("Bảo mật DUP-02: Giảng viên xem báo cáo không được lộ tiêu đề hoặc ID của khóa học nguồn")
    void testDup02SourceCourseIsMaskedForTeacher() {
        RuleIssue originalDup02 = RuleIssue.builder()
                .ruleId("DUP-02")
                .category("DUPLICATION")
                .severity(Severity.WARNING)
                .targetType("QUESTION")
                .targetId("q-123")
                .message("Câu hỏi trùng lặp với khóa học khác: 'Khóa TOEIC Tuyệt Đỉnh của Thầy X' (Mã khóa: secret-course-999).")
                .build();

        when(courseRepository.findById("course-a")).thenReturn(Optional.of(courseA));
        com.elearning.emotion.moderation.model.ModerationContext mockCtx = mock(com.elearning.emotion.moderation.model.ModerationContext.class);
        when(contextBuilder.buildContext(courseA)).thenReturn(mockCtx);
        when(ruleRegistry.getRulesByCategory("STRUCTURE")).thenReturn(Collections.emptyList());
        when(moderationRunner.runRules(any(), any())).thenReturn(
                ModerationRunner.RunResult.builder().issues(List.of(originalDup02)).build()
        );

        // Giảng viên gọi checkReadiness (teacherId != null)
        ReadinessReportDto teacherReport = courseReadinessService.checkReadiness("course-a", teacherA.getId());
        RuleIssue maskedIssue = teacherReport.getWarnings().get(0);

        assertFalse(maskedIssue.getMessage().contains("secret-course-999"), "Tuyệt đối không lộ ID khóa học nguồn cho giảng viên");
        assertFalse(maskedIssue.getMessage().contains("Khóa TOEIC Tuyệt Đỉnh của Thầy X"), "Tuyệt đối không lộ tên khóa nguồn cho giảng viên");
        assertTrue(maskedIssue.getMessage().contains("có độ tương đồng cao với nội dung đã có trên hệ thống"), "Thông điệp phải được ẩn danh hóa an toàn");
    }

    @Test
    @DisplayName("DUP-02 cho Admin: Admin phải thấy đầy đủ thông tin khóa nguồn để đối chiếu bản quyền")
    void testDup02SourceCourseIsVisibleForAdmin() {
        RuleIssue originalDup02 = RuleIssue.builder()
                .ruleId("DUP-02")
                .category("DUPLICATION")
                .severity(Severity.WARNING)
                .targetType("QUESTION")
                .targetId("q-123")
                .message("Câu hỏi trùng lặp với khóa học khác: 'Khóa TOEIC Tuyệt Đỉnh của Thầy X' (Mã khóa: secret-course-999).")
                .build();

        when(courseRepository.findById("course-a")).thenReturn(Optional.of(courseA));
        com.elearning.emotion.moderation.model.ModerationContext mockCtx = mock(com.elearning.emotion.moderation.model.ModerationContext.class);
        when(contextBuilder.buildContext(courseA)).thenReturn(mockCtx);
        when(ruleRegistry.getRulesByCategory("STRUCTURE")).thenReturn(Collections.emptyList());
        when(moderationRunner.runRules(any(), any())).thenReturn(
                ModerationRunner.RunResult.builder().issues(List.of(originalDup02)).build()
        );

        // Admin gọi checkReadiness (teacherId == null)
        ReadinessReportDto adminReport = courseReadinessService.checkReadiness("course-a", null);
        RuleIssue adminIssue = adminReport.getWarnings().get(0);

        assertTrue(adminIssue.getMessage().contains("secret-course-999"), "Admin phải thấy ID khóa nguồn để thẩm định");
        assertTrue(adminIssue.getMessage().contains("Khóa TOEIC Tuyệt Đỉnh của Thầy X"), "Admin phải thấy tên khóa nguồn để xử lý tranh chấp bản quyền");
    }

    // =========================================================================
    // 3. KHỬ MÃ ĐỘC HTML (HTML SANITIZATION)
    // =========================================================================

    @Test
    @DisplayName("Khử mã độc HTML: Script và các thuộc tính javascript bị xóa sạch khi lưu")
    void testHtmlSanitizationRemovesMaliciousScripts() {
        String dirtyHtml = "<p>Nội dung học tập</p><script>alert('attack')</script><a href='javascript:stealCookies()'>Click me</a>";

        String clean = htmlSanitizerService.sanitize(dirtyHtml);

        assertFalse(clean.contains("<script>"), "Thẻ script phải bị xóa");
        assertFalse(clean.contains("alert('attack')"), "Nội dung script phải bị xóa");
        assertFalse(clean.contains("javascript:"), "Giao thức javascript: phải bị chặn");
        assertTrue(clean.contains("<p>Nội dung học tập</p>"), "Nội dung an toàn được giữ nguyên");
    }

    @Test
    @DisplayName("PassageService: Khử mã độc trong transcriptHtml và passageHtml khi tạo và cập nhật")
    void testPassageServiceSanitizesHtml() {
        ContentItem item = ContentItem.builder().id("item-1").course(courseA).build();
        when(contentItemService.getOwnedOrThrow(teacherA.getId(), "item-1")).thenReturn(item);
        when(passageRepository.findByContentItemIdOrderByOrderIndex("item-1")).thenReturn(Collections.emptyList());
        when(passageRepository.save(any(Passage.class))).thenAnswer(inv -> inv.getArgument(0));

        PassageCreateRequest req = new PassageCreateRequest(
                "item-1",
                "<p>Bài nghe</p><script>malicious()</script>",
                "<div>Đoạn văn</div><img src=x onerror=alert(1)>",
                null,
                null
        );

        Passage saved = passageService.create(teacherA.getId(), req);

        assertNotNull(saved);
        assertFalse(saved.getTranscriptHtml().contains("<script>"));
        assertFalse(saved.getPassageHtml().contains("onerror"));
    }

    // =========================================================================
    // 4. PHÂN QUYỀN TRÊN CONTROLLER (ROLE ANNOTATIONS VERIFICATION)
    // =========================================================================

    @Test
    @DisplayName("Admin Controllers: Đảm bảo toàn bộ endpoint quản trị đều có @PreAuthorize('hasRole(\"ADMIN\")')")
    void testAdminControllersHaveStrictAdminPreAuthorize() {
        Class<?>[] adminControllers = {
                com.elearning.emotion.controller.AdminModerationController.class,
                com.elearning.emotion.controller.AdminLexiconController.class,
                com.elearning.emotion.controller.AdminPolicyController.class
        };

        for (Class<?> clazz : adminControllers) {
            PreAuthorize classAnnotation = clazz.getAnnotation(PreAuthorize.class);
            assertNotNull(classAnnotation, "Controller " + clazz.getSimpleName() + " phải có @PreAuthorize ở class level");
            assertTrue(classAnnotation.value().contains("ADMIN") || classAnnotation.value().contains("MODERATOR"),
                    "Controller " + clazz.getSimpleName() + " phải yêu cầu role ADMIN hoặc MODERATOR, tìm thấy: " + classAnnotation.value());
        }
    }

    @Test
    @DisplayName("Teacher Controller: Endpoint /api/teacher/courses/{id}/readiness có @PreAuthorize('hasRole(\"TEACHER\")')")
    void testTeacherControllersHaveStrictTeacherPreAuthorize() throws NoSuchMethodException {
        var method = com.elearning.emotion.controller.TeacherCourseReadinessController.class
                .getMethod("getCourseReadiness", String.class, String.class);

        PreAuthorize preAuth = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuth, "getCourseReadiness phải có @PreAuthorize");
        assertTrue(preAuth.value().contains("TEACHER"), "Phải yêu cầu quyền TEACHER");
    }
}
