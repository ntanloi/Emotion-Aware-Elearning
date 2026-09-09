package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Question;
import java.util.List;

public record QuestionDto(
        String id, String contentItemId, String passageId, String questionKind,
        String promptText, String tag, String imageUrl, String audioUrl, Integer orderIndex,
        List<AnswerOptionDto> options, String hint, String correctText, List<MatchingPairDto> matchingPairs,
        List<WordChoicePairDto> wordChoicePairs, List<SentenceFillBlankDto> sentenceFillBlanks,
        List<DragDropOptionDto> dragDropOptions, String explanation
) {
    /**
     * correctText: dap an dung dang chu (FILL_BLANK/DICTATION) - CHI truyen gia tri thuc cho
     * GIANG VIEN xem lai (toTeacherDto). Ben HOC VIEN (toStudentDto) PHAI truyen null o day de
     * khong lo dap an truoc khi lam bai. Tuong tu, wordChoicePairs[].correctOption cung PHAI
     * la null o toStudentDto (xem WordChoicePairDto.forStudent). sentenceFillBlanks[].correctText
     * cung PHAI la null o toStudentDto (xem SentenceFillBlankDto.forStudent). dragDropOptions[].blankOrder
     * cung PHAI la null o toStudentDto (xem DragDropOptionDto.forStudent) de khong lo the nao khop
     * o trong nao truoc khi hoc vien keo tha.
     *
     * explanation: giai thich dap an (tuy chon) - CHI truyen cho GIANG VIEN (toTeacherDto) va
     * truyen NULL cho HOC VIEN (toStudentDto) truoc khi kiem tra dap an. Sau khi hoc vien bam
     * "Kiem tra dap an" (checkAnswer API), explanation se duoc tra ve cung voi correctText/correctOptionId.
     */
    public static QuestionDto build(Question q, List<AnswerOptionDto> options, String hint,
                                    String correctText, List<MatchingPairDto> pairs,
                                    List<WordChoicePairDto> wordChoicePairs, String explanation) {
        return new QuestionDto(
                q.getId(), q.getContentItem().getId(),
                q.getPassage() != null ? q.getPassage().getId() : null,
                q.getQuestionKind(), q.getPromptText(), q.getTag(),
                q.getImage() != null ? q.getImage().getUrl() : null,
                q.getAudio() != null ? q.getAudio().getUrl() : null,
                q.getOrderIndex(), options, hint, correctText, pairs, wordChoicePairs, List.of(), List.of(), explanation
        );
    }

    public static QuestionDto buildWithSentenceFill(Question q, List<SentenceFillBlankDto> sentenceFillBlanks, String explanation) {
        return new QuestionDto(
                q.getId(), q.getContentItem().getId(),
                q.getPassage() != null ? q.getPassage().getId() : null,
                q.getQuestionKind(), q.getPromptText(), q.getTag(),
                q.getImage() != null ? q.getImage().getUrl() : null,
                q.getAudio() != null ? q.getAudio().getUrl() : null,
                q.getOrderIndex(), List.of(), null, null, List.of(), List.of(), sentenceFillBlanks, List.of(), explanation
        );
    }

    public static QuestionDto buildWithDragDrop(Question q, List<DragDropOptionDto> dragDropOptions, String explanation) {
        return new QuestionDto(
                q.getId(), q.getContentItem().getId(),
                q.getPassage() != null ? q.getPassage().getId() : null,
                q.getQuestionKind(), q.getPromptText(), q.getTag(),
                q.getImage() != null ? q.getImage().getUrl() : null,
                q.getAudio() != null ? q.getAudio().getUrl() : null,
                q.getOrderIndex(), List.of(), null, null, List.of(), List.of(), List.of(), dragDropOptions, explanation
        );
    }
}
