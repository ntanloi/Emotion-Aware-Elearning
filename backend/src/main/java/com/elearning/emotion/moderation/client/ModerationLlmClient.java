package com.elearning.emotion.moderation.client;

public interface ModerationLlmClient {

    /**
     * Gọi mô hình LLM để phân tích nội dung khóa học theo nhiệm vụ và dữ liệu JSON
     * @param ruleId Mã luật (AI-01 .. AI-08)
     * @param promptVersion Phiên bản prompt (vd: v1.0)
     * @param promptTemplate Nội dung prompt
     * @param dataJson Dữ liệu đầu vào cần kiểm tra
     * @param contentHash Mã băm của nội dung phục vụ bộ nhớ đệm
     * @return Phản hồi dạng JSON chuẩn kèm metadata
     */
    LlmAnalysisResponse callLlm(String ruleId, String promptVersion, String promptTemplate, String dataJson, String contentHash);

    /**
     * Kiểm tra xem tầng phân tích LLM có đang được kích hoạt cấu hình hay không
     */
    boolean isEnabled();

    String getModel();

    String getProvider();
}
