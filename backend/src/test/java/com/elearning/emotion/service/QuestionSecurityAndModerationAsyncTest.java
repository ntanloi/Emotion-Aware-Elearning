package com.elearning.emotion.service;

import com.elearning.emotion.dto.QuestionCheckRequest;
import com.elearning.emotion.dto.QuestionCheckResultDto;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.moderation.engine.ModerationRunner;
import com.elearning.emotion.moderation.engine.RuleRegistry;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QuestionSecurityAndModerationAsyncTest {

    // Dependencies for QuestionService
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private ContentItemRepository contentItemRepository;
    @Mock
    private CourseAccessService courseAccessService;
    @Mock
    private ToeicTestPartRepository toeicTestPartRepository;
    @Mock
    private TestAttemptRepository testAttemptRepository;
    @Mock
    private AnswerOptionRepository answerOptionRepository;
    @Mock
    private TextAnswerRepository textAnswerRepository;
    @Mock
    private MatchingPairRepository matchingPairRepository;
    @Mock
    private WordChoicePairRepository wordChoicePairRepository;
    @Mock
    private DragDropOptionRepository dragDropOptionRepository;

    @InjectMocks
    private QuestionService questionService;

    // Dependencies for ModerationAnalysisService
    @Mock
    private ModerationContextBuilder contextBuilder;
    @Mock
    private ModerationRunner moderationRunner;
    @Mock
    private RuleRegistry ruleRegistry;
    @Mock
    private ModerationRunRepository moderationRunRepository;
    @Mock
    private ModerationIssueRepository moderationIssueRepository;
    @Mock
    private CourseRepository courseRepository;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @Mock
    private ObjectProvider<ModerationAsyncExecutor> asyncExecutorProvider;
    @Mock
    private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @InjectMocks
    private ModerationAnalysisService moderationAnalysisService;

    private User student;
    private Course regularCourse;
    private ContentItem regularItem;
    private Question regularQuestion;

    private Course examCourse;
    private ContentItem examItem;
    private Question examQuestion;
    private ToeicTest toeicTest;
    private ToeicTestPart toeicTestPart;

    @BeforeEach
    void setUp() {
        student = User.builder().id("student-1").fullName("Nguyễn Văn A").build();

        regularCourse = Course.builder().id("course-regular").title("Khóa học thường").profile("TOPIC").build();
        regularItem = ContentItem.builder().id("item-regular").course(regularCourse).title("Bài luyện 1").build();
        regularQuestion = Question.builder().id("q-regular").contentItem(regularItem).promptText("What is this?").questionKind("MULTIPLE_CHOICE").build();

        examCourse = Course.builder().id("course-exam").title("Kho chứa đề").profile("EXAM").build();
        examItem = ContentItem.builder().id("item-exam-p1").course(examCourse).title("Đề 1 - Part 1").build();
        examQuestion = Question.builder().id("q-exam-1").contentItem(examItem).promptText("Photo 1").questionKind("MULTIPLE_CHOICE").build();

        toeicTest = ToeicTest.builder().id("test-toeic-1").title("ETS 2024 Test 1").course(examCourse).build();
        toeicTestPart = ToeicTestPart.builder().id("part-1").test(toeicTest).partNo(1).contentItem(examItem).build();
    }

    @Test
    @DisplayName("Học viên chưa mua khóa học bị chặn kiểm tra đáp án ở bài học thường")
    void checkAnswer_regularCourse_notEnrolled_shouldThrowSecurityException() {
        when(questionRepository.findById("q-regular")).thenReturn(Optional.of(regularQuestion));
        doThrow(new SecurityException("Bạn chưa ghi danh khóa học này"))
                .when(courseAccessService).validateCanLearn("student-1", regularCourse);

        QuestionCheckRequest req = new QuestionCheckRequest(null, "opt-1", null, null, null, null);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                questionService.checkAnswer("student-1", "q-regular", req)
        );
        assertTrue(ex.getMessage().contains("chưa ghi danh"));
    }

    @Test
    @DisplayName("Câu hỏi đề thi TOEIC không có attemptId bị từ chối kiểm tra đáp án")
    void checkAnswer_testQuestion_missingAttemptId_shouldThrowSecurityException() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("student-1", examCourse)).thenReturn(false);
        when(toeicTestPartRepository.findFirstByContentItemId("item-exam-p1")).thenReturn(Optional.of(toeicTestPart));

        QuestionCheckRequest req = new QuestionCheckRequest(null, "opt-1", null, null, null, null);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                questionService.checkAnswer("student-1", "q-exam-1", req)
        );
        assertTrue(ex.getMessage().contains("Cần cung cấp mã lượt làm bài"));
    }

    @Test
    @DisplayName("AttemptId thuộc người dùng khác bị từ chối")
    void checkAnswer_wrongAttemptOwner_shouldThrowSecurityException() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("student-1", examCourse)).thenReturn(false);

        User anotherUser = User.builder().id("student-2").build();
        TestAttempt attempt = TestAttempt.builder()
                .id("att-1")
                .user(anotherUser)
                .status("IN_PROGRESS")
                .test(toeicTest)
                .build();
        when(testAttemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));

        QuestionCheckRequest req = new QuestionCheckRequest("att-1", "opt-1", null, null, null, null);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                questionService.checkAnswer("student-1", "q-exam-1", req)
        );
        assertTrue(ex.getMessage().contains("Bạn không có quyền truy cập"));
    }

    @Test
    @DisplayName("AttemptId không ở trạng thái IN_PROGRESS bị từ chối")
    void checkAnswer_completedAttempt_shouldThrowSecurityException() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("student-1", examCourse)).thenReturn(false);

        TestAttempt attempt = TestAttempt.builder()
                .id("att-1")
                .user(student)
                .status("COMPLETED")
                .test(toeicTest)
                .build();
        when(testAttemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));

        QuestionCheckRequest req = new QuestionCheckRequest("att-1", "opt-1", null, null, null, null);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                questionService.checkAnswer("student-1", "q-exam-1", req)
        );
        assertTrue(ex.getMessage().contains("đã kết thúc"));
    }

    @Test
    @DisplayName("Lỗ hổng gian lận chéo đề: Câu hỏi không thuộc đề thi của lượt làm bài bị từ chối")
    void checkAnswer_crossTestCheat_shouldThrowSecurityException() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("student-1", examCourse)).thenReturn(false);

        ToeicTest otherTest = ToeicTest.builder().id("test-other").build();
        TestAttempt attempt = TestAttempt.builder()
                .id("att-1")
                .user(student)
                .status("IN_PROGRESS")
                .test(otherTest)
                .build();
        when(testAttemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));

        ContentItem otherItem = ContentItem.builder().id("item-other").build();
        ToeicTestPart otherPart = ToeicTestPart.builder().id("part-other").test(otherTest).partNo(1).contentItem(otherItem).build();
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-other")).thenReturn(List.of(otherPart));

        QuestionCheckRequest req = new QuestionCheckRequest("att-1", "opt-1", null, null, null, null);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                questionService.checkAnswer("student-1", "q-exam-1", req)
        );
        assertTrue(ex.getMessage().contains("Câu hỏi không thuộc đề thi"));
    }

    @Test
    @DisplayName("Lỗ hổng gian lận chéo part: Câu hỏi thuộc part không được chọn trong lượt làm bài bị từ chối")
    void checkAnswer_crossPartCheat_shouldThrowSecurityException() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("student-1", examCourse)).thenReturn(false);

        TestAttempt attempt = TestAttempt.builder()
                .id("att-1")
                .user(student)
                .status("IN_PROGRESS")
                .test(toeicTest)
                .selectedParts("5,6,7") // Học viên chỉ chọn Part 5, 6, 7
                .build();
        when(testAttemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(List.of(toeicTestPart));

        QuestionCheckRequest req = new QuestionCheckRequest("att-1", "opt-1", null, null, null, null);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                questionService.checkAnswer("student-1", "q-exam-1", req)
        );
        assertTrue(ex.getMessage().contains("không nằm trong phạm vi làm bài"));
    }

    @Test
    @DisplayName("Chế độ thi thử AFTER_TEST từ chối gọi /check để tránh lộ đáp án trước khi nộp")
    void checkAnswer_afterTestMode_shouldThrowSecurityException() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("student-1", examCourse)).thenReturn(false);

        TestAttempt attempt = TestAttempt.builder()
                .id("att-1")
                .user(student)
                .status("IN_PROGRESS")
                .test(toeicTest)
                .selectedParts("1")
                .feedbackMode("AFTER_TEST")
                .mode("FULL")
                .build();
        when(testAttemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(List.of(toeicTestPart));

        QuestionCheckRequest req = new QuestionCheckRequest("att-1", "opt-1", null, null, null, null);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                questionService.checkAnswer("student-1", "q-exam-1", req)
        );
        assertTrue(ex.getMessage().contains("chế độ thi thử"));
    }

    @Test
    @DisplayName("Chế độ luyện tập (IMMEDIATE) cho phép kiểm tra đáp án từng câu")
    void checkAnswer_practiceMode_shouldReturnEvaluation() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("student-1", examCourse)).thenReturn(false);

        TestAttempt attempt = TestAttempt.builder()
                .id("att-1")
                .user(student)
                .status("IN_PROGRESS")
                .test(toeicTest)
                .selectedParts("1")
                .feedbackMode("IMMEDIATE")
                .mode("PRACTICE")
                .build();
        when(testAttemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(List.of(toeicTestPart));

        AnswerOption correctOpt = AnswerOption.builder().id("opt-1").question(examQuestion).label("A").isCorrect(true).build();
        AnswerOption wrongOpt = AnswerOption.builder().id("opt-2").question(examQuestion).label("B").isCorrect(false).build();
        when(answerOptionRepository.findByQuestionIdOrderByLabelAsc("q-exam-1")).thenReturn(List.of(correctOpt, wrongOpt));

        QuestionCheckRequest req = new QuestionCheckRequest("att-1", "opt-1", null, null, null, null);

        QuestionCheckResultDto result = questionService.checkAnswer("student-1", "q-exam-1", req);
        assertNotNull(result);
        assertTrue(result.correct());
        assertEquals("opt-1", result.correctOptionId());
    }

    @Test
    @DisplayName("Giảng viên xem trước đề thi không cần attemptId vẫn kiểm tra được đáp án")
    void checkAnswer_teacherPreview_noAttemptId_shouldSucceed() {
        when(questionRepository.findById("q-exam-1")).thenReturn(Optional.of(examQuestion));
        when(courseAccessService.canManageOrModerate("teacher-1", examCourse)).thenReturn(true);

        AnswerOption correctOpt = AnswerOption.builder().id("opt-1").question(examQuestion).label("A").isCorrect(true).build();
        when(answerOptionRepository.findByQuestionIdOrderByLabelAsc("q-exam-1")).thenReturn(List.of(correctOpt));

        QuestionCheckRequest req = new QuestionCheckRequest(null, "opt-1", null, null, null, null);

        QuestionCheckResultDto result = questionService.checkAnswer("teacher-1", "q-exam-1", req);
        assertNotNull(result);
        assertTrue(result.correct());
    }

    @Test
    @DisplayName("Pha 3 kiểm duyệt: Nếu run đã bị scheduler chuyển thành FAILED (timeout), không ghi đè kết quả")
    void saveAnalysisResult_whenRunAlreadyFailed_shouldAbortWithoutSavingIssues() {
        // Giả lập updateStatusIfAnalyzing trả về 0 (không có dòng nào được cập nhật vì status != ANALYZING)
        when(moderationRunRepository.updateStatusIfAnalyzing(
                eq("run-1"), eq("READY_FOR_REVIEW"), anyInt(), anyString(), any(LocalDateTime.class)))
                .thenReturn(0);

        ModerationRunner.RunResult result = ModerationRunner.RunResult.builder()
                .riskScore(10)
                .riskLevel("LOW")
                .issues(List.of(RuleIssue.builder().ruleId("STR-01").build()))
                .build();

        ModerationContext ctx = ModerationContext.builder().contentHash("hash123").build();

        moderationAnalysisService.saveAnalysisResult("course-1", "run-1", ctx, result);

        // Đảm bảo không ghi đè issues
        verify(moderationIssueRepository, never()).saveAll(any());
        verify(courseRepository, never()).save(any());
    }

    @Test
    @DisplayName("Pha 3 kiểm duyệt: Khi run vẫn đang ANALYZING, cập nhật READY_FOR_REVIEW và lưu issues")
    void saveAnalysisResult_whenRunAnalyzing_shouldUpdateAndSaveIssues() {
        when(moderationRunRepository.updateStatusIfAnalyzing(
                eq("run-1"), eq("READY_FOR_REVIEW"), anyInt(), anyString(), any(LocalDateTime.class)))
                .thenReturn(1);

        ModerationRun run = ModerationRun.builder().id("run-1").status("READY_FOR_REVIEW").build();
        when(moderationRunRepository.findById("run-1")).thenReturn(Optional.of(run));
        when(courseRepository.findById("course-1")).thenReturn(Optional.of(regularCourse));

        ModerationRunner.RunResult result = ModerationRunner.RunResult.builder()
                .riskScore(5)
                .riskLevel("LOW")
                .blockerCount(0)
                .errorCount(0)
                .warningCount(1)
                .infoCount(0)
                .issues(List.of(RuleIssue.builder()
                        .ruleId("MED-01")
                        .category("MEDIA")
                        .severity(com.elearning.emotion.moderation.model.Severity.WARNING)
                        .targetType("CONTENT_ITEM")
                        .targetId("item-1")
                        .message("Ảnh độ phân giải thấp")
                        .build()))
                .build();

        ModerationContext ctx = ModerationContext.builder().contentHash("hash123").build();

        moderationAnalysisService.saveAnalysisResult("course-1", "run-1", ctx, result);

        verify(moderationIssueRepository, times(1)).saveAll(anyList());
        verify(courseRepository, times(1)).save(regularCourse);
    }

    @Test
    @DisplayName("Scheduler tự động quét và đánh dấu FAILED các lượt ANALYZING quá 15 phút")
    void cleanupStuckRuns_shouldMarkOverdueRunsAsFailed() {
        ModerationRun stuckRun = ModerationRun.builder()
                .id("stuck-1")
                .status("ANALYZING")
                .submittedAt(LocalDateTime.now().minusMinutes(20))
                .course(regularCourse)
                .build();

        when(moderationRunRepository.findByStatusAndSubmittedAtBefore(eq("ANALYZING"), any(LocalDateTime.class)))
                .thenReturn(List.of(stuckRun));

        moderationAnalysisService.cleanupStuckRuns();

        assertEquals("FAILED", stuckRun.getStatus());
        assertNotNull(stuckRun.getFinishedAt());
        verify(moderationRunRepository, times(1)).save(stuckRun);
    }
}
