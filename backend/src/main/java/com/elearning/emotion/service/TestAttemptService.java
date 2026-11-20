package com.elearning.emotion.service;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.dto.test.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.util.ToeicScoreConverter;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TestAttemptService {

    private final TestAttemptRepository testAttemptRepository;
    private final ToeicTestRepository toeicTestRepository;
    private final ToeicTestPartRepository toeicTestPartRepository;
    private final UserRepository userRepository;
    private final ContentItemRepository contentItemRepository;
    private final QuestionRepository questionRepository;
    private final PassageRepository passageRepository;
    private final QuestionService questionService;
    private final AnswerOptionRepository answerOptionRepository;
    private final TextAnswerRepository textAnswerRepository;
    private final MatchingPairRepository matchingPairRepository;
    private final WordChoicePairRepository wordChoicePairRepository;
    private final DragDropOptionRepository dragDropOptionRepository;
    private final AttemptRepository attemptRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final TestAccessService testAccessService;
    private final CourseAccessService courseAccessService;
    private final ObjectMapper objectMapper;

    /**
     * POST /api/test-attempts: Bắt đầu một lượt làm bài thi TOEIC
     */
    @Transactional
    public TestAttemptStartResponse startAttempt(String userId, TestAttemptStartRequest req) {
        if (req == null || req.testId() == null || req.testId().isBlank()) {
            throw new IllegalArgumentException("Mã đề thi không được để trống");
        }

        ToeicTest test = toeicTestRepository.findById(req.testId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + req.testId()));

        testAccessService.validateCanTakeTest(userId, test);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + userId));

        List<ToeicTestPart> testParts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        if (testParts.isEmpty()) {
            throw new IllegalArgumentException("Đề thi chưa có phần thi nào");
        }

        List<Integer> selectedParts;
        if (req.selectedParts() != null && !req.selectedParts().isEmpty()) {
            Set<Integer> availablePartNos = testParts.stream().map(ToeicTestPart::getPartNo).collect(Collectors.toSet());
            selectedParts = req.selectedParts().stream()
                    .filter(availablePartNos::contains)
                    .distinct()
                    .sorted()
                    .toList();
            if (selectedParts.isEmpty()) {
                throw new IllegalArgumentException("Các phần thi đã chọn không tồn tại trong đề thi");
            }
        } else {
            selectedParts = testParts.stream().map(ToeicTestPart::getPartNo).sorted().toList();
        }

        String mode = (req.mode() != null && !req.mode().isBlank())
                ? req.mode().trim().toUpperCase()
                : (selectedParts.size() == 7 ? "FULL" : "PRACTICE");

        String feedbackMode = (req.feedbackMode() != null && !req.feedbackMode().isBlank())
                ? req.feedbackMode().trim().toUpperCase()
                : "AFTER_TEST";

        int timeLimitSeconds;
        if (req.timeLimitSeconds() != null) {
            timeLimitSeconds = Math.max(0, req.timeLimitSeconds());
        } else if ("FULL".equalsIgnoreCase(mode) && selectedParts.size() == 7) {
            int listeningMin = test.getListeningMinutes() != null ? test.getListeningMinutes() : 45;
            int readingMin = test.getReadingMinutes() != null ? test.getReadingMinutes() : 75;
            timeLimitSeconds = (listeningMin + readingMin) * 60;
        } else {
            // Tính toán thời gian mặc định cho các part được chọn
            int totalSec = 0;
            for (Integer p : selectedParts) {
                totalSec += switch (p) {
                    case 1 -> 180;  // ~ 3 phút
                    case 2 -> 720;  // ~ 12 phút
                    case 3 -> 1080; // ~ 18 phút
                    case 4 -> 900;  // ~ 15 phút
                    case 5 -> 960;  // ~ 16 phút
                    case 6 -> 600;  // ~ 10 phút
                    case 7 -> 2940; // ~ 49 phút
                    default -> 600;
                };
            }
            timeLimitSeconds = totalSec;
        }

        LocalDateTime startedAt = LocalDateTime.now();
        LocalDateTime deadlineAt = (timeLimitSeconds > 0) ? startedAt.plusSeconds(timeLimitSeconds) : null;

        String selectedPartsStr = selectedParts.stream().map(String::valueOf).collect(Collectors.joining(","));

        // Chống lạm dụng & Rate Limiting: tối đa 10 lượt bắt đầu trong vòng 1 phút
        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
        long recentStarts = testAttemptRepository.countByUserIdAndStartedAtAfter(userId, oneMinuteAgo);
        if (recentStarts >= 10) {
            throw new IllegalArgumentException("Bạn đang tạo lượt làm bài quá nhanh. Vui lòng chờ giây lát rồi thử lại.");
        }

        // Tái sử dụng lượt đang làm dở nếu cùng cấu hình và chưa hết giờ (UX Resume)
        Optional<TestAttempt> activeOpt = testAttemptRepository
                .findFirstByUserIdAndTestIdAndStatusOrderByStartedAtDesc(userId, test.getId(), "IN_PROGRESS");
        if (activeOpt.isPresent()) {
            TestAttempt active = activeOpt.get();
            boolean isOverdue = active.getDeadlineAt() != null
                    && LocalDateTime.now().isAfter(active.getDeadlineAt().plusSeconds(10));
            if (!isOverdue && selectedPartsStr.equals(active.getSelectedParts()) && mode.equalsIgnoreCase(active.getMode())) {
                log.info("Học viên {} tiếp tục lượt làm dở {} của đề {}", userId, active.getId(), test.getId());
                return new TestAttemptStartResponse(
                        active.getId(),
                        test.getId(),
                        test.getTitle(),
                        active.getMode(),
                        selectedParts,
                        active.getFeedbackMode(),
                        active.getTimeLimitSeconds() != null ? active.getTimeLimitSeconds() : 0,
                        active.getStartedAt(),
                        active.getDeadlineAt()
                );
            } else {
                // Đã hết giờ hoặc đổi cấu hình -> Đóng lượt cũ
                active.setStatus("COMPLETED");
                active.setSubmittedAt(LocalDateTime.now());
                testAttemptRepository.save(active);
            }
        }

        TestAttempt attempt = TestAttempt.builder()
                .user(user)
                .test(test)
                .mode(mode)
                .selectedParts(selectedPartsStr)
                .feedbackMode(feedbackMode)
                .timeLimitSeconds(timeLimitSeconds)
                .startedAt(startedAt)
                .deadlineAt(deadlineAt)
                .status("IN_PROGRESS")
                .build();

        attempt = testAttemptRepository.save(attempt);

        // Tăng số lượt làm bài
        test.setAttemptCount((test.getAttemptCount() != null ? test.getAttemptCount() : 0) + 1);
        toeicTestRepository.save(test);

        return new TestAttemptStartResponse(
                attempt.getId(),
                test.getId(),
                test.getTitle(),
                attempt.getMode(),
                selectedParts,
                attempt.getFeedbackMode(),
                attempt.getTimeLimitSeconds(),
                attempt.getStartedAt(),
                attempt.getDeadlineAt()
        );
    }

    /**
     * GET /api/test-attempts/{id}/content: Lấy nội dung câu hỏi và bài đọc của lượt làm
     */
    @Transactional(readOnly = true)
    public TestContentDto getAttemptContent(String userId, String attemptId) {
        TestAttempt attempt = getAttemptAndVerifyAccess(userId, attemptId);

        Set<Integer> partSet = parseParts(attempt.getSelectedParts());
        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(attempt.getTest().getId())
                .stream()
                .filter(p -> partSet.contains(p.getPartNo()))
                .toList();

        List<TestPartContentDto> partDtos = new ArrayList<>();
        for (ToeicTestPart part : parts) {
            ContentItem item = part.getContentItem();
            List<PassageDto> passages = passageRepository.findByContentItemIdWithMedia(item.getId()).stream()
                    .filter(p -> p.getStatus() == null || "ACTIVE".equalsIgnoreCase(p.getStatus()))
                    .map(PassageDto::forStudent)
                    .toList();

            List<Question> questions = questionRepository.findByContentItemIdWithMedia(item.getId()).stream()
                    .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                    .toList();

            // toStudentDtos giấu toàn bộ đáp án đúng và lời giải thích
            List<QuestionDto> questionDtos = questionService.toStudentDtos(questions);

            partDtos.add(new TestPartContentDto(
                    part.getPartNo(),
                    item.getId(),
                    questions.size(),
                    passages,
                    questionDtos
            ));
        }

        Map<String, String> draftAnswers = parseDraftAnswers(attempt.getDraftAnswers());

        // Tính thời gian còn lại bằng cùng đồng hồ server đã dùng để tạo deadline,
        // để client không phải tự so sánh LocalDateTime (không kèm múi giờ) với giờ máy của mình.
        Long remainingSeconds = attempt.getDeadlineAt() != null
                ? Math.max(0L, java.time.Duration.between(LocalDateTime.now(), attempt.getDeadlineAt()).getSeconds())
                : null;

        log.info("[TestTimer] attempt={} status={} limit={}s now={} startedAt={} deadlineAt={} remaining={}s jvmZone={}",
                attempt.getId(), attempt.getStatus(), attempt.getTimeLimitSeconds(), LocalDateTime.now(),
                attempt.getStartedAt(), attempt.getDeadlineAt(), remainingSeconds, java.time.ZoneId.systemDefault());

        return new TestContentDto(
                attempt.getId(),
                attempt.getTest().getId(),
                attempt.getTest().getTitle(),
                attempt.getTest().getDescription(),
                attempt.getMode(),
                attempt.getFeedbackMode(),
                attempt.getTimeLimitSeconds(),
                attempt.getStartedAt(),
                attempt.getDeadlineAt(),
                remainingSeconds,
                attempt.getStatus(),
                partDtos,
                draftAnswers
        );
    }

    /**
     * POST /api/test-attempts/{id}/save: Lưu nháp đáp án đang làm
     */
    @Transactional
    public Map<String, Object> saveDraft(String userId, String attemptId, TestAttemptSaveDraftRequest req) {
        TestAttempt attempt = getAttemptAndVerifyAccess(userId, attemptId);

        if (!"IN_PROGRESS".equalsIgnoreCase(attempt.getStatus())) {
            throw new IllegalStateException("Lượt làm bài đã kết thúc, không thể lưu nháp");
        }

        String json = "{}";
        if (req != null && req.answers() != null) {
            try {
                json = objectMapper.writeValueAsString(req.answers());
            } catch (Exception e) {
                log.warn("Lỗi chuyển đổi draft answers thành JSON", e);
            }
        }

        attempt.setDraftAnswers(json);
        attempt.setUpdatedAt(LocalDateTime.now());
        testAttemptRepository.save(attempt);

        return Map.of("success", true, "savedAt", LocalDateTime.now());
    }

    /**
     * POST /api/test-attempts/{id}/submit: Nộp bài, chấm điểm và chuyển đổi thang TOEIC 10-990
     */
    @Transactional
    public TestAttemptResultDto submitAttempt(String userId, String attemptId, TestAttemptSubmitRequest req) {
        TestAttempt attempt = getAttemptAndVerifyAccess(userId, attemptId);

        if (!"IN_PROGRESS".equalsIgnoreCase(attempt.getStatus())) {
            throw new IllegalStateException("Lượt làm bài đã được nộp hoặc đã kết thúc");
        }

        // Kiểm tra quá hạn có khoảng ân hạn 15 giây
        boolean timedOut = attempt.getDeadlineAt() != null
                && LocalDateTime.now().isAfter(attempt.getDeadlineAt().plusSeconds(15));
        String finalStatus = timedOut ? "TIMED_OUT" : "COMPLETED";

        // Tổng hợp đáp án nộp: ưu tiên req.answers / req.answerMap, bổ sung draft nếu có
        Map<String, String> draftMap = parseDraftAnswers(attempt.getDraftAnswers());
        Map<String, String> resolvedAnswerMap = new HashMap<>(draftMap);

        if (req != null && req.answerMap() != null) {
            resolvedAnswerMap.putAll(req.answerMap());
        }

        Map<String, AnswerSubmission> submissionByQ = new HashMap<>();
        if (req != null && req.answers() != null) {
            for (AnswerSubmission ans : req.answers()) {
                if (ans.questionId() != null) {
                    submissionByQ.put(ans.questionId(), ans);
                    if (ans.selectedOptionId() != null && !ans.selectedOptionId().isBlank()) {
                        resolvedAnswerMap.put(ans.questionId(), ans.selectedOptionId());
                    } else if (ans.submittedText() != null && !ans.submittedText().isBlank()) {
                        resolvedAnswerMap.put(ans.questionId(), ans.submittedText());
                    }
                }
            }
        }

        Set<Integer> partSet = parseParts(attempt.getSelectedParts());
        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(attempt.getTest().getId())
                .stream()
                .filter(p -> partSet.contains(p.getPartNo()))
                .toList();

        int rawListeningCorrect = 0;
        int rawReadingCorrect = 0;
        int totalQuestions = 0;
        List<TestPartResultDto> partResults = new ArrayList<>();
        List<TestQuestionDetailDto> questionDetails = new ArrayList<>();

        for (ToeicTestPart part : parts) {
            ContentItem item = part.getContentItem();
            List<Question> questions = questionRepository.findByContentItemIdWithMedia(item.getId()).stream()
                    .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                    .toList();

            int partCorrect = 0;
            int partTotal = questions.size();
            totalQuestions += partTotal;

            List<AttemptAnswer> answersToSave = new ArrayList<>();

            for (Question q : questions) {
                boolean correct = false;
                String selectedOptId = null;
                String submittedTxt = null;
                String correctOptId = null;
                String correctTxt = null;
                List<AnswerOptionDto> optionsForDetail = List.of();

                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> options = answerOptionRepository.findByQuestionIdOrderByLabelAsc(q.getId());
                    optionsForDetail = options.stream().map(AnswerOptionDto::forTeacher).toList();
                    correctOptId = options.stream()
                            .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                            .map(AnswerOption::getId)
                            .findFirst()
                            .orElse(null);

                    String userSelected = resolvedAnswerMap.get(q.getId());
                    if (userSelected != null && !userSelected.isBlank()) {
                        selectedOptId = userSelected;
                        correct = userSelected.equals(correctOptId);
                    }
                } else if ("FILL_BLANK".equalsIgnoreCase(q.getQuestionKind()) || "DICTATION".equalsIgnoreCase(q.getQuestionKind())) {
                    var textAns = textAnswerRepository.findByQuestionId(q.getId()).orElse(null);
                    if (textAns != null) {
                        correctTxt = textAns.getCorrectText();
                        String userTxt = resolvedAnswerMap.get(q.getId());
                        if (userTxt != null && !userTxt.isBlank()) {
                            submittedTxt = userTxt;
                            correct = normalize(userTxt).equals(normalize(correctTxt));
                        }
                    }
                } else {
                    // Xử lý các loại câu hỏi khác nếu có (MATCHING, WORD_CHOICE...)
                    AnswerSubmission sub = submissionByQ.get(q.getId());
                    if (sub != null) {
                        correct = evaluateOtherQuestionKind(q, sub);
                        submittedTxt = ProgressService.extractSubmittedText(sub);
                    }
                }

                if (correct) {
                    partCorrect++;
                    if (part.getPartNo() <= 4) {
                        rawListeningCorrect++;
                    } else {
                        rawReadingCorrect++;
                    }
                }

                // Chi tiết câu hỏi phục vụ xem lại đáp án
                questionDetails.add(new TestQuestionDetailDto(
                        q.getId(),
                        part.getPartNo(),
                        q.getPromptText(),
                        selectedOptId,
                        submittedTxt,
                        correctOptId,
                        correctTxt,
                        correct,
                        q.getExplanation(),
                        optionsForDetail
                ));

                // Lưu AttemptAnswer để kết nối Sổ tay câu sai (Wrong Notebook)
                if (selectedOptId != null || submittedTxt != null) {
                    AnswerOption selectedOptionEntity = selectedOptId != null
                            ? answerOptionRepository.findById(selectedOptId).orElse(null)
                            : null;
                    answersToSave.add(AttemptAnswer.builder()
                            .question(q)
                            .selectedOption(selectedOptionEntity)
                            .submittedText(submittedTxt)
                            .isCorrect(correct)
                            .build());
                }
            }

            double partAccuracy = partTotal > 0 ? (partCorrect * 100.0) / partTotal : 0.0;
            partResults.add(new TestPartResultDto(part.getPartNo(), partTotal, partCorrect, partAccuracy));

            // Tạo Attempt từng part gắn test_attempt_id (BR-19 và SPEC)
            Attempt partAttempt = Attempt.builder()
                    .user(attempt.getUser())
                    .contentItem(item)
                    .testAttempt(attempt)
                    .score((float) partAccuracy)
                    .totalQuestions(partTotal)
                    .correctCount(partCorrect)
                    .submittedAt(LocalDateTime.now())
                    .build();
            attemptRepository.save(partAttempt);

            for (AttemptAnswer aa : answersToSave) {
                aa.setAttempt(partAttempt);
            }
            if (!answersToSave.isEmpty()) {
                attemptAnswerRepository.saveAll(answersToSave);
            }
        }

        int totalCorrect = rawListeningCorrect + rawReadingCorrect;
        Integer scoreListening = null;
        Integer scoreReading = null;
        Integer scoreTotal = null;

        // Chỉ quy đổi thang điểm TOEIC chuẩn 10-990 khi làm bài FULL đầy đủ 7 part
        if ("FULL".equalsIgnoreCase(attempt.getMode()) && partSet.size() == 7) {
            scoreListening = ToeicScoreConverter.convertListening(rawListeningCorrect);
            scoreReading = ToeicScoreConverter.convertReading(rawReadingCorrect);
            scoreTotal = scoreListening + scoreReading;
        }

        LocalDateTime submittedAt = LocalDateTime.now();
        int timeSpentSeconds = (int) ChronoUnit.SECONDS.between(attempt.getStartedAt(), submittedAt);

        attempt.setSubmittedAt(submittedAt);
        attempt.setStatus(finalStatus);
        attempt.setScoreListening(scoreListening);
        attempt.setScoreReading(scoreReading);
        attempt.setScoreTotal(scoreTotal);
        attempt.setRawListeningCorrect(rawListeningCorrect);
        attempt.setRawReadingCorrect(rawReadingCorrect);
        attempt.setTotalQuestions(totalQuestions);
        attempt.setTotalCorrect(totalCorrect);

        testAttemptRepository.save(attempt);

        return new TestAttemptResultDto(
                attempt.getId(),
                attempt.getTest().getId(),
                attempt.getTest().getTitle(),
                attempt.getMode(),
                attempt.getStatus(),
                scoreTotal,
                scoreListening,
                scoreReading,
                rawListeningCorrect,
                rawReadingCorrect,
                totalQuestions,
                totalCorrect,
                timeSpentSeconds,
                attempt.getStartedAt(),
                submittedAt,
                partResults,
                questionDetails
        );
    }

    /**
     * GET /api/test-attempts/{id}/result: Xem lại kết quả lượt làm bài
     */
    @Transactional(readOnly = true)
    public TestAttemptResultDto getAttemptResult(String userId, String attemptId) {
        TestAttempt attempt = getAttemptAndVerifyAccess(userId, attemptId);

        if ("IN_PROGRESS".equalsIgnoreCase(attempt.getStatus())) {
            throw new IllegalStateException("Lượt làm bài chưa kết thúc");
        }

        LocalDateTime submittedAt = attempt.getSubmittedAt() != null ? attempt.getSubmittedAt() : LocalDateTime.now();
        int timeSpentSeconds = (int) ChronoUnit.SECONDS.between(attempt.getStartedAt(), submittedAt);

        List<Attempt> partAttempts = attemptRepository.findByTestAttemptId(attempt.getId());
        List<String> partAttemptIds = partAttempts.stream().map(Attempt::getId).toList();

        Map<String, AttemptAnswer> answerByQuestionId = new HashMap<>();
        if (!partAttemptIds.isEmpty()) {
            List<AttemptAnswer> answers = attemptAnswerRepository.findByAttemptIdIn(partAttemptIds);
            for (AttemptAnswer aa : answers) {
                if (aa.getQuestion() != null) {
                    answerByQuestionId.put(aa.getQuestion().getId(), aa);
                }
            }
        }

        Set<Integer> partSet = parseParts(attempt.getSelectedParts());
        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(attempt.getTest().getId())
                .stream()
                .filter(p -> partSet.contains(p.getPartNo()))
                .toList();

        List<TestPartResultDto> partResults = new ArrayList<>();
        List<TestQuestionDetailDto> questionDetails = new ArrayList<>();

        for (ToeicTestPart part : parts) {
            ContentItem item = part.getContentItem();
            List<Question> questions = questionRepository.findByContentItemIdWithMedia(item.getId()).stream()
                    .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                    .toList();

            int partCorrect = 0;
            for (Question q : questions) {
                AttemptAnswer aa = answerByQuestionId.get(q.getId());
                boolean correct = aa != null && Boolean.TRUE.equals(aa.getIsCorrect());
                if (correct) partCorrect++;

                String selectedOptId = (aa != null && aa.getSelectedOption() != null) ? aa.getSelectedOption().getId() : null;
                String submittedTxt = aa != null ? aa.getSubmittedText() : null;

                String correctOptId = null;
                String correctTxt = null;
                List<AnswerOptionDto> optionsForDetail = List.of();

                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> options = answerOptionRepository.findByQuestionIdOrderByLabelAsc(q.getId());
                    optionsForDetail = options.stream().map(AnswerOptionDto::forTeacher).toList();
                    correctOptId = options.stream()
                            .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                            .map(AnswerOption::getId)
                            .findFirst()
                            .orElse(null);
                } else if ("FILL_BLANK".equalsIgnoreCase(q.getQuestionKind()) || "DICTATION".equalsIgnoreCase(q.getQuestionKind())) {
                    var textAns = textAnswerRepository.findByQuestionId(q.getId()).orElse(null);
                    if (textAns != null) {
                        correctTxt = textAns.getCorrectText();
                    }
                }

                questionDetails.add(new TestQuestionDetailDto(
                        q.getId(),
                        part.getPartNo(),
                        q.getPromptText(),
                        selectedOptId,
                        submittedTxt,
                        correctOptId,
                        correctTxt,
                        correct,
                        q.getExplanation(),
                        optionsForDetail
                ));
            }

            int partTotal = questions.size();
            double partAccuracy = partTotal > 0 ? (partCorrect * 100.0) / partTotal : 0.0;
            partResults.add(new TestPartResultDto(part.getPartNo(), partTotal, partCorrect, partAccuracy));
        }

        return new TestAttemptResultDto(
                attempt.getId(),
                attempt.getTest().getId(),
                attempt.getTest().getTitle(),
                attempt.getMode(),
                attempt.getStatus(),
                attempt.getScoreTotal(),
                attempt.getScoreListening(),
                attempt.getScoreReading(),
                attempt.getRawListeningCorrect(),
                attempt.getRawReadingCorrect(),
                attempt.getTotalQuestions(),
                attempt.getTotalCorrect(),
                timeSpentSeconds,
                attempt.getStartedAt(),
                attempt.getSubmittedAt(),
                partResults,
                questionDetails
        );
    }

    /**
     * GET /api/test-attempts/mine: Danh sách lịch sử làm bài của học viên
     */
    @Transactional(readOnly = true)
    public Page<TestAttemptSummaryDto> getMyAttempts(String userId, Pageable pageable) {
        return testAttemptRepository.findByUserIdOrderByStartedAtDesc(userId, pageable)
                .map(ta -> new TestAttemptSummaryDto(
                        ta.getId(),
                        ta.getTest().getId(),
                        ta.getTest().getTitle(),
                        ta.getMode(),
                        ta.getStatus(),
                        ta.getScoreTotal(),
                        ta.getScoreListening(),
                        ta.getScoreReading(),
                        ta.getTotalQuestions(),
                        ta.getTotalCorrect(),
                        ta.getStartedAt(),
                        ta.getSubmittedAt()
                ));
    }

    // ---------------- Helper Methods ----------------

    private TestAttempt getAttemptAndVerifyAccess(String userId, String attemptId) {
        TestAttempt attempt = testAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lượt làm bài: " + attemptId));

        if (!attempt.getUser().getId().equals(userId) && !courseAccessService.isAdmin(userId)) {
            throw new SecurityException("Không có quyền truy cập lượt làm bài này");
        }
        return attempt;
    }

    private Set<Integer> parseParts(String selectedParts) {
        if (selectedParts == null || selectedParts.isBlank()) {
            return Set.of(1, 2, 3, 4, 5, 6, 7);
        }
        Set<Integer> set = new HashSet<>();
        for (String partStr : selectedParts.split(",")) {
            try {
                set.add(Integer.parseInt(partStr.trim()));
            } catch (NumberFormatException ignored) {}
        }
        return set.isEmpty() ? Set.of(1, 2, 3, 4, 5, 6, 7) : set;
    }

    private Map<String, String> parseDraftAnswers(String draftJson) {
        if (draftJson == null || draftJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(draftJson, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            log.warn("Không thể parse draft answers JSON", e);
            return new HashMap<>();
        }
    }

    private boolean evaluateOtherQuestionKind(Question q, AnswerSubmission ans) {
        return switch (q.getQuestionKind()) {
            case "MATCHING" -> {
                List<MatchingPair> actualPairs = matchingPairRepository.findByQuestionId(q.getId());
                var submitted = ans.matchedPairs() == null ? List.<MatchedPairSubmission>of() : ans.matchedPairs();
                long matchedCorrectly = submitted.stream().filter(sp -> actualPairs.stream().anyMatch(ap ->
                        normalize(ap.getLeftContent()).equals(normalize(sp.leftContent())) &&
                                normalize(ap.getRightContent()).equals(normalize(sp.rightContent())))).count();
                yield !actualPairs.isEmpty() && matchedCorrectly == actualPairs.size();
            }
            case "WORD_CHOICE" -> {
                List<WordChoicePair> actualPairs = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId());
                var submitted = ans.wordChoiceSelections() == null
                        ? List.<WordChoiceSelectionSubmission>of() : ans.wordChoiceSelections();
                Map<String, String> selectedByPairId = submitted.stream()
                        .collect(Collectors.toMap(WordChoiceSelectionSubmission::pairId,
                                WordChoiceSelectionSubmission::selectedOption, (a, b) -> b));
                yield !actualPairs.isEmpty() && actualPairs.stream()
                        .allMatch(p -> p.getCorrectOption().equalsIgnoreCase(selectedByPairId.get(p.getId())));
            }
            case "DRAG_DROP" -> {
                List<DragDropOption> actualOptions = dragDropOptionRepository.findByQuestionIdOrderByDisplayOrder(q.getId());
                var submitted = ans.dragDropSelections() == null
                        ? List.<DragDropSelectionSubmission>of() : ans.dragDropSelections();
                Map<Integer, String> submittedByBlankOrder = submitted.stream()
                        .collect(Collectors.toMap(DragDropSelectionSubmission::blankOrder,
                                DragDropSelectionSubmission::cardId, (a, b) -> b));
                Map<Integer, String> correctByBlankOrder = actualOptions.stream()
                        .filter(o -> o.getBlankOrder() != null)
                        .collect(Collectors.toMap(DragDropOption::getBlankOrder, DragDropOption::getId));
                yield !correctByBlankOrder.isEmpty() && correctByBlankOrder.entrySet().stream()
                        .allMatch(e -> e.getValue().equals(submittedByBlankOrder.get(e.getKey())));
            }
            default -> false;
        };
    }

    private static String normalize(String s) {
        return s == null ? "" : s.trim().replaceAll("\\s+", " ").toLowerCase();
    }
}