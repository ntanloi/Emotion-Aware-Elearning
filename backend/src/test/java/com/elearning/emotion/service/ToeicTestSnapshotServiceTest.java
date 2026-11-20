package com.elearning.emotion.service;

import com.elearning.emotion.dto.test.ToeicTestDto;
import com.elearning.emotion.dto.test.ToeicTestPublishPartRequest;
import com.elearning.emotion.dto.test.ToeicTestPublishRequest;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
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
class ToeicTestSnapshotServiceTest {

    @Mock
    private CourseRepository courseRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContentItemRepository contentItemRepository;
    @Mock
    private PassageRepository passageRepository;
    @Mock
    private QuestionRepository questionRepository;
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
    private ToeicTestRepository toeicTestRepository;
    @Mock
    private ToeicTestPartRepository toeicTestPartRepository;
    @Mock
    private TestAttemptRepository testAttemptRepository;
    @Mock
    private CourseAccessService courseAccessService;
    @Mock
    private com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    @InjectMocks
    private ToeicTestSnapshotService toeicTestSnapshotService;

    private User teacher;
    private Course sourceCourse;
    private ContentItem sourceItem;

    @BeforeEach
    void setUp() {
        teacher = User.builder().id("teacher-1").fullName("Thầy Nam").build();
        sourceCourse = Course.builder().id("course-orig").teacher(teacher).title("TOEIC 750+ Cấp tốc").build();
        sourceItem = ContentItem.builder()
                .id("item-p5")
                .course(sourceCourse)
                .sectionCode("PART5")
                .type("PRACTICE_TEST")
                .title("Part 5 Test 01")
                .timeLimitMinutes(16)
                .build();
    }

    @Test
    @DisplayName("Snapshot đề thi từ khóa học: sao chép vào container course (profile=EXAM) ở trạng thái DRAFT")
    void testSnapshotFromCourse() {
        when(userRepository.findById("teacher-1")).thenReturn(Optional.of(teacher));
        when(courseRepository.findById("course-orig")).thenReturn(Optional.of(sourceCourse));
        when(courseRepository.findFirstByTeacherIdAndProfile("teacher-1", "EXAM")).thenReturn(Optional.empty());

        Course containerCourse = Course.builder()
                .id("container-exam-1")
                .teacher(teacher)
                .profile("EXAM")
                .build();
        when(courseRepository.save(any(Course.class))).thenReturn(containerCourse);

        when(contentItemRepository.findById("item-p5")).thenReturn(Optional.of(sourceItem));

        ContentItem clonedItem = ContentItem.builder().id("cloned-p5").build();
        when(contentItemRepository.save(any(ContentItem.class))).thenReturn(clonedItem);

        // Giả lập câu hỏi và đáp án gốc
        MediaAsset audioAsset = MediaAsset.builder().id("audio-asset-1").url("audio.mp3").build();
        Question origQ = Question.builder()
                .id("q-orig-1")
                .promptText("Choose best answer")
                .questionKind("MULTIPLE_CHOICE")
                .audio(audioAsset)
                .build();
        when(questionRepository.findByContentItemIdWithMedia("item-p5")).thenReturn(List.of(origQ));

        Question clonedQ = Question.builder().id("cloned-q-1").audio(audioAsset).build();
        when(questionRepository.save(any(Question.class))).thenReturn(clonedQ);

        AnswerOption origOpt = AnswerOption.builder().id("opt-orig-1").label("A").content("Answer A").isCorrect(true).build();
        when(answerOptionRepository.findByQuestionIdOrderByLabelAsc("q-orig-1")).thenReturn(List.of(origOpt));

        ToeicTest savedTest = ToeicTest.builder()
                .id("toeic-test-1")
                .author(teacher)
                .source("COMMUNITY")
                .status("DRAFT")
                .version(1)
                .title("Đề thi thử TOEIC Thầy Nam")
                .build();
        when(toeicTestRepository.save(any(ToeicTest.class))).thenReturn(savedTest);

        ToeicTestPublishRequest req = new ToeicTestPublishRequest(
                "course-orig",
                "Đề thi thử TOEIC Thầy Nam",
                "Đề thi biên soạn bám sát cấu trúc mới",
                List.of(new ToeicTestPublishPartRequest(5, "item-p5")),
                45, 75, null
        );

        ToeicTestDto dto = toeicTestSnapshotService.snapshotFromCourse("teacher-1", req);

        assertNotNull(dto);
        assertEquals("toeic-test-1", dto.id());
        assertEquals("DRAFT", dto.status());
        assertEquals("COMMUNITY", dto.source());
        assertEquals("Thầy Nam", dto.authorName());

        // Kiểm tra cloned Question dùng chung MediaAsset
        verify(questionRepository).save(argThat(q ->
                q.getAudio() != null && "audio-asset-1".equals(q.getAudio().getId())
        ));

        // Kiểm tra đã lưu ToeicTestPart
        verify(toeicTestPartRepository).save(any(ToeicTestPart.class));
    }

