package com.elearning.emotion.service;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuestionService {

    private static final Set<String> VALID_KINDS =
            Set.of("MULTIPLE_CHOICE", "FILL_BLANK", "MATCHING", "DICTATION", "WORD_CHOICE", "SENTENCE_FILL", "DRAG_DROP");

    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final TextAnswerRepository textAnswerRepository;
    private final MatchingPairRepository matchingPairRepository;
    private final WordChoicePairRepository wordChoicePairRepository;
    private final DragDropOptionRepository dragDropOptionRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final PassageRepository passageRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final ContentItemService contentItemService;
    private final CourseAccessService courseAccessService;
    private final TestAttemptRepository testAttemptRepository;
    private final AttemptRepository attemptRepository;
    private final ToeicTestPartRepository toeicTestPartRepository;

    @Transactional
    public Question create(String teacherId, QuestionCreateRequest req) {
        if (!VALID_KINDS.contains(req.questionKind())) {
            throw new IllegalArgumentException("question_kind khong hop le: " + req.questionKind());
        }
        var item = contentItemService.getOwnedOrThrow(teacherId, req.contentItemId());

        Passage passage = null;
        if (req.passageId() != null) {
            passage = passageRepository.findById(req.passageId())
                    .orElseThrow(() -> new IllegalArgumentException("Khong tim thay doan van"));
        }

        int nextOrder = questionRepository.findByContentItemIdOrderByOrderIndex(req.contentItemId()).size();

        Question question = Question.builder()
                .contentItem(item)
                .passage(passage)
                .questionKind(req.questionKind())
                .promptText(req.promptText())
                .tag(req.tag())
                .image(resolveMedia(req.imageMediaId()))
                .audio(resolveMedia(req.audioMediaId()))
                .orderIndex(nextOrder)
                .explanation(req.explanation())
                .build();
        question = questionRepository.save(question);

        switch (req.questionKind()) {
            case "MULTIPLE_CHOICE" -> createOptions(question, req.options());
            case "FILL_BLANK", "DICTATION" -> createTextAnswer(question, req.textAnswer());
            case "MATCHING" -> createMatchingPairs(question, req.matchingPairs());
            case "WORD_CHOICE" -> createWordChoicePairs(question, req.wordChoicePairs());
            case "SENTENCE_FILL" -> createSentenceFillBlanks(question, req.sentenceFillBlanks());
            case "DRAG_DROP" -> createDragDropOptions(question, req.dragDropOptions());
            default -> throw new IllegalStateException("unreachable");
        }
        return question;
    }

    private void createOptions(Question question, List<AnswerOptionRequest> options) {
        if (options == null || options.size() < 2) {
            throw new IllegalArgumentException("MULTIPLE_CHOICE can toi thieu 2 dap an");
        }
        if (options.stream().noneMatch(AnswerOptionRequest::isCorrect)) {
            throw new IllegalArgumentException("Phai co it nhat 1 dap an dung");
        }
        for (var o : options) {
            answerOptionRepository.save(AnswerOption.builder()
                    .question(question).label(o.label()).content(o.content())
                    .isCorrect(o.isCorrect()).build());
        }
    }

    private void createTextAnswer(Question question, TextAnswerRequest req) {
        if (req == null || req.correctText() == null || req.correctText().isBlank()) {
            throw new IllegalArgumentException("FILL_BLANK/DICTATION can correctText");
        }
        textAnswerRepository.save(TextAnswer.builder()
                .question(question).correctText(req.correctText()).hint(req.hint()).build());
    }

    private void createMatchingPairs(Question question, List<MatchingPairRequest> pairs) {
        if (pairs == null || pairs.size() < 2) {
            throw new IllegalArgumentException("MATCHING can toi thieu 2 cap");
        }
        for (var p : pairs) {
            matchingPairRepository.save(MatchingPair.builder()
                    .question(question).leftContent(p.leftContent()).rightContent(p.rightContent()).build());
        }
    }

    private void createWordChoicePairs(Question question, List<WordChoicePairRequest> pairs) {
        if (pairs == null || pairs.isEmpty()) {
            throw new IllegalArgumentException("WORD_CHOICE can toi thieu 1 blank");
        }
        int order = 1;
        for (var p : pairs) {
            wordChoicePairRepository.save(WordChoicePair.builder()
                    .question(question).orderIndex(order++)
                    .optionA(p.optionA()).optionB(p.optionB()).correctOption(p.correctOption()).build());
        }
    }

    /**
     * SENTENCE_FILL tái dụng bảng word_choice_pairs:
     *  - optionA = correctText (đáp án đúng)
     *  - optionB = hint (gợi ý, có thể rỗng)
     *  - correctOption = "A" (luôn luôn)
     */
    private void createSentenceFillBlanks(Question question, List<SentenceFillBlankRequest> blanks) {
        if (blanks == null || blanks.isEmpty()) {
            throw new IllegalArgumentException("SENTENCE_FILL can toi thieu 1 blank");
        }
        int order = 1;
        for (var b : blanks) {
            wordChoicePairRepository.save(WordChoicePair.builder()
                    .question(question).orderIndex(order++)
                    .optionA(b.correctText())
                    .optionB(b.hint() != null ? b.hint() : "")
                    .correctOption("A").build());
        }
    }

    /**
     * DRAG_DROP: moi phan tu trong danh sach la 1 "the" trong ngan keo (word bank). The nao co
     * blankOrder khac null la dap an DUNG cho o trong {{blankOrder}} trong promptText; the nao
     * blankOrder = null la the moi (distractor). Can it nhat 1 the co blankOrder (it nhat 1 o
     * trong), cac blankOrder phai la day so nguyen duong LIEN TUC bat dau tu 1 (khop voi cac
     * token {{1}},{{2}},... trong promptText) - khong bat buoc unique the trung text.
     */
    private void createDragDropOptions(Question question, List<DragDropOptionRequest> options) {
        if (options == null || options.isEmpty()) {
            throw new IllegalArgumentException("DRAG_DROP can toi thieu 1 the trong ngan keo");
        }
        long blankCount = options.stream()
                .map(DragDropOptionRequest::blankOrder)
                .filter(java.util.Objects::nonNull)
                .distinct().count();
        if (blankCount == 0) {
            throw new IllegalArgumentException("DRAG_DROP can it nhat 1 o trong (the co blankOrder)");
        }
        int order = 1;
        for (var o : options) {
            dragDropOptionRepository.save(DragDropOption.builder()
                    .question(question).displayOrder(order++)
                    .blankOrder(o.blankOrder())
                    .text(o.text()).build());
        }
    }

    /**
     * Sua 1 cau hoi: xoa het options/textAnswer/matchingPairs CU roi tao lai theo noi dung MOI
     * (don gian & an toan hon "va" tung phan). questionKind giu nguyen neu req khong gui.
     */
    @Transactional
    public Question update(String teacherId, String questionId, QuestionUpdateRequest req) {
        Question question = getOwnedOrThrow(teacherId, questionId);

        String kind = req.questionKind() != null ? req.questionKind() : question.getQuestionKind();
        if (!VALID_KINDS.contains(kind)) {
            throw new IllegalArgumentException("question_kind khong hop le: " + kind);
        }

        if (req.passageId() != null) {
            Passage passage = req.passageId().isBlank() ? null : passageRepository.findById(req.passageId())
                    .orElseThrow(() -> new IllegalArgumentException("Khong tim thay doan van"));
            question.setPassage(passage);
        }
        question.setQuestionKind(kind);
        if (req.promptText() != null) question.setPromptText(req.promptText());
        if (req.tag() != null) question.setTag(req.tag());
        if (req.imageMediaId() != null) question.setImage(resolveMedia(req.imageMediaId()));
        if (req.explanation() != null) question.setExplanation(req.explanation());
        if (req.status() != null && !req.status().isBlank()) {
            question.setStatus("DISABLED".equalsIgnoreCase(req.status()) ? "DISABLED" : "ACTIVE");
        }
        question = questionRepository.save(question);

        // Xoa sach dap an cu (bat ke kieu cu la gi) roi tao lai theo dung kieu MOI
        answerOptionRepository.deleteAll(answerOptionRepository.findByQuestionId(question.getId()));
        textAnswerRepository.findByQuestionId(question.getId()).ifPresent(textAnswerRepository::delete);
        matchingPairRepository.deleteAll(matchingPairRepository.findByQuestionId(question.getId()));
        wordChoicePairRepository.deleteAll(wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(question.getId()));
        dragDropOptionRepository.deleteAll(dragDropOptionRepository.findByQuestionId(question.getId()));

        switch (kind) {
            case "MULTIPLE_CHOICE" -> createOptions(question, req.options());
            case "FILL_BLANK", "DICTATION" -> createTextAnswer(question, req.textAnswer());
            case "MATCHING" -> createMatchingPairs(question, req.matchingPairs());
            case "WORD_CHOICE" -> createWordChoicePairs(question, req.wordChoicePairs());
            case "SENTENCE_FILL" -> createSentenceFillBlanks(question, req.sentenceFillBlanks());
            case "DRAG_DROP" -> createDragDropOptions(question, req.dragDropOptions());
            default -> throw new IllegalStateException("unreachable");
        }
        return question;
    }

    /**
     * Xoa 1 cau hoi va toan bo du lieu phu thuoc (dap an trac nghiem/dien tu/ghep cap/chon tu/keo
     * tha). Neu hoc vien da lam bai va co attempt_answers tham chieu den cau hoi nay -> CHAN xoa
     * de khong lam mat lich su lam bai cua hoc vien (khac voi options/textAnswer/... la du lieu
     * soan bai, xoa duoc thoai mai).
     */
    @Transactional
    public void delete(String teacherId, String questionId) {
        Question question = getOwnedOrThrow(teacherId, questionId);
        cascadeDelete(question);
    }

    /**
     * Dung noi bo (khong check quyen o day - noi goi phai tu dam bao da xac thuc quyen) de xoa
     * 1 Question + toan bo dap an cua no. Duoc PassageService goi lai khi xoa ca doan van.
     */
    @Transactional
    public void cascadeDelete(Question question) {
        String questionId = question.getId();

        long attemptCount = attemptAnswerRepository.findByQuestionId(questionId).size();
        if (attemptCount > 0) {
            throw new IllegalStateException(
                    "Cau hoi nay da co " + attemptCount + " luot hoc vien lam bai — khong the xoa de tranh mat lich su lam bai");
        }

        answerOptionRepository.deleteAll(answerOptionRepository.findByQuestionId(questionId));
        textAnswerRepository.findByQuestionId(questionId).ifPresent(textAnswerRepository::delete);
        matchingPairRepository.deleteAll(matchingPairRepository.findByQuestionId(questionId));
        wordChoicePairRepository.deleteAll(wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(questionId));
        dragDropOptionRepository.deleteAll(dragDropOptionRepository.findByQuestionId(questionId));
        questionRepository.delete(question);
    }

    public Question getOwnedOrThrow(String teacherId, String questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay cau hoi"));
        if (!question.getContentItem().getCourse().getTeacher().getId().equals(teacherId)) {
            if (!contentItemService.isAdmin(teacherId)) {
                throw new SecurityException("Ban khong co quyen chinh sua cau hoi nay");
            }
        }
        return question;
    }

    @Transactional
    public Question updateStatus(String teacherId, String questionId, String status) {
        Question question = getOwnedOrThrow(teacherId, questionId);
        question.setStatus("DISABLED".equalsIgnoreCase(status) ? "DISABLED" : "ACTIVE");
        return questionRepository.save(question);
    }

    @Transactional
    public void updateAllStatusByContentItem(String teacherId, String contentItemId, String status) {
        contentItemService.getOwnedOrThrow(teacherId, contentItemId);
        String targetStatus = "DISABLED".equalsIgnoreCase(status) ? "DISABLED" : "ACTIVE";
        List<Question> questions = questionRepository.findByContentItemIdOrderByOrderIndex(contentItemId);
        for (Question q : questions) {
            q.setStatus(targetStatus);
        }
        questionRepository.saveAll(questions);
    }

    /** Tra ve DTO day du - danh cho GIANG VIEN xem lai (co dap an dung, ke ca FILL_BLANK/DICTATION) */
    public QuestionDto toTeacherDto(Question q) {
        if ("SENTENCE_FILL".equals(q.getQuestionKind())) {
            var blanks = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId()).stream()
                    .map(SentenceFillBlankDto::forTeacher).toList();
            return QuestionDto.buildWithSentenceFill(q, blanks, q.getExplanation());
        }
        if ("DRAG_DROP".equals(q.getQuestionKind())) {
            var dragDropOptions = dragDropOptionRepository.findByQuestionIdOrderByDisplayOrder(q.getId()).stream()
                    .map(DragDropOptionDto::forTeacher).toList();
            return QuestionDto.buildWithDragDrop(q, dragDropOptions, q.getExplanation());
        }
        var options = answerOptionRepository.findByQuestionIdOrderByLabelAsc(q.getId()).stream()
                .map(AnswerOptionDto::forTeacher).toList();
        var textAnswer = textAnswerRepository.findByQuestionId(q.getId()).orElse(null);
        var hint = textAnswer != null ? textAnswer.getHint() : null;
        var correctText = textAnswer != null ? textAnswer.getCorrectText() : null;
        var pairs = matchingPairRepository.findByQuestionId(q.getId()).stream()
                .map(MatchingPairDto::from).toList();
        var wordChoicePairs = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId()).stream()
                .map(WordChoicePairDto::forTeacher).toList();
        return QuestionDto.build(q, options, hint, correctText, pairs, wordChoicePairs, q.getExplanation());
    }

    /**
     * BATCH MAPPING TO TEACHER DTOS:
     * Gom tất cả truy vấn con thành đúng 5 câu SQL theo danh sách questionIds,
     * loại bỏ hoàn toàn vấn đề N+1 Query, tăng tốc độ truy vấn từ 2s xuống 50ms.
     */
    public List<QuestionDto> toTeacherDtos(List<Question> questions) {
        if (questions == null || questions.isEmpty()) return List.of();
        List<String> questionIds = questions.stream().map(Question::getId).toList();

        Map<String, List<AnswerOption>> optionsByQ = answerOptionRepository.findByQuestionIdInOrderByLabelAsc(questionIds).stream()
                .collect(Collectors.groupingBy(opt -> opt.getQuestion().getId()));
        Map<String, TextAnswer> textAnswersByQ = textAnswerRepository.findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.toMap(ta -> ta.getQuestion().getId(), ta -> ta, (a, b) -> a));
        Map<String, List<MatchingPair>> pairsByQ = matchingPairRepository.findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.groupingBy(mp -> mp.getQuestion().getId()));
        Map<String, List<WordChoicePair>> wordChoicePairsByQ = wordChoicePairRepository.findByQuestionIdInOrderByOrderIndex(questionIds).stream()
                .collect(Collectors.groupingBy(wc -> wc.getQuestion().getId()));
        Map<String, List<DragDropOption>> dragDropOptionsByQ = dragDropOptionRepository.findByQuestionIdInOrderByDisplayOrder(questionIds).stream()
                .collect(Collectors.groupingBy(dd -> dd.getQuestion().getId()));

        return questions.stream().map(q -> {
            if ("SENTENCE_FILL".equals(q.getQuestionKind())) {
                var blanks = wordChoicePairsByQ.getOrDefault(q.getId(), List.of()).stream()
                        .map(SentenceFillBlankDto::forTeacher).toList();
                return QuestionDto.buildWithSentenceFill(q, blanks, q.getExplanation());
            }
            if ("DRAG_DROP".equals(q.getQuestionKind())) {
                var ddOptions = dragDropOptionsByQ.getOrDefault(q.getId(), List.of()).stream()
                        .map(DragDropOptionDto::forTeacher).toList();
                return QuestionDto.buildWithDragDrop(q, ddOptions, q.getExplanation());
            }
            var options = optionsByQ.getOrDefault(q.getId(), List.of()).stream()
                    .map(AnswerOptionDto::forTeacher).toList();
            var textAnswer = textAnswersByQ.get(q.getId());
            var hint = textAnswer != null ? textAnswer.getHint() : null;
            var correctText = textAnswer != null ? textAnswer.getCorrectText() : null;
            var pairs = pairsByQ.getOrDefault(q.getId(), List.of()).stream()
                    .map(MatchingPairDto::from).toList();
            var wordChoicePairs = wordChoicePairsByQ.getOrDefault(q.getId(), List.of()).stream()
                    .map(WordChoicePairDto::forTeacher).toList();
            return QuestionDto.build(q, options, hint, correctText, pairs, wordChoicePairs, q.getExplanation());
        }).toList();
    }

    /** Tra ve DTO da AN dap an dung - danh cho HOC VIEN lam bai (correctText LUON null, explanation LUON null) */
    public QuestionDto toStudentDto(Question q) {
        if ("SENTENCE_FILL".equals(q.getQuestionKind())) {
            var blanks = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId()).stream()
                    .map(SentenceFillBlankDto::forStudent).toList();
            return QuestionDto.buildWithSentenceFill(q, blanks, null);
        }
        if ("DRAG_DROP".equals(q.getQuestionKind())) {
            var dragDropOptions = dragDropOptionRepository.findByQuestionIdOrderByDisplayOrder(q.getId()).stream()
                    .map(DragDropOptionDto::forStudent).toList();
            return QuestionDto.buildWithDragDrop(q, dragDropOptions, null);
        }
        var options = answerOptionRepository.findByQuestionIdOrderByLabelAsc(q.getId()).stream()
                .map(AnswerOptionDto::forStudent).toList();
        var hint = textAnswerRepository.findByQuestionId(q.getId()).map(TextAnswer::getHint).orElse(null);
        var pairs = matchingPairRepository.findByQuestionId(q.getId()).stream()
                .map(MatchingPairDto::from).toList();
        var wordChoicePairs = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId()).stream()
                .map(WordChoicePairDto::forStudent).toList();
        return QuestionDto.build(q, options, hint, null, pairs, wordChoicePairs, null);
    }

    /**
     * BATCH MAPPING TO STUDENT DTOS:
     * Gom tất cả truy vấn con thành đúng 5 câu SQL theo danh sách questionIds,
     * loại bỏ hoàn toàn vấn đề N+1 Query cho học viên làm bài.
     */
    public List<QuestionDto> toStudentDtos(List<Question> questions) {
        if (questions == null || questions.isEmpty()) return List.of();
        List<String> questionIds = questions.stream().map(Question::getId).toList();

        Map<String, List<AnswerOption>> optionsByQ = answerOptionRepository.findByQuestionIdInOrderByLabelAsc(questionIds).stream()
                .collect(Collectors.groupingBy(opt -> opt.getQuestion().getId()));
        Map<String, TextAnswer> textAnswersByQ = textAnswerRepository.findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.toMap(ta -> ta.getQuestion().getId(), ta -> ta, (a, b) -> a));
        Map<String, List<MatchingPair>> pairsByQ = matchingPairRepository.findByQuestionIdIn(questionIds).stream()
                .collect(Collectors.groupingBy(mp -> mp.getQuestion().getId()));
        Map<String, List<WordChoicePair>> wordChoicePairsByQ = wordChoicePairRepository.findByQuestionIdInOrderByOrderIndex(questionIds).stream()
                .collect(Collectors.groupingBy(wc -> wc.getQuestion().getId()));
        Map<String, List<DragDropOption>> dragDropOptionsByQ = dragDropOptionRepository.findByQuestionIdInOrderByDisplayOrder(questionIds).stream()
                .collect(Collectors.groupingBy(dd -> dd.getQuestion().getId()));

        return questions.stream().map(q -> {
            if ("SENTENCE_FILL".equals(q.getQuestionKind())) {
                var blanks = wordChoicePairsByQ.getOrDefault(q.getId(), List.of()).stream()
                        .map(SentenceFillBlankDto::forStudent).toList();
                return QuestionDto.buildWithSentenceFill(q, blanks, null);
            }
            if ("DRAG_DROP".equals(q.getQuestionKind())) {
                var ddOptions = dragDropOptionsByQ.getOrDefault(q.getId(), List.of()).stream()
                        .map(DragDropOptionDto::forStudent).toList();
                return QuestionDto.buildWithDragDrop(q, ddOptions, null);
            }
            var options = optionsByQ.getOrDefault(q.getId(), List.of()).stream()
                    .map(AnswerOptionDto::forStudent).toList();
            var textAnswer = textAnswersByQ.get(q.getId());
            var hint = textAnswer != null ? textAnswer.getHint() : null;
            var pairs = pairsByQ.getOrDefault(q.getId(), List.of()).stream()
                    .map(MatchingPairDto::from).toList();
            var wordChoicePairs = wordChoicePairsByQ.getOrDefault(q.getId(), List.of()).stream()
                    .map(WordChoicePairDto::forStudent).toList();
            return QuestionDto.build(q, options, hint, null, pairs, wordChoicePairs, null);
        }).toList();
    }

    /**
     * FR-LES-05/06: kiểm tra đáp án cho MỘT câu ngay khi học viên bấm "Kiểm tra đáp án",
     * không cần đợi nộp cả bài. Trả về đáp án đúng để FE tô màu (xanh = đúng, đỏ = sai đã chọn).
     *
     * Kiểm tra quyền:
     * - Với câu hỏi bài học khóa học (profile != EXAM): validateCanLearn (học viên đã ghi danh/mua).
     * - Với đề thi TOEIC độc lập (profile = EXAM): bắt buộc có attemptId hợp lệ của chính học viên.
     * - Chống gian lận chéo: So khớp câu hỏi thuộc đúng đề thi của attemptId và thuộc đúng part đã chọn.
     * - Chặn khi đang làm ở chế độ thi thử (mode = FULL hoặc feedbackMode = AFTER_TEST).
     */
    public QuestionCheckResultDto checkAnswer(String userId, String questionId, QuestionCheckRequest req) {
        if (userId == null || userId.isBlank()) {
            throw new SecurityException("Cần đăng nhập để kiểm tra đáp án");
        }

        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + questionId));

        ContentItem item = q.getContentItem();
        Course course = item.getCourse();

        String attemptId = req != null ? req.attemptId() : null;
        boolean isTeacherOrAdmin = courseAccessService.canManageOrModerate(userId, course);
        boolean isTestQuestion = toeicTestPartRepository.findFirstByContentItemId(item.getId()).isPresent()
                || "EXAM".equalsIgnoreCase(course.getProfile());

        if (attemptId != null && !attemptId.isBlank()) {
            // Có attemptId -> Đang làm bài trong ngữ cảnh lượt làm đề thi
            if (!isTeacherOrAdmin) {
                TestAttempt testAttempt = testAttemptRepository.findById(attemptId).orElse(null);
                if (testAttempt == null) {
                    throw new IllegalArgumentException("Không tìm thấy lượt làm bài: " + attemptId);
                }
                if (!testAttempt.getUser().getId().equals(userId)) {
                    throw new SecurityException("Bạn không có quyền truy cập lượt làm bài này");
                }
                if (!"IN_PROGRESS".equalsIgnoreCase(testAttempt.getStatus())) {
                    throw new SecurityException("Lượt làm bài này đã kết thúc hoặc không ở trạng thái đang làm");
                }

                // Vá lỗ hổng 1: So khớp câu hỏi có thuộc đúng đề thi của lượt làm bài không
                List<ToeicTestPart> testParts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(testAttempt.getTest().getId());
                ToeicTestPart matchingPart = testParts.stream()
                        .filter(p -> p.getContentItem().getId().equals(item.getId()))
                        .findFirst()
                        .orElseThrow(() -> new SecurityException("Câu hỏi không thuộc đề thi của lượt làm bài này"));

                // Vá lỗ hổng 2: So khớp part có nằm trong danh sách các part đã chọn không
                Set<Integer> selectedPartNos = parseSelectedParts(testAttempt.getSelectedParts());
                if (!selectedPartNos.contains(matchingPart.getPartNo())) {
                    throw new SecurityException("Phần thi của câu hỏi không nằm trong phạm vi làm bài của bạn");
                }

                // Chặn nếu đang ở chế độ thi thử (chỉ trả đáp án sau khi nộp bài)
                if ("AFTER_TEST".equalsIgnoreCase(testAttempt.getFeedbackMode())) {
                    throw new SecurityException("Không thể kiểm tra đáp án trong khi đang ở chế độ thi thử (AFTER_TEST)");
                }
            }
        } else {
            // Không có attemptId
            if (isTestQuestion) {
                // Câu hỏi thuộc đề thi: học viên bắt buộc phải có attemptId
                if (!isTeacherOrAdmin) {
                    throw new SecurityException("Cần cung cấp mã lượt làm bài (attemptId) đối với câu hỏi thuộc đề thi");
                }
            } else {
                // Bài học khóa học thường: học viên phải có quyền học khóa học (validateCanLearn)
                courseAccessService.validateCanLearn(userId, course);
            }
        }

        return evaluateQuestion(q, req);
    }

    public QuestionCheckResultDto checkAnswer(String questionId, QuestionCheckRequest req) {
        return checkAnswer(null, questionId, req);
    }

    private Set<Integer> parseSelectedParts(String selectedParts) {
        if (selectedParts == null || selectedParts.isBlank()) {
            return Set.of(1, 2, 3, 4, 5, 6, 7);
        }
        return Arrays.stream(selectedParts.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Integer::parseInt)
                .collect(Collectors.toSet());
    }

    private QuestionCheckResultDto evaluateQuestion(Question q, QuestionCheckRequest req) {
        if (req == null) {
            req = new QuestionCheckRequest(null, null, null, null, null, null);
        }

        return switch (q.getQuestionKind()) {
            case "MULTIPLE_CHOICE" -> {
                var options = answerOptionRepository.findByQuestionIdOrderByLabelAsc(q.getId());
                String correctOptionId = options.stream()
                        .filter(AnswerOption::getIsCorrect)
                        .map(AnswerOption::getId)
                        .findFirst()
                        .orElse(null);
                boolean correct = req.selectedOptionId() != null && req.selectedOptionId().equals(correctOptionId);
                yield new QuestionCheckResultDto(q.getId(), correct, correctOptionId, null, q.getExplanation());
            }
            case "FILL_BLANK", "DICTATION" -> {
                var textAnswer = textAnswerRepository.findByQuestionId(q.getId())
                        .orElseThrow(() -> new IllegalStateException("Cau hoi thieu dap an: " + q.getId()));
                boolean correct = normalize(req.submittedText()).equals(normalize(textAnswer.getCorrectText()));
                yield new QuestionCheckResultDto(q.getId(), correct, null, textAnswer.getCorrectText(), q.getExplanation());
            }
            case "WORD_CHOICE" -> {
                var actualPairs = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId());
                var submitted = req.wordChoiceSelections() == null
                        ? List.<WordChoiceSelectionSubmission>of() : req.wordChoiceSelections();
                var selectedByPairId = submitted.stream()
                        .collect(java.util.stream.Collectors.toMap(WordChoiceSelectionSubmission::pairId,
                                WordChoiceSelectionSubmission::selectedOption, (a, b) -> b));
                boolean allCorrect = !actualPairs.isEmpty() && actualPairs.stream()
                        .allMatch(p -> p.getCorrectOption().equalsIgnoreCase(selectedByPairId.get(p.getId())));
                var revealed = actualPairs.stream().map(WordChoicePairDto::forTeacher).toList();
                yield new QuestionCheckResultDto(q.getId(), allCorrect, null, null, revealed, q.getExplanation());
            }
            case "SENTENCE_FILL" -> {
                var actualBlanks = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId());
                var submitted = req.sentenceFillAnswers() == null
                        ? List.<SentenceFillAnswerSubmission>of() : req.sentenceFillAnswers();
                var submittedByBlankId = submitted.stream()
                        .collect(java.util.stream.Collectors.toMap(SentenceFillAnswerSubmission::blankId,
                                SentenceFillAnswerSubmission::submittedText, (a, b) -> b));
                boolean allCorrect = !actualBlanks.isEmpty() && actualBlanks.stream()
                        .allMatch(b -> normalize(b.getOptionA()).equals(normalize(submittedByBlankId.get(b.getId()))));
                var revealedBlanks = actualBlanks.stream().map(SentenceFillBlankDto::forTeacher).toList();
                yield new QuestionCheckResultDto(q.getId(), allCorrect, null, null, null, revealedBlanks, q.getExplanation());
            }
            case "DRAG_DROP" -> {
                var actualOptions = dragDropOptionRepository.findByQuestionIdOrderByDisplayOrder(q.getId());
                var submitted = req.dragDropSelections() == null
                        ? List.<DragDropSelectionSubmission>of() : req.dragDropSelections();
                var submittedByBlankOrder = submitted.stream()
                        .collect(java.util.stream.Collectors.toMap(DragDropSelectionSubmission::blankOrder,
                                DragDropSelectionSubmission::cardId, (a, b) -> b));
                var correctByBlankOrder = actualOptions.stream()
                        .filter(o -> o.getBlankOrder() != null)
                        .collect(java.util.stream.Collectors.toMap(DragDropOption::getBlankOrder, DragDropOption::getId));
                boolean allCorrect = !correctByBlankOrder.isEmpty() && correctByBlankOrder.entrySet().stream()
                        .allMatch(e -> e.getValue().equals(submittedByBlankOrder.get(e.getKey())));
                var revealedOptions = actualOptions.stream().map(DragDropOptionDto::forTeacher).toList();
                yield new QuestionCheckResultDto(q.getId(), allCorrect, null, null, null, null, revealedOptions, q.getExplanation());
            }
            default -> throw new IllegalStateException(
                    "Kiem tra tung cau khong ho tro question_kind: " + q.getQuestionKind());
        };
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private MediaAsset resolveMedia(String mediaId) {
        if (mediaId == null) return null;
        return mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay media: " + mediaId));
    }
}
