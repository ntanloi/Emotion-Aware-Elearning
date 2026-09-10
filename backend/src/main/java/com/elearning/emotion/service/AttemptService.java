package com.elearning.emotion.service;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * FR-LES-03/05/06: chay bai luyen tap/de thi (KHONG lien quan Phien hoc/AI cam xuc - xem BR-19).
 *
 * 2 nhanh xu ly hoan toan khac nhau, phan biet bang content_item.type:
 *  - VOCAB_SET  -> cau hoi "ao" tu VocabPracticeGeneratorService (khong luu Question trong DB)
 *  - con lai    -> cau hoi that da luu (Question/AnswerOption/TextAnswer/MatchingPair)
 */
@Service
@RequiredArgsConstructor
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final ContentItemRepository contentItemRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final QuestionService questionService;
    private final AnswerOptionRepository answerOptionRepository;
    private final TextAnswerRepository textAnswerRepository;
    private final MatchingPairRepository matchingPairRepository;
    private final WordChoicePairRepository wordChoicePairRepository;
    private final DragDropOptionRepository dragDropOptionRepository;
    private final VocabSetItemRepository vocabSetItemRepository;
    private final VocabWordRepository vocabWordRepository;
    private final VocabPracticeGeneratorService vocabGenerator;
    private final ContentItemProgressRepository contentItemProgressRepository;

    @Transactional
    public AttemptStartResponse start(String userId, AttemptStartRequest req) {
        ContentItem item = contentItemRepository.findById(req.contentItemId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay noi dung"));
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nguoi dung"));

        if ("VOCAB_SET".equals(item.getType())) {
            if (req.practiceType() == null) {
                throw new IllegalArgumentException("VOCAB_SET can practiceType (FLASHCARD/MULTIPLE_CHOICE/...)");
            }
            var type = VocabPracticeGeneratorService.PracticeType.valueOf(req.practiceType().toUpperCase());
            var questions = vocabGenerator.generate(item.getId(), type, false);

            Attempt attempt = attemptRepository.save(Attempt.builder()
                    .user(user).contentItem(item).totalQuestions(questions.size()).build());
            return new AttemptStartResponse(attempt.getId(), null, null, questions);
        }

        List<Question> realQuestions = questionRepository.findByContentItemIdOrderByOrderIndex(item.getId());
        var questionDtos = realQuestions.stream().map(questionService::toStudentDto).toList();

        Attempt attempt = attemptRepository.save(Attempt.builder()
                .user(user).contentItem(item).totalQuestions(realQuestions.size()).build());
        return new AttemptStartResponse(attempt.getId(), item.getTimeLimitMinutes(), questionDtos, null);
    }

    @Transactional
    public AttemptResultDto submit(String userId, String attemptId, AttemptSubmitRequest req) {
        Attempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay luot lam bai"));
        if (!attempt.getUser().getId().equals(userId)) {
            throw new SecurityException("Day khong phai luot lam bai cua ban");
        }
        ContentItem item = attempt.getContentItem();

        AttemptResultDto result = "VOCAB_SET".equals(item.getType())
                ? gradeVocabPractice(item, req)
                : gradeRealQuestions(item, req);

        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setScore(result.score());
        attempt.setCorrectCount(result.correctCount());
        attemptRepository.save(attempt);

        recordProgress(userId, item, req.practiceType(), result);

        return new AttemptResultDto(attempt.getId(), result.score(), result.totalQuestions(),
                result.correctCount(), result.details());
    }

    // ---------------- Cau hoi THAT (Part 1-7 / Grammar / Dictation) ----------------

    private AttemptResultDto gradeRealQuestions(ContentItem item, AttemptSubmitRequest req) {
        List<AttemptAnswerResultDto> details = req.answers().stream()
                .map(this::gradeOneRealAnswer)
                .toList();
        long correct = details.stream().filter(AttemptAnswerResultDto::correct).count();
        int total = details.size();
        float score = total == 0 ? 0f : (correct * 100f) / total;
        return new AttemptResultDto(null, score, total, (int) correct, details);
    }

    private AttemptAnswerResultDto gradeOneRealAnswer(AnswerSubmission ans) {
        Question q = questionRepository.findById(ans.questionId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay cau hoi: " + ans.questionId()));

        return switch (q.getQuestionKind()) {
            case "MULTIPLE_CHOICE" -> {
                var options = answerOptionRepository.findByQuestionId(q.getId());
                String correctOptionId = options.stream()
                        .filter(AnswerOption::getIsCorrect)
                        .map(AnswerOption::getId)
                        .findFirst().orElse(null);
                boolean correct = ans.selectedOptionId() != null && ans.selectedOptionId().equals(correctOptionId);
                yield new AttemptAnswerResultDto(q.getId(), null, correct, null, correctOptionId);
            }
            case "FILL_BLANK", "DICTATION" -> {
                var textAnswer = textAnswerRepository.findByQuestionId(q.getId())
                        .orElseThrow(() -> new IllegalStateException("Cau hoi thieu dap an: " + q.getId()));
                boolean correct = normalize(ans.submittedText()).equals(normalize(textAnswer.getCorrectText()));
                yield new AttemptAnswerResultDto(q.getId(), null, correct, textAnswer.getCorrectText(), null);
            }
            case "MATCHING" -> {
                List<MatchingPair> actualPairs = matchingPairRepository.findByQuestionId(q.getId());
                var submitted = ans.matchedPairs() == null ? List.<MatchedPairSubmission>of() : ans.matchedPairs();
                long matchedCorrectly = submitted.stream().filter(sp -> actualPairs.stream().anyMatch(ap ->
                        normalize(ap.getLeftContent()).equals(normalize(sp.leftContent())) &&
                                normalize(ap.getRightContent()).equals(normalize(sp.rightContent())))).count();
                boolean allCorrect = !actualPairs.isEmpty() && matchedCorrectly == actualPairs.size();
                yield new AttemptAnswerResultDto(q.getId(), null, allCorrect, null, null);
            }
            case "WORD_CHOICE" -> {
                List<WordChoicePair> actualPairs = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId());
                var submitted = ans.wordChoiceSelections() == null
                        ? List.<WordChoiceSelectionSubmission>of() : ans.wordChoiceSelections();
                Map<String, String> selectedByPairId = submitted.stream()
                        .collect(Collectors.toMap(WordChoiceSelectionSubmission::pairId,
                                WordChoiceSelectionSubmission::selectedOption, (a, b) -> b));
                boolean allCorrect = !actualPairs.isEmpty() && actualPairs.stream()
                        .allMatch(p -> p.getCorrectOption().equalsIgnoreCase(selectedByPairId.get(p.getId())));
                var revealed = actualPairs.stream().map(WordChoicePairDto::forTeacher).toList();
                yield new AttemptAnswerResultDto(q.getId(), null, allCorrect, null, null, revealed);
            }
            case "SENTENCE_FILL" -> {
                List<WordChoicePair> actualBlanks = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(q.getId());
                var submitted = ans.sentenceFillAnswers() == null
                        ? List.<SentenceFillAnswerSubmission>of() : ans.sentenceFillAnswers();
                Map<String, String> submittedByBlankId = submitted.stream()
                        .collect(Collectors.toMap(SentenceFillAnswerSubmission::blankId,
                                SentenceFillAnswerSubmission::submittedText, (a, b) -> b));
                boolean allCorrect = !actualBlanks.isEmpty() && actualBlanks.stream()
                        .allMatch(b -> normalize(b.getOptionA()).equals(normalize(submittedByBlankId.get(b.getId()))));
                var revealedBlanks = actualBlanks.stream().map(SentenceFillBlankDto::forTeacher).toList();
                yield new AttemptAnswerResultDto(q.getId(), null, allCorrect, null, null, null, revealedBlanks);
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
                boolean allCorrect = !correctByBlankOrder.isEmpty() && correctByBlankOrder.entrySet().stream()
                        .allMatch(e -> e.getValue().equals(submittedByBlankOrder.get(e.getKey())));
                var revealedOptions = actualOptions.stream().map(DragDropOptionDto::forTeacher).toList();
                yield new AttemptAnswerResultDto(q.getId(), null, allCorrect, null, null, null, null, revealedOptions);
            }
            default -> throw new IllegalStateException("question_kind khong ho tro: " + q.getQuestionKind());
        };
    }

    // ---------------- Luyen tap tu vung ẢO (VOCAB_SET, BR-18) ----------------

    private AttemptResultDto gradeVocabPractice(ContentItem item, AttemptSubmitRequest req) {
        if (req.practiceType() == null) {
            throw new IllegalArgumentException("Thieu practiceType khi nop bai luyen tu vung");
        }
        var type = VocabPracticeGeneratorService.PracticeType.valueOf(req.practiceType().toUpperCase());
        List<VocabWord> allWords = vocabSetItemRepository.findByContentItemIdOrderByOrderIndex(item.getId())
                .stream().map(VocabSetItem::getWord).toList();
        Map<String, VocabWord> wordById = allWords.stream().collect(Collectors.toMap(VocabWord::getId, w -> w));

        List<AttemptAnswerResultDto> details = switch (type) {
            case FLASHCARD -> req.answers().stream()
                    .map(a -> new AttemptAnswerResultDto(null, a.wordId(), true, null, null)) // FLASHCARD: chi can da xem
                    .toList();
            case MULTIPLE_CHOICE, LISTENING -> {
                var generated = vocabGenerator.generate(item.getId(), type, true);
                var correctIndexByWord = generated.stream()
                        .collect(Collectors.toMap(VocabPracticeQuestionDto::wordId, VocabPracticeQuestionDto::correctChoiceIndex));
                yield req.answers().stream().map(a -> {
                    boolean correct = a.selectedChoiceIndex() != null
                            && a.selectedChoiceIndex().equals(correctIndexByWord.get(a.wordId()));
                    return new AttemptAnswerResultDto(null, a.wordId(), correct, null, null);
                }).toList();
            }
            case FILL_BLANK -> req.answers().stream().map(a -> {
                VocabWord w = wordById.get(a.wordId());
                boolean correct = w != null && normalize(a.submittedText()).equals(normalize(w.getWord()));
                return new AttemptAnswerResultDto(null, a.wordId(), correct, w != null ? w.getWord() : null, null);
            }).toList();
            case MATCHING -> req.answers().stream().map(a -> {
                VocabWord w = wordById.get(a.wordId());
                boolean correct = w != null && normalize(a.submittedText()).equals(normalize(w.getMeaningVi()));
                return new AttemptAnswerResultDto(null, a.wordId(), correct, w != null ? w.getMeaningVi() : null, null);
            }).toList();
        };

        long correct = details.stream().filter(AttemptAnswerResultDto::correct).count();
        int total = details.size();
        float score = total == 0 ? 0f : (correct * 100f) / total;
        return new AttemptResultDto(null, score, total, (int) correct, details);
    }

    // ---------------- Ghi tick hoan thanh (content_item_progress, V3 migration) ----------------

    private void recordProgress(String userId, ContentItem item, String practiceType, AttemptResultDto result) {
        String key = "VOCAB_SET".equals(item.getType()) && practiceType != null
                ? practiceType.toUpperCase() : "DEFAULT";

        var progress = contentItemProgressRepository
                .findByUserIdAndContentItemIdAndPracticeType(userId, item.getId(), key)
                .orElseGet(() -> ContentItemProgress.builder()
                        .user(userRepository.getReferenceById(userId))
                        .contentItem(item)
                        .practiceType(key)
                        .build());

        // Nguong hoan thanh: >=70% coi la da hoan thanh (co the dieu chinh sau theo yeu cau thuc te)
        boolean completed = result.score() != null && result.score() >= 70f;
        progress.setCompleted(completed || progress.isCompleted());
        BigDecimal newScore = BigDecimal.valueOf(result.score() == null ? 0 : result.score());
        if (progress.getBestScore() == null || newScore.compareTo(progress.getBestScore()) > 0) {
            progress.setBestScore(newScore);
        }
        if (completed) progress.setCompletedAt(LocalDateTime.now());
        contentItemProgressRepository.save(progress);
    }

    private String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
