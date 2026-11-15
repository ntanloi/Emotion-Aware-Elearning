package com.elearning.emotion.moderation;

import com.elearning.emotion.moderation.client.HttpAiServiceVocabClient;
import com.elearning.emotion.moderation.client.VocabCheckItemDto;
import com.elearning.emotion.moderation.client.VocabCheckResultDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AiServiceVocabClientTest {

    @Test
    @DisplayName("AiServiceVocabClient: Chế độ chịu lỗi khi ai-service chưa khởi động")
    void testGracefulDegradationWhenAiServiceDown() {
        HttpAiServiceVocabClient client = new HttpAiServiceVocabClient(
                "http://localhost:59998",
                true,
                "test-secret",
                500,
                new ObjectMapper()
        );

        VocabCheckItemDto item = VocabCheckItemDto.builder()
                .word("abandon")
                .partOfSpeech("verb")
                .build();

        Map<String, VocabCheckResultDto> res = client.checkVocabBatch(Collections.singletonList(item));
        assertNotNull(res);
        assertTrue(res.isEmpty());
        assertFalse(client.isAvailable());

        List<String> lemmas = client.getLemmas("The dog was running");
        assertNotNull(lemmas);
        assertTrue(lemmas.isEmpty());
    }
}
