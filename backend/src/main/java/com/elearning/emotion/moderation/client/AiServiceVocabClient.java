package com.elearning.emotion.moderation.client;

import java.util.List;
import java.util.Map;

public interface AiServiceVocabClient {

    /**
     * Kiểm tra một lô từ vựng tiếng Anh qua microservice AI (WordNet, CMUdict, WordFreq).
     * @return Bản đồ tra cứu theo chữ thường của từ vựng
     */
    Map<String, VocabCheckResultDto> checkVocabBatch(List<VocabCheckItemDto> items);

    /**
     * Tách dạng gốc (lemmas) của các từ trong văn bản để kiểm tra quan hệ từ vựng
     */
    List<String> getLemmas(String text);

    /**
     * Kiểm tra xem dịch vụ AI có đang hoạt động hay không
     */
    boolean isAvailable();
}
