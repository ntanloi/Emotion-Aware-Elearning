package com.elearning.emotion.moderation.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class HttpLanguageToolClient implements LanguageToolClient {

    private final String url;
    private final boolean enabled;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final Map<String, List<LanguageToolMatchDto>> cache = new ConcurrentHashMap<>();

    private volatile boolean lastAvailable = true;

    public HttpLanguageToolClient(
            @Value("${app.moderation.languagetool.url:http://localhost:8010/v2/check}") String url,
            @Value("${app.moderation.languagetool.enabled:true}") boolean enabled,
            @Value("${app.moderation.languagetool.timeout-ms:3000}") int timeoutMs,
            ObjectMapper objectMapper) {
        this.url = url;
        this.enabled = enabled;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public List<LanguageToolMatchDto> checkText(String text, String language) {
        if (!enabled || text == null || text.isBlank()) {
            return Collections.emptyList();
        }

        String lang = (language != null && !language.isBlank()) ? language : "en-US";
        String cacheKey = lang + ":" + text.trim();
        if (cache.containsKey(cacheKey)) {
            return cache.get(cacheKey);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("text", text);
            body.add("language", lang);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                lastAvailable = true;
                List<LanguageToolMatchDto> matches = parseMatches(response.getBody());
                cache.put(cacheKey, matches);
                return matches;
            }
        } catch (Exception ex) {
            if (lastAvailable) {
                log.warn("Không thể kết nối dịch vụ LanguageTool tại {}: {}. Kích hoạt chế độ chịu lỗi (Graceful degradation).",
                        url, ex.getMessage());
                lastAvailable = false;
            }
        }

        return Collections.emptyList();
    }

    @Override
    public boolean isAvailable() {
        return enabled && lastAvailable;
    }

    private List<LanguageToolMatchDto> parseMatches(String responseBody) {
        List<LanguageToolMatchDto> list = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode matchesNode = root.path("matches");
            if (matchesNode.isArray()) {
                for (JsonNode m : matchesNode) {
                    List<String> replacements = new ArrayList<>();
                    JsonNode replNode = m.path("replacements");
                    if (replNode.isArray()) {
                        for (JsonNode r : replNode) {
                            if (r.has("value")) replacements.add(r.path("value").asText());
                        }
                    }

                    JsonNode ruleNode = m.path("rule");
                    list.add(LanguageToolMatchDto.builder()
                            .message(m.path("message").asText())
                            .shortMessage(m.path("shortMessage").asText(null))
                            .offset(m.path("offset").asInt(0))
                            .length(m.path("length").asInt(0))
                            .ruleId(ruleNode.path("id").asText(""))
                            .ruleDescription(ruleNode.path("description").asText(""))
                            .issueType(ruleNode.path("issueType").asText("typographical"))
                            .replacements(replacements)
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi phân tích phản hồi từ LanguageTool: {}", e.getMessage());
        }
        return list;
    }
}
