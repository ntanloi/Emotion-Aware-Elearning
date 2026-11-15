package com.elearning.emotion.service;

import com.elearning.emotion.dto.AnswerOptionDto;
import com.elearning.emotion.dto.QuestionDto;
import com.elearning.emotion.dto.test.*;
import com.elearning.emotion.entity.*;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TestAttemptServiceTest {

    @Mock
    private TestAttemptRepository testAttemptRepository;
    @Mock
    private ToeicTestRepository toeicTestRepository;
    @Mock
    private ToeicTestPartRepository toeicTestPartRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContentItemRepository contentItemRepository;
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private PassageRepository passageRepository;
    @Mock
    private QuestionService questionService;
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
    @Mock
    private AttemptRepository attemptRepository;
    @Mock
    private AttemptAnswerRepository attemptAnswerRepository;
    @Mock
    private TestAccessService testAccessService;
    @Mock
    private CourseAccessService courseAccessService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private TestAttemptService testAttemptService;

    private User user;
    private ToeicTest toeicTest;
    private List<ToeicTestPart> sevenParts;

    @BeforeEach
    void setUp() {
        user = User.builder().id("user-1").fullName("Học viên A").build();

        toeicTest = ToeicTest.builder()
                .id("test-toeic-1")
                .title("ETS TOEIC Test 01")
                .source("SYSTEM")
                .status("PUBLISHED")
                .listeningMinutes(45)
                .readingMinutes(75)
                .attemptCount(10)
                .build();

        sevenParts = new ArrayList<>();
        for (int i = 1; i <= 7; i++) {
            ContentItem item = ContentItem.builder()
                    .id("item-part-" + i)
                    .title("Part " + i)
                    .type("PRACTICE_TEST")
                    .build();
            sevenParts.add(ToeicTestPart.builder()
                    .id("part-id-" + i)
                    .test(toeicTest)
                    .partNo(i)
                    .contentItem(item)
                    .questionCount(i == 1 ? 6 : 20)
                    .build());
        }
    }

    @Test
    @DisplayName("Bắt đầu lượt làm bài FULL: tính deadline 7200s, tăng attempt_count")
    void testStartFullAttempt() {
        when(toeicTestRepository.findById("test-toeic-1")).thenReturn(Optional.of(toeicTest));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(sevenParts);
        when(testAttemptRepository.save(any(TestAttempt.class))).thenAnswer(invocation -> {
            TestAttempt ta = invocation.getArgument(0);
            ta.setId("attempt-123");
            return ta;
        });

        TestAttemptStartRequest req = new TestAttemptStartRequest("test-toeic-1", "FULL", null, "AFTER_TEST", null);
        TestAttemptStartResponse res = testAttemptService.startAttempt("user-1", req);

        assertNotNull(res);
        assertEquals("attempt-123", res.testAttemptId());
        assertEquals("FULL", res.mode());
        assertEquals(7, res.selectedParts().size());
        assertEquals(7200, res.timeLimitSeconds());
        assertNotNull(res.deadlineAt());
        assertEquals(11, toeicTest.getAttemptCount()); // 10 -> 11
        verify(testAccessService).validateCanTakeTest("user-1", toeicTest);
    }

    @Test
    @DisplayName("Bắt đầu lượt làm bài PRACTICE chỉ chọn Part 5 và Part 7")
    void testStartPracticeAttempt() {
        when(toeicTestRepository.findById("test-toeic-1")).thenReturn(Optional.of(toeicTest));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(sevenParts);
        when(testAttemptRepository.save(any(TestAttempt.class))).thenAnswer(invocation -> {
            TestAttempt ta = invocation.getArgument(0);
            ta.setId("attempt-456");
            return ta;
        });

        TestAttemptStartRequest req = new TestAttemptStartRequest("test-toeic-1", "PRACTICE", List.of(5, 7), "AFTER_TEST", null);
        TestAttemptStartResponse res = testAttemptService.startAttempt("user-1", req);

        assertEquals("attempt-456", res.testAttemptId());
        assertEquals("PRACTICE", res.mode());
        assertEquals(List.of(5, 7), res.selectedParts());
        // Part 5 (960s) + Part 7 (2940s) = 3900s
        assertEquals(3900, res.timeLimitSeconds());
    }

    @Test
    @DisplayName("Lưu nháp và tải lại nội dung đề thi kèm draft answers an toàn (không lộ đáp án đúng)")
    void testSaveDraftAndGetContent() {
        TestAttempt attempt = TestAttempt.builder()
                .id("attempt-789")
                .user(user)
                .test(toeicTest)
                .mode("PRACTICE")
                .selectedParts("5")
                .status("IN_PROGRESS")
                .timeLimitSeconds(960)
                .startedAt(LocalDateTime.now())
                .deadlineAt(LocalDateTime.now().plusSeconds(960))
                .build();

        when(testAttemptRepository.findById("attempt-789")).thenReturn(Optional.of(attempt));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(sevenParts);

        Question q = Question.builder().id("q-1").promptText("Select option").questionKind("MULTIPLE_CHOICE").build();
        when(questionRepository.findByContentItemIdWithMedia(anyString())).thenReturn(List.of(q));
        when(questionService.toStudentDtos(anyList())).thenReturn(List.of(
                QuestionDto.build(q, List.of(new AnswerOptionDto("opt-1", "A", "Apple", null)), null, null, null, null, null)
        ));

        // 1. Lưu nháp
        Map<String, String> answers = Map.of("q-1", "opt-1");
        testAttemptService.saveDraft("user-1", "attempt-789", new TestAttemptSaveDraftRequest(answers));
        assertNotNull(attempt.getDraftAnswers());
        assertTrue(attempt.getDraftAnswers().contains("opt-1"));

        // 2. Lấy nội dung đề thi
        TestContentDto content = testAttemptService.getAttemptContent("user-1", "attempt-789");
        assertEquals("attempt-789", content.testAttemptId());
        assertEquals(1, content.parts().size());
        assertEquals(5, content.parts().get(0).partNo());
        assertEquals("opt-1", content.draftAnswers().get("q-1"));
        // Đáp án trả về cho học viên KHÔNG có isCorrect
        assertNull(content.parts().get(0).questions().get(0).options().get(0).isCorrect());
    }

    @Test
    @DisplayName("Nộp bài FULL hoàn chỉnh 7 part: quy đổi thang điểm TOEIC 10..990 và lưu Attempt từng part")
    void testSubmitFullAttemptETSScale() {
        TestAttempt attempt = TestAttempt.builder()
                .id("attempt-full")
                .user(user)
                .test(toeicTest)
                .mode("FULL")
                .selectedParts("1,2,3,4,5,6,7")
                .status("IN_PROGRESS")
                .startedAt(LocalDateTime.now().minusMinutes(60))
                .deadlineAt(LocalDateTime.now().plusMinutes(60))
                .build();

        when(testAttemptRepository.findById("attempt-full")).thenReturn(Optional.of(attempt));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(sevenParts);

        // Tạo 1 câu hỏi cho mỗi part
        List<Question> questions = new ArrayList<>();
        Map<String, String> submittedAnswers = new HashMap<>();

        for (int i = 1; i <= 7; i++) {
            String qId = "q-p" + i;
            Question q = Question.builder().id(qId).promptText("Question P" + i).questionKind("MULTIPLE_CHOICE").build();
            questions.add(q);

            AnswerOption correctOpt = AnswerOption.builder().id("opt-correct-" + i).question(q).isCorrect(true).build();
            when(questionRepository.findByContentItemIdWithMedia("item-part-" + i)).thenReturn(List.of(q));
            when(answerOptionRepository.findByQuestionIdOrderByLabelAsc(qId)).thenReturn(List.of(correctOpt));

            submittedAnswers.put(qId, "opt-correct-" + i);
        }

        TestAttemptResultDto result = testAttemptService.submitAttempt("user-1", "attempt-full",
                new TestAttemptSubmitRequest(null, submittedAnswers));

        assertEquals("COMPLETED", result.status());
        assertEquals(7, result.totalQuestions());
        assertEquals(7, result.totalCorrect());
        assertEquals(4, result.rawListeningCorrect()); // Parts 1..4 (4 câu)
        assertEquals(3, result.rawReadingCorrect());   // Parts 5..7 (3 câu)

        // Quy đổi theo thang ETS: Listening 4 câu đúng = 5; Reading 3 câu đúng = 5; Total = 10
        assertNotNull(result.scoreListening());
        assertNotNull(result.scoreReading());
        assertNotNull(result.scoreTotal());
        assertEquals(10, result.scoreTotal());

        // Kiểm tra đã lưu 7 Attempt cho 7 part
        verify(attemptRepository, times(7)).save(any(Attempt.class));
        verify(testAttemptRepository).save(attempt);
    }

    @Test
    @DisplayName("Nộp bài luyện tập (PRACTICE) không quy đổi thang 10..990")
    void testSubmitPracticeAttempt() {
        TestAttempt attempt = TestAttempt.builder()
                .id("attempt-prac")
                .user(user)
                .test(toeicTest)
                .mode("PRACTICE")
                .selectedParts("5,6")
                .status("IN_PROGRESS")
                .startedAt(LocalDateTime.now().minusMinutes(10))
                .deadlineAt(LocalDateTime.now().plusMinutes(20))
                .build();

        when(testAttemptRepository.findById("attempt-prac")).thenReturn(Optional.of(attempt));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(sevenParts);

        Question q5 = Question.builder().id("q-5").promptText("Q5").questionKind("MULTIPLE_CHOICE").build();
        Question q6 = Question.builder().id("q-6").promptText("Q6").questionKind("MULTIPLE_CHOICE").build();

        when(questionRepository.findByContentItemIdWithMedia("item-part-5")).thenReturn(List.of(q5));
        when(questionRepository.findByContentItemIdWithMedia("item-part-6")).thenReturn(List.of(q6));

        AnswerOption opt5 = AnswerOption.builder().id("opt-5").question(q5).isCorrect(true).build();
        AnswerOption opt6 = AnswerOption.builder().id("opt-6").question(q6).isCorrect(true).build();

        when(answerOptionRepository.findByQuestionIdOrderByLabelAsc("q-5")).thenReturn(List.of(opt5));
        when(answerOptionRepository.findByQuestionIdOrderByLabelAsc("q-6")).thenReturn(List.of(opt6));

        TestAttemptResultDto result = testAttemptService.submitAttempt("user-1", "attempt-prac",
                new TestAttemptSubmitRequest(null, Map.of("q-5", "opt-5", "q-6", "opt-6")));

        assertEquals("COMPLETED", result.status());
        assertEquals(2, result.totalQuestions());
        assertEquals(2, result.totalCorrect());
        // Chế độ PRACTICE hoặc không đủ 7 part: scaled scores là null
        assertNull(result.scoreTotal());
        assertNull(result.scoreListening());
        assertNull(result.scoreReading());
    }

    @Test
    @DisplayName("Nộp bài trễ quá deadline (vượt qua cả 15 giây ân hạn): chuyển status thành TIMED_OUT")
    void testSubmitAfterGracePeriodTimesOut() {
        TestAttempt attempt = TestAttempt.builder()
                .id("attempt-late")
                .user(user)
                .test(toeicTest)
                .mode("PRACTICE")
                .selectedParts("5")
                .status("IN_PROGRESS")
                .startedAt(LocalDateTime.now().minusMinutes(60))
                .deadlineAt(LocalDateTime.now().minusSeconds(30)) // Quá hạn 30s (> 15s ân hạn)
                .build();

        when(testAttemptRepository.findById("attempt-late")).thenReturn(Optional.of(attempt));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(sevenParts);
        when(questionRepository.findByContentItemIdWithMedia("item-part-5")).thenReturn(List.of());

        TestAttemptResultDto result = testAttemptService.submitAttempt("user-1", "attempt-late",
                new TestAttemptSubmitRequest(null, Map.of()));

        assertEquals("TIMED_OUT", result.status());
        assertEquals("TIMED_OUT", attempt.getStatus());
    }

    @Test
    @DisplayName("Tái sử dụng lượt thi đang làm dở nếu cùng cấu hình và chưa hết hạn")
    void testResumeActiveAttempt() {
        TestAttempt activeAttempt = TestAttempt.builder()
                .id("attempt-active-1")
                .user(user)
                .test(toeicTest)
                .mode("FULL")
                .selectedParts("1,2,3,4,5,6,7")
                .feedbackMode("AFTER_TEST")
                .timeLimitSeconds(7200)
                .startedAt(LocalDateTime.now().minusMinutes(10))
                .deadlineAt(LocalDateTime.now().plusMinutes(110))
                .status("IN_PROGRESS")
                .build();

        when(toeicTestRepository.findById("test-toeic-1")).thenReturn(Optional.of(toeicTest));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(toeicTestPartRepository.findByTestIdOrderByPartNoAsc("test-toeic-1")).thenReturn(sevenParts);
        when(testAttemptRepository.findFirstByUserIdAndTestIdAndStatusOrderByStartedAtDesc("user-1", "test-toeic-1", "IN_PROGRESS"))
                .thenReturn(Optional.of(activeAttempt));

        TestAttemptStartRequest req = new TestAttemptStartRequest("test-toeic-1", "FULL", null, "AFTER_TEST", null);
        TestAttemptStartResponse res = testAttemptService.startAttempt("user-1", req);

        assertEquals("attempt-active-1", res.testAttemptId());
        verify(testAttemptRepository, never()).save(any(TestAttempt.class));
    }
}
