package com.elearning.emotion.moderation.client;

import lombok.Setter;

public class FakeLlmClient implements ModerationLlmClient {

    @Setter
    private boolean enabled = true;

    @Setter
    private String customResponse = null;

    @Override
    public LlmAnalysisResponse callLlm(String ruleId, String promptVersion, String promptTemplate, String dataJson, String contentHash) {
        if (!enabled) {
            return LlmAnalysisResponse.failed("Fake LLM disabled", "fake-model", promptVersion);
        }

        if (customResponse != null) {
            return LlmAnalysisResponse.builder()
                    .success(true)
                    .rawJson(customResponse)
                    .model("fake-model")
                    .promptVersion(promptVersion)
                    .build();
        }

        String json = "{}";
        switch (ruleId) {
            case "AI-01":
                json = "{\"pred\":\"A\",\"key_ok\":true,\"confidence\":0.95,\"reason\":\"Lựa chọn A là chính xác theo cấu trúc ngữ pháp.\"}";
                break;
            case "AI-02":
                json = "{\"ambiguous\":false,\"options_ok\":[\"A\"],\"reason\":\"Chỉ có một đáp án đúng duy nhất.\"}";
                break;
            case "AI-03":
                json = "{\"explanation_ok\":true,\"issue\":\"\"}";
                break;
            case "AI-04":
                json = "{\"topic_match\":true,\"suspicious_statements\":[]}";
                break;
            case "AI-05":
                json = "{\"meaning_ok\":true,\"confidence\":0.98,\"better\":\"\"}";
                break;
            case "AI-06":
                json = "{\"category\":\"SAFE\",\"severity\":\"INFO\",\"quote\":\"\",\"reason\":\"Ngữ cảnh giáo dục an toàn.\"}";
                break;
            case "AI-07":
                json = "{\"fit\":true,\"note\":\"Văn phong phù hợp bài thi TOEIC.\"}";
                break;
            case "AI-08":
                json = "{\"claims_mismatch\":[]}";
                break;
        }

        return LlmAnalysisResponse.builder()
                .success(true)
                .rawJson(json)
                .model("fake-model")
                .promptVersion(promptVersion)
                .build();
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public String getModel() {
        return "fake-model";
    }

    @Override
    public String getProvider() {
        return "fake";
    }
}
