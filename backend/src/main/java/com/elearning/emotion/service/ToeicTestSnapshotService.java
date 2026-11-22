package com.elearning.emotion.service;

import com.elearning.emotion.dto.test.TeacherTestStatsDto;
import com.elearning.emotion.dto.test.ToeicTestDto;
import com.elearning.emotion.dto.test.ToeicTestPublishPartRequest;
import com.elearning.emotion.dto.test.ToeicTestPublishRequest;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ToeicTestSnapshotService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ContentItemRepository contentItemRepository;
    private final PassageRepository passageRepository;
    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final TextAnswerRepository textAnswerRepository;
    private final MatchingPairRepository matchingPairRepository;
    private final WordChoicePairRepository wordChoicePairRepository;
    private final DragDropOptionRepository dragDropOptionRepository;
    private final ToeicTestRepository toeicTestRepository;
    private final ToeicTestPartRepository toeicTestPartRepository;
    private final TestAttemptRepository testAttemptRepository;
    private final CourseAccessService courseAccessService;
    private final RealtimePublisher realtimePublisher;

    /**
     * Sao chép (Snapshot) đề thi từ khóa học của GV vào khóa chứa đề ẩn (profile=EXAM)
     * Dùng chung MediaAsset, tạo bản ghi toeic_tests ở trạng thái DRAFT.
     */
    @Transactional
    public ToeicTestDto snapshotFromCourse(String teacherId, ToeicTestPublishRequest req) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + teacherId));

        Course sourceCourse = courseRepository.findById(req.sourceCourseId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học gốc: " + req.sourceCourseId()));

        boolean isOwner = sourceCourse.getTeacher() != null && teacherId.equals(sourceCourse.getTeacher().getId());
        boolean isAdmin = courseAccessService.isAdmin(teacherId);

        if (!isOwner && !isAdmin) {
            throw new SecurityException("Bạn không có quyền đăng đề từ khóa học này");
        }

        // 1. Tìm hoặc tạo khóa chứa đề ẩn của giảng viên (profile = EXAM)
        Course containerCourse = courseRepository.findFirstByTeacherIdAndProfile(teacherId, "EXAM")
                .orElseGet(() -> {
                    Course c = Course.builder()
                            .teacher(teacher)
                            .title("Kho chứa đề TOEIC - " + teacher.getFullName())
                            .description("Khóa chứa đề ẩn lưu trữ bản sao đề thi công khai")
                            .profile("EXAM")
                            .status("PUBLISHED")
                            .build();
                    return courseRepository.save(c);
                });

        // 2. Xác định phiên bản và đề gốc (nếu có cập nhật bản mới)
        ToeicTest originTest = null;
        int version = 1;
        if (req.originTestId() != null && !req.originTestId().isBlank()) {
            originTest = toeicTestRepository.findById(req.originTestId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề gốc: " + req.originTestId()));
            if (!originTest.getAuthor().getId().equals(teacherId) && !isAdmin) {
                throw new SecurityException("Không có quyền tạo phiên bản mới cho đề thi này");
            }
            version = (originTest.getVersion() != null ? originTest.getVersion() : 1) + 1;
        }

        // Chống trùng lặp tiêu đề đề thi đang chờ duyệt hoặc đã xuất bản
        List<String> activeStatuses = List.of("PENDING_REVIEW", "PUBLISHED");
        boolean isDuplicate = (originTest != null)
                ? toeicTestRepository.existsByAuthorIdAndTitleIgnoreCaseAndStatusInAndIdNot(
                        teacherId, req.title().trim(), activeStatuses, originTest.getId())
                : toeicTestRepository.existsByAuthorIdAndTitleIgnoreCaseAndStatusIn(
                        teacherId, req.title().trim(), activeStatuses);

        if (isDuplicate) {
            throw new IllegalArgumentException("Bạn đã có đề thi mang tiêu đề \"" + req.title().trim() + "\" đang chờ duyệt hoặc đã xuất bản. Vui lòng đổi tiêu đề hoặc tạo bản cập nhật phiên bản mới.");
        }

        // 3. Tạo bản ghi ToeicTest trạng thái DRAFT
        String source = isAdmin ? "SYSTEM" : "COMMUNITY";
        ToeicTest test = ToeicTest.builder()
                .source(source)
                .author(teacher)
                .course(containerCourse)
                .title(req.title().trim())
                .description(req.description())
                .status("DRAFT")
                .originTest(originTest)
                .version(version)
                .listeningMinutes(req.listeningMinutes() != null ? req.listeningMinutes() : 45)
                .readingMinutes(req.readingMinutes() != null ? req.readingMinutes() : 75)
                .attemptCount(0)
                .build();
        test = toeicTestRepository.save(test);

        // 4. Sao chép (Snapshot) từng phần thi (Part)
        List<ToeicTestPart> savedParts = new ArrayList<>();
        for (ToeicTestPublishPartRequest partReq : req.parts()) {
            ContentItem sourceItem = contentItemRepository.findById(partReq.sourceContentItemId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hoạt động: " + partReq.sourceContentItemId()));

            if (!sourceItem.getCourse().getId().equals(sourceCourse.getId())) {
                throw new IllegalArgumentException("Phần thi không thuộc khóa học nguồn");
            }

            // Tạo ContentItem bản sao trong container course
            ContentItem clonedItem = ContentItem.builder()
                    .course(containerCourse)
                    .sectionCode("PART" + partReq.partNo())
                    .type("PRACTICE_TEST")
                    .title(req.title() + " - Part " + partReq.partNo() + " (v" + version + ")")
                    .orderIndex(partReq.partNo())
                    .timeLimitMinutes(sourceItem.getTimeLimitMinutes())
                    .build();
            clonedItem = contentItemRepository.save(clonedItem);

            // Sao chép Passages (dùng chung MediaAsset)
            List<Passage> sourcePassages = passageRepository.findByContentItemIdWithMedia(sourceItem.getId());
            Map<String, Passage> clonedPassageByOrigId = new HashMap<>();

            for (Passage sp : sourcePassages) {
                Passage clonedP = Passage.builder()
                        .contentItem(clonedItem)
                        .transcriptHtml(sp.getTranscriptHtml())
                        .passageHtml(sp.getPassageHtml())
                        .audio(sp.getAudio()) // Tái sử dụng MediaAsset
                        .image(sp.getImage()) // Tái sử dụng MediaAsset
                        .orderIndex(sp.getOrderIndex())
                        .status("ACTIVE")
                        .build();
                clonedP = passageRepository.save(clonedP);
                clonedPassageByOrigId.put(sp.getId(), clonedP);
            }

            // Sao chép Questions & Options (dùng chung MediaAsset)
            List<Question> sourceQuestions = questionRepository.findByContentItemIdWithMedia(sourceItem.getId()).stream()
                    .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                    .toList();

            int questionCount = 0;
            for (Question sq : sourceQuestions) {
                Passage clonedPassage = (sq.getPassage() != null)
                        ? clonedPassageByOrigId.get(sq.getPassage().getId())
                        : null;

                Question clonedQ = Question.builder()
                        .contentItem(clonedItem)
                        .passage(clonedPassage)
                        .promptText(sq.getPromptText())
                        .questionKind(sq.getQuestionKind())
                        .explanation(sq.getExplanation())
                        .orderIndex(sq.getOrderIndex())
                        .tag(sq.getTag())
                        .audio(sq.getAudio()) // Tái sử dụng MediaAsset
                        .image(sq.getImage()) // Tái sử dụng MediaAsset
                        .status("ACTIVE")
                        .build();
                clonedQ = questionRepository.save(clonedQ);
                questionCount++;

                // Sao chép các dạng đáp án tùy loại câu hỏi
                if ("MULTIPLE_CHOICE".equalsIgnoreCase(sq.getQuestionKind())) {
                    List<AnswerOption> origOptions = answerOptionRepository.findByQuestionIdOrderByLabelAsc(sq.getId());
                    for (AnswerOption o : origOptions) {
                        answerOptionRepository.save(AnswerOption.builder()
                                .question(clonedQ)
                                .label(o.getLabel())
                                .content(o.getContent())
                                .isCorrect(o.getIsCorrect())
                                .build());
                    }
                } else if ("FILL_BLANK".equalsIgnoreCase(sq.getQuestionKind()) || "DICTATION".equalsIgnoreCase(sq.getQuestionKind())) {
                    final Question finalClonedQ = clonedQ;
                    textAnswerRepository.findByQuestionId(sq.getId()).ifPresent(ta ->
                            textAnswerRepository.save(TextAnswer.builder()
                                    .question(finalClonedQ)
                                    .correctText(ta.getCorrectText())
                                    .hint(ta.getHint())
                                    .build())
                    );
                } else if ("MATCHING".equalsIgnoreCase(sq.getQuestionKind())) {
                    List<MatchingPair> pairs = matchingPairRepository.findByQuestionId(sq.getId());
                    for (MatchingPair p : pairs) {
                        matchingPairRepository.save(MatchingPair.builder()
                                .question(clonedQ)
                                .leftContent(p.getLeftContent())
                                .rightContent(p.getRightContent())
                                .build());
                    }
                } else if ("WORD_CHOICE".equalsIgnoreCase(sq.getQuestionKind()) || "SENTENCE_FILL".equalsIgnoreCase(sq.getQuestionKind())) {
                    List<WordChoicePair> wcp = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(sq.getId());
                    for (WordChoicePair pair : wcp) {
                        wordChoicePairRepository.save(WordChoicePair.builder()
                                .question(clonedQ)
                                .optionA(pair.getOptionA())
                                .optionB(pair.getOptionB())
                                .correctOption(pair.getCorrectOption())
                                .orderIndex(pair.getOrderIndex())
                                .build());
                    }
                } else if ("DRAG_DROP".equalsIgnoreCase(sq.getQuestionKind())) {
                    List<DragDropOption> ddo = dragDropOptionRepository.findByQuestionIdOrderByDisplayOrder(sq.getId());
                    for (DragDropOption d : ddo) {
                        dragDropOptionRepository.save(DragDropOption.builder()
                                .question(clonedQ)
                                .text(d.getText())
                                .blankOrder(d.getBlankOrder())
                                .displayOrder(d.getDisplayOrder())
                                .build());
                    }
                }
            }

            ToeicTestPart part = ToeicTestPart.builder()
                    .test(test)
                    .partNo(partReq.partNo())
                    .contentItem(clonedItem)
                    .questionCount(questionCount)
                    .build();
            savedParts.add(toeicTestPartRepository.save(part));
        }

        return ToeicTestDto.from(test, savedParts);
    }

    /**
     * Gửi duyệt đề thi (DRAFT / REJECTED -> PENDING_REVIEW)
     */
    @Transactional
    public ToeicTestDto submitForReview(String teacherId, String testId) {
        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi"));

        if (!test.getAuthor().getId().equals(teacherId) && !courseAccessService.isAdmin(teacherId)) {
            throw new SecurityException("Bạn không có quyền gửi duyệt đề thi này");
        }

        if (!"DRAFT".equalsIgnoreCase(test.getStatus()) && !"REJECTED".equalsIgnoreCase(test.getStatus())) {
            throw new IllegalStateException("Chỉ đề thi ở trạng thái Nháp hoặc Bị từ chối mới có thể gửi duyệt");
        }

        test.setStatus("PENDING_REVIEW");
        test.setRejectionReason(null);
        test = toeicTestRepository.save(test);

        // Realtime: báo cho Admin biết có đề thi mới chờ duyệt (không cần F5)
        publishTestModeration(test, "SUBMITTED");

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        return ToeicTestDto.from(test, parts);
    }

    /**
     * Rút yêu cầu duyệt (PENDING_REVIEW -> DRAFT) hoặc Ẩn / Hiện đề thi đã xuất bản
     */
    @Transactional
    public ToeicTestDto toggleStatusOrWithdraw(String teacherId, String testId) {
        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi"));

        if (!test.getAuthor().getId().equals(teacherId) && !courseAccessService.isAdmin(teacherId)) {
            throw new SecurityException("Không có quyền thao tác trên đề thi này");
        }

        if ("PENDING_REVIEW".equalsIgnoreCase(test.getStatus())) {
            test.setStatus("DRAFT");
        } else if ("PUBLISHED".equalsIgnoreCase(test.getStatus())) {
            test.setStatus("HIDDEN");
        } else if ("HIDDEN".equalsIgnoreCase(test.getStatus())) {
            test.setStatus("PUBLISHED");
        } else {
            throw new IllegalStateException("Không thể chuyển đổi trạng thái từ: " + test.getStatus());
        }

        test = toeicTestRepository.save(test);

        // Realtime: rút yêu cầu duyệt / ẩn / hiện lại -> Admin tự cập nhật danh sách
        publishTestModeration(test, "STATUS_CHANGED");

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        return ToeicTestDto.from(test, parts);
    }

    /**
     * Phát tín hiệu Realtime tới toàn bộ Admin khi trạng thái đề thi thay đổi.
     * Sự kiện chỉ được broadcast sau khi transaction commit (xem RealtimeEventListener).
     */
    private void publishTestModeration(ToeicTest test, String action) {
        try {
            realtimePublisher.publishToModerationStaff("test-moderation", Map.of(
                    "testId", test.getId(),
                    "status", test.getStatus() != null ? test.getStatus() : "",
                    "action", action));
            log.info("[Realtime] Đã xếp hàng sự kiện test-moderation (action={}, testId={}, status={}) tới role ADMIN",
                    action, test.getId(), test.getStatus());
        } catch (Exception ex) {
            log.warn("Không thể phát realtime test-moderation cho đề {}: {}", test.getId(), ex.getMessage());
        }
    }

    /**
     * Danh sách đề thi do giảng viên đóng góp
     */
    @Transactional(readOnly = true)
    public Page<ToeicTestDto> listTeacherTests(String teacherId, Pageable pageable) {
        Page<ToeicTest> page = toeicTestRepository.findByAuthorIdOrderByCreatedAtDesc(teacherId, pageable);
        List<String> testIds = page.getContent().stream().map(ToeicTest::getId).toList();

        Map<String, List<ToeicTestPart>> partsByTestId = testIds.isEmpty() ? Map.of()
                : testIds.stream()
                .collect(Collectors.toMap(id -> id, toeicTestPartRepository::findByTestIdOrderByPartNoAsc));

        return page.map(t -> ToeicTestDto.from(t, partsByTestId.getOrDefault(t.getId(), List.of())));
    }

    /**
     * Thống kê tổng quan và chi tiết điểm bài thi cho Giảng viên
     */
    @Transactional(readOnly = true)
    public TeacherTestStatsDto getTeacherTestStats(String teacherId) {
        List<ToeicTest> allTests = toeicTestRepository.findByAuthorId(teacherId);

        long totalTests = allTests.size();
        long publishedTests = allTests.stream().filter(t -> "PUBLISHED".equalsIgnoreCase(t.getStatus())).count();
        long pendingTests = allTests.stream().filter(t -> "PENDING_REVIEW".equalsIgnoreCase(t.getStatus())).count();

        long totalAttempts = testAttemptRepository.countCompletedByAuthorId(teacherId);
        Double overallAvg = testAttemptRepository.getOverallAverageScoreByAuthorId(teacherId);

        List<TeacherTestStatsDto.TeacherTestSummaryItemDto> summaries = allTests.stream().map(t -> {
            long attempts = testAttemptRepository.countByTestIdAndStatus(t.getId(), "COMPLETED");
            Double avgScore = testAttemptRepository.getAverageScoreByTestId(t.getId());
            Double avgL = testAttemptRepository.getAverageListeningScoreByTestId(t.getId());
            Double avgR = testAttemptRepository.getAverageReadingScoreByTestId(t.getId());

            return new TeacherTestStatsDto.TeacherTestSummaryItemDto(
                    t.getId(),
                    t.getTitle(),
                    t.getStatus(),
                    t.getVersion(),
                    attempts,
                    avgScore != null ? Math.round(avgScore * 10.0) / 10.0 : null,
                    avgL != null ? Math.round(avgL * 10.0) / 10.0 : null,
                    avgR != null ? Math.round(avgR * 10.0) / 10.0 : null,
                    t.getPublishedAt()
            );
        }).toList();

        return new TeacherTestStatsDto(
                totalTests,
                publishedTests,
                pendingTests,
                totalAttempts,
                overallAvg != null ? Math.round(overallAvg * 10.0) / 10.0 : null,
                summaries
        );
    }
}
