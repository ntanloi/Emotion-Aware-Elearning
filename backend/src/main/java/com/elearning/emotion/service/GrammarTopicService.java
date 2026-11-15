package com.elearning.emotion.service;

import com.elearning.emotion.entity.GrammarTopic;
import com.elearning.emotion.repository.GrammarTopicRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GrammarTopicService {

    private final GrammarTopicRepository grammarTopicRepository;
    private final ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        try {
            seedTopicsIfEmpty();
        } catch (Exception e) {
            log.error("Không thể khởi tạo GrammarTopicService: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void seedTopicsIfEmpty() {
        if (grammarTopicRepository.count() > 0) {
            log.info("Bảng grammar_topics đã có dữ liệu, bỏ qua seed.");
            return;
        }

        ClassPathResource resource = new ClassPathResource("moderation/grammar_topics.seed.csv");
        if (!resource.exists()) {
            log.warn("Không tìm thấy file moderation/grammar_topics.seed.csv");
            return;
        }

        List<GrammarTopic> topics = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (firstLine) {
                    firstLine = false;
                    continue; // Skip header
                }
                if (line.isBlank() || line.startsWith("#")) continue;

                String[] parts = parseCsvLine(line);
                if (parts.length >= 8) {
                    String code = parts[0].trim();
                    String titleVi = parts[1].trim();
                    String descriptionVi = parts[2].trim();
                    String rawKeywordsEn = parts[3].trim();
                    String rawKeywordsVi = parts[4].trim();
                    String goodExample = parts[5].trim();
                    String badExample = parts[6].trim();
                    int sortOrder = parseIntSafe(parts[7].trim(), 0);
                    boolean reviewed = parts.length >= 9 && ("1".equals(parts[8].trim()) || "true".equalsIgnoreCase(parts[8].trim()));

                    // Chuyển chuỗi phân tách bằng dấu | thành mảng JSON
                    String jsonEn = toJsonArray(rawKeywordsEn);
                    String jsonVi = toJsonArray(rawKeywordsVi);

                    topics.add(GrammarTopic.builder()
                            .code(code)
                            .titleVi(titleVi)
                            .descriptionVi(descriptionVi)
                            .keywordsEn(jsonEn)
                            .keywordsVi(jsonVi)
                            .goodExample(goodExample.isEmpty() ? null : goodExample)
                            .badExample(badExample.isEmpty() ? null : badExample)
                            .sortOrder(sortOrder)
                            .reviewed(reviewed)
                            .build());
                }
            }
            if (!topics.isEmpty()) {
                grammarTopicRepository.saveAll(topics);
                log.info("Đã nạp thành công {} chủ điểm ngữ pháp vào grammar_topics", topics.size());
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc file grammar_topics.seed.csv: {}", e.getMessage(), e);
        }
    }

    public List<GrammarTopic> getAllTopics() {
        return grammarTopicRepository.findAllByOrderBySortOrderAsc();
    }

    public Optional<GrammarTopic> getTopicByCode(String code) {
        if (code == null) return Optional.empty();
        return grammarTopicRepository.findById(code);
    }

    private String toJsonArray(String pipeSeparated) {
        if (pipeSeparated == null || pipeSeparated.isBlank()) return "[]";
        String[] arr = pipeSeparated.split("\\|");
        List<String> list = Arrays.stream(arr).map(String::trim).filter(s -> !s.isEmpty()).toList();
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private int parseIntSafe(String val, int def) {
        try {
            return Integer.parseInt(val);
        } catch (Exception e) {
            return def;
        }
    }

    private String[] parseCsvLine(String line) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                tokens.add(sb.toString());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        tokens.add(sb.toString());
        return tokens.toArray(new String[0]);
    }
}
