package com.elearning.emotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Request tong hop: 1 lan goi tao xong ca cau hoi + dap an, khop dung luong form giao vien
 * (khong bat giao vien goi 3-4 API rieng cho 1 cau hoi).
 * Tuy questionKind ma cac field khac nhau duoc dung:
 *   MULTIPLE_CHOICE -> options
 *   FILL_BLANK / DICTATION -> textAnswer
 *   MATCHING -> matchingPairs
 *   WORD_CHOICE -> wordChoicePairs (promptText la doan van day du, danh dau blank bang {{1}},{{2}},...)
 *   SENTENCE_FILL -> sentenceFillBlanks (promptText la cau/doan van, danh dau blank bang {{1}},{{2}},...
 *                    moi blank chi co correctText va hint tuy chon - hoc vien GO vao o trong)
 *   DRAG_DROP -> dragDropOptions (promptText la cau/doan van, danh dau o trong bang {{1}},{{2}},...
 *                the nao co blankOrder la dap an DUNG cho o trong do, the blankOrder=null la moi/distractor)
 */
public record QuestionCreateRequest(
        @NotBlank String contentItemId,
        String passageId,
        @NotBlank String questionKind, // MULTIPLE_CHOICE|FILL_BLANK|MATCHING|DICTATION|WORD_CHOICE|SENTENCE_FILL|DRAG_DROP
        String promptText,
        @Size(max = 255, message = "Nhãn/category tối đa 255 ký tự") String tag, // Nhan/category tuy chon (vi du: "[Part 1] Tranh ta nguoi") cho cac pool luyen tap co phan loai
        String imageMediaId,
        String audioMediaId,
        List<AnswerOptionRequest> options,
        TextAnswerRequest textAnswer,
        List<MatchingPairRequest> matchingPairs,
        List<WordChoicePairRequest> wordChoicePairs,
        List<SentenceFillBlankRequest> sentenceFillBlanks,
        List<DragDropOptionRequest> dragDropOptions,
        String explanation // Giai thich dap an (tuy chon) - giao vien co the them de giai thich tai sao dap an la dung
) {}
