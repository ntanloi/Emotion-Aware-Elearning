package com.elearning.emotion.dto;

import java.util.List;

/**
 * Kết quả kiểm tra đáp án cho MỘT câu (không cần nộp cả bài).
 *  - correct: đáp án học viên chọn/nhập có đúng không
 *  - correctOptionId: id đáp án đúng (dùng cho MULTIPLE_CHOICE)
 *  - correctText: đáp án đúng dạng text (dùng cho FILL_BLANK/DICTATION)
 *  - wordChoicePairs: toàn bộ cặp lựa chọn kèm correctOption (dùng cho WORD_CHOICE)
 *  - sentenceFillBlanks: toàn bộ ô trống kèm correctText (dùng cho SENTENCE_FILL,
 *    trả về đáp án đúng để FE tô xanh/đỏ từng ô sau khi học viên nhấn "Kiểm tra")
 *  - dragDropOptions: toàn bộ thẻ trong ngăn kéo kèm blankOrder thật (dùng cho DRAG_DROP,
 *    trả về sau khi học viên nhấn "Kiểm tra" để FE biết thẻ nào khớp ô trống nào)
 *  - explanation: giải thích đáp án (nếu giáo viên có cung cấp) - chỉ trả về sau khi học viên
 *    đã kiểm tra đáp án, không trả về trước khi làm bài
 */
public record QuestionCheckResultDto(String questionId, boolean correct, String correctOptionId, String correctText,
                                     List<WordChoicePairDto> wordChoicePairs,
                                     List<SentenceFillBlankDto> sentenceFillBlanks,
                                     List<DragDropOptionDto> dragDropOptions,
                                     String explanation) {

    // MULTIPLE_CHOICE / FILL_BLANK / DICTATION
    public QuestionCheckResultDto(String questionId, boolean correct, String correctOptionId, String correctText, String explanation) {
        this(questionId, correct, correctOptionId, correctText, null, null, null, explanation);
    }

    // WORD_CHOICE
    public QuestionCheckResultDto(String questionId, boolean correct, String correctOptionId, String correctText,
                                  List<WordChoicePairDto> wordChoicePairs, String explanation) {
        this(questionId, correct, correctOptionId, correctText, wordChoicePairs, null, null, explanation);
    }

    // SENTENCE_FILL
    public QuestionCheckResultDto(String questionId, boolean correct, String correctOptionId, String correctText,
                                  List<WordChoicePairDto> wordChoicePairs, List<SentenceFillBlankDto> sentenceFillBlanks,
                                  String explanation) {
        this(questionId, correct, correctOptionId, correctText, wordChoicePairs, sentenceFillBlanks, null, explanation);
    }

    // DRAG_DROP dùng thẳng constructor canonical (8 tham số) ở trên - không cần overload riêng.
}