    @Test
    @DisplayName("Giảng viên không sở hữu khóa học không được phép snapshot đề thi")
    void testUnauthorizedTeacherCannotSnapshot() {
        when(userRepository.findById("teacher-2")).thenReturn(Optional.of(User.builder().id("teacher-2").build()));
        when(courseRepository.findById("course-orig")).thenReturn(Optional.of(sourceCourse));
        when(courseAccessService.isAdmin("teacher-2")).thenReturn(false);

        ToeicTestPublishRequest req = new ToeicTestPublishRequest(
                "course-orig",
                "Tiêu đề",
                "Mô tả",
                List.of(new ToeicTestPublishPartRequest(5, "item-p5")),
                45, 75, null
        );

        assertThrows(SecurityException.class, () ->
                toeicTestSnapshotService.snapshotFromCourse("teacher-2", req)
        );
    }

    @Test
    @DisplayName("Gửi duyệt đề thi: chuyển trạng thái từ DRAFT sang PENDING_REVIEW")
    void testSubmitForReview() {
        ToeicTest draftTest = ToeicTest.builder()
                .id("test-draft")
                .author(teacher)
                .status("DRAFT")
                .build();
        when(toeicTestRepository.findById("test-draft")).thenReturn(Optional.of(draftTest));
        when(toeicTestRepository.save(any(ToeicTest.class))).thenAnswer(inv -> inv.getArgument(0));

        ToeicTestDto res = toeicTestSnapshotService.submitForReview("teacher-1", "test-draft");

        assertEquals("PENDING_REVIEW", res.status());
        assertNull(res.rejectionReason());
    }

    @Test
    @DisplayName("Chống trùng lặp: ném lỗi nếu giáo viên đã có đề thi cùng tên đang chờ duyệt hoặc đã xuất bản")
    void testDuplicateTitleBlocked() {
        when(userRepository.findById("teacher-1")).thenReturn(Optional.of(teacher));
        when(courseRepository.findById("course-orig")).thenReturn(Optional.of(sourceCourse));
        when(courseRepository.findFirstByTeacherIdAndProfile("teacher-1", "EXAM")).thenReturn(Optional.of(sourceCourse));
        when(toeicTestRepository.existsByAuthorIdAndTitleIgnoreCaseAndStatusIn(eq("teacher-1"), eq("Đề Trùng"), anyCollection()))
                .thenReturn(true);

        ToeicTestPublishRequest req = new ToeicTestPublishRequest(
                "course-orig",
                "Đề Trùng",
                "Mô tả",
                List.of(new ToeicTestPublishPartRequest(5, "item-p5")),
                45, 75, null
        );

        assertThrows(IllegalArgumentException.class, () ->
                toeicTestSnapshotService.snapshotFromCourse("teacher-1", req)
        );
    }

    @Test
    @DisplayName("Thống kê đề thi cho giáo viên: tính tổng đề, tổng lượt làm và điểm trung bình")
    void testGetTeacherTestStats() {
        ToeicTest t1 = ToeicTest.builder().id("t1").title("Đề 1").status("PUBLISHED").author(teacher).build();
        ToeicTest t2 = ToeicTest.builder().id("t2").title("Đề 2").status("PENDING_REVIEW").author(teacher).build();

        when(toeicTestRepository.findByAuthorId("teacher-1")).thenReturn(List.of(t1, t2));
        when(testAttemptRepository.countCompletedByAuthorId("teacher-1")).thenReturn(25L);
        when(testAttemptRepository.getOverallAverageScoreByAuthorId("teacher-1")).thenReturn(720.5);
        when(testAttemptRepository.countByTestIdAndStatus("t1", "COMPLETED")).thenReturn(20L);
        when(testAttemptRepository.getAverageScoreByTestId("t1")).thenReturn(750.0);

        var stats = toeicTestSnapshotService.getTeacherTestStats("teacher-1");

        assertEquals(2, stats.totalTests());
        assertEquals(1, stats.publishedTests());
        assertEquals(1, stats.pendingTests());
        assertEquals(25L, stats.totalAttempts());
        assertEquals(720.5, stats.overallAverageScore());
        assertEquals(2, stats.testSummaries().size());
    }
}
