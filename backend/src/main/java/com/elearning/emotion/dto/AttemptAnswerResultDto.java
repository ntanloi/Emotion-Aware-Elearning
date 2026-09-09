package com.elearning.emotion.dto;

import java.util.List;

/**
 * correctOptionId: chỉ có giá trị với MULTIPLE_CHOICE — dùng để FE tô xanh đáp án đúng
 * và tô đỏ đáp án học viên đã chọn (nếu sai) khi xem lại sau khi nộp bài.
 * wordChoicePairs: chỉ có giá trị với WORD_CHOICE — toàn bộ cặp lựa chọn kèm correctOption đã
 * lộ, dùng để FE tô xanh/đỏ từng blank trong đoạn văn khi xem lại sau khi nộp bài.
 * sentenceFillBlanks: chỉ có giá trị với SENTENCE_FILL — toàn bộ ô trống kèm correctText,
 * dùng để FE hiển thị đáp án đúng từng ô khi xem lại sau khi nộp bài.
 * dragDropOptions: chỉ có giá trị với DRAG_DROP — toàn bộ thẻ trong ngăn kéo kèm blankOrder
 * thật, dùng để FE tô xanh/đỏ từng thẻ đã thả khi xem lại sau khi nộp bài.
 */
public record AttemptAnswerResultDto(String questionId, String wordId, boolean correct, String correctText,
                                     String correctOptionId, List<WordChoicePairDto> wordChoicePairs,
                                     List<SentenceFillBlankDto> sentenceFillBlanks,
                                     List<DragDropOptionDto> dragDropOptions) {

    public AttemptAnswerResultDto(String questionId, String wordId, boolean correct, String correctText,
                                  String correctOptionId) {
        this(questionId, wordId, correct, correctText, correctOptionId, null, null, null);
    }

    public AttemptAnswerResultDto(String questionId, String wordId, boolean correct, String correctText,
                                  String correctOptionId, List<WordChoicePairDto> wordChoicePairs) {
        this(questionId, wordId, correct, correctText, correctOptionId, wordChoicePairs, null, null);
    }

    public AttemptAnswerResultDto(String questionId, String wordId, boolean correct, String correctText,
                                  String correctOptionId, List<WordChoicePairDto> wordChoicePairs,
                                  List<SentenceFillBlankDto> sentenceFillBlanks) {
        this(questionId, wordId, correct, correctText, correctOptionId, wordChoicePairs, sentenceFillBlanks, null);
    }

    // DRAG_DROP dùng thẳng constructor canonical (8 tham số) ở trên - không cần overload riêng.
}
