package com.elearning.emotion.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Sua 1 cau hoi da tao. Khac voi cac Update DTO khac (khong dung quy uoc "null = giu nguyen")
 * vi cau truc dap an qua phuc tap de "vá" tung phan - QuestionService.update() se XOA HET
 * options/textAnswer/matchingPairs CU roi tao lai theo dung noi dung moi, don gian va an toan
 * hon nhieu so voi "diff" tung AnswerOption.
 */
public record QuestionUpdateRequest(
        String passageId,
        String questionKind, // giu nguyen kieu cu neu null
        String promptText,
        @Size(max = 255, message = "Nhãn/category tối đa 255 ký tự") String tag,
        String imageMediaId,
        String audioMediaId,
        List<AnswerOptionRequest> options,
        TextAnswerRequest textAnswer,
        List<MatchingPairRequest> matchingPairs,
        List<WordChoicePairRequest> wordChoicePairs,
        List<SentenceFillBlankRequest> sentenceFillBlanks,
        List<DragDropOptionRequest> dragDropOptions,
        String explanation // Giai thich dap an (tuy chon)
) {}
