package com.elearning.emotion.moderation.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

public interface LanguageToolClient {

    /**
     * Kiểm tra chính tả và ngữ pháp câu văn bằng LanguageTool.
     * Tự động chịu lỗi: Trả về danh sách rỗng nếu dịch vụ ngoại vi chưa sẵn sàng.
     */
    List<LanguageToolMatchDto> checkText(String text, String language);

    /**
     * Kiểm tra xem dịch vụ LanguageTool có đang phản hồi hay không
     */
    boolean isAvailable();

    default boolean isEnabled() {
        return isAvailable();
    }

    default CheckResponse check(String text) {
        List<LanguageToolMatchDto> dtos = checkText(text, "en-US");
        List<MatchItem> items = dtos.stream().map(d -> MatchItem.builder()
                .message(d.getMessage())
                .ruleId(d.getRuleId())
                .offset(d.getOffset())
                .length(d.getLength())
                .issueType(d.getIssueType())
                .replacements(d.getReplacements())
                .build()).toList();
        return CheckResponse.builder().matches(items).build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class CheckResponse {
        @Builder.Default
        private List<MatchItem> matches = Collections.emptyList();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class MatchItem {
        private String message;
        private String ruleId;
        private int offset;
        private int length;
        private String issueType;
        @Builder.Default
        private List<String> replacements = Collections.emptyList();
    }
}
