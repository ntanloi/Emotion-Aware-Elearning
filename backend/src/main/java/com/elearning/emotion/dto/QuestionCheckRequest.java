package com.elearning.emotion.dto;

import java.util.List;

/**
 * FR-LES-05/06: học viên bấm "Kiểm tra đáp án" cho MỘT câu (chưa nộp cả bài).
 * Chỉ điền field tương ứng với question_kind:
 *  - MULTIPLE_CHOICE -> selectedOptionId
 *  - FILL_BLANK/DICTATION -> submittedText
 *  - WORD_CHOICE -> wordChoiceSelections (kiểm tra TẤT CẢ blank cùng lúc)
 *  - SENTENCE_FILL -> sentenceFillAnswers (kiểm tra 1 blank khi học viên nhấn "Kiểm tra")
 *  - DRAG_DROP -> dragDropSelections (kiểm tra TẤT CẢ ô trống cùng lúc, sau khi học viên đã
 *    kéo thả hết các thẻ và nhấn "Kiểm tra")
 */
public record QuestionCheckRequest(
        String selectedOptionId,
        String submittedText,
        List<WordChoiceSelectionSubmission> wordChoiceSelections,
        List<SentenceFillAnswerSubmission> sentenceFillAnswers,
        List<DragDropSelectionSubmission> dragDropSelections
) {}
