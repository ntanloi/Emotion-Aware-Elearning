package com.elearning.emotion.dto;

import java.util.List;

/**
 * 1 dap an hoc vien gui khi nop bai.
 * - Cau hoi that MULTIPLE_CHOICE: questionId + selectedOptionId
 * - Cau hoi that FILL_BLANK/DICTATION: questionId + submittedText
 * - Cau hoi that MATCHING: questionId + matchedPairs
 * - Cau hoi that WORD_CHOICE: questionId + wordChoiceSelections
 * - Cau hoi that SENTENCE_FILL: questionId + sentenceFillAnswers
 * - Cau hoi that DRAG_DROP: questionId + dragDropSelections
 * - Vocab practice ao MULTIPLE_CHOICE/LISTENING: wordId + selectedChoiceIndex
 * - Vocab practice ao FILL_BLANK/MATCHING: wordId + submittedText
 * - Vocab practice ao FLASHCARD: wordId (chi de danh dau da xem)
 */
public record AnswerSubmission(
        String questionId,
        String selectedOptionId,
        String submittedText,
        List<MatchedPairSubmission> matchedPairs,
        List<WordChoiceSelectionSubmission> wordChoiceSelections,
        List<SentenceFillAnswerSubmission> sentenceFillAnswers,
        List<DragDropSelectionSubmission> dragDropSelections,
        String wordId,
        Integer selectedChoiceIndex
) {}
