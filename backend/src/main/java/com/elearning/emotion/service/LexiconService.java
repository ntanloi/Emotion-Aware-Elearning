package com.elearning.emotion.service;

import com.elearning.emotion.entity.ModerationLexicon;
import com.elearning.emotion.repository.ModerationLexiconRepository;
import com.elearning.emotion.util.TextNormalizer;
import jakarta.annotation.PostConstruct;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class LexiconService {

    private final ModerationLexiconRepository lexiconRepository;

    @Getter
    @Builder
    public static class CompiledLexiconRule {
        private String id;
        private String category;
        private String matchType;
        private String rawPattern;
        private String severity;
        private String scope;
        private Pattern compiledPattern;
    }

    @Getter
    @Builder
    public static class LexiconMatch {
        private String category;
        private String severity;
        private String matchedWord;
        private String scope;
        private String note;
    }

    private final List<CompiledLexiconRule> activeRules = new ArrayList<>();

    @PostConstruct
    public void init() {
        try {
            seedLexiconIfEmpty();
            reloadCache();
        } catch (Exception e) {
            log.error("Không thể khởi tạo LexiconService: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void seedLexiconIfEmpty() {
        if (lexiconRepository.count() > 0) {
            log.info("Bảng moderation_lexicon đã có dữ liệu, bỏ qua seed.");
            return;
        }

        ClassPathResource resource = new ClassPathResource("moderation/lexicon.seed.csv");
        if (!resource.exists()) {
            log.warn("Không tìm thấy file moderation/lexicon.seed.csv");
            return;
        }

        List<ModerationLexicon> items = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (firstLine) {
                    firstLine = false;
                    continue; // Skip header
                }
                if (line.isBlank() || line.startsWith("#")) continue;

                // Parse CSV đơn giản có hỗ trợ quote
                String[] parts = parseCsvLine(line);
                if (parts.length >= 7) {
                    String category = parts[0].trim();
                    String matchType = parts[1].trim();
                    String pattern = parts[2].trim();
                    String severity = parts[3].trim();
                    String lang = parts[4].trim();
                    String scope = parts[5].trim();
                    boolean active = "1".equals(parts[6].trim()) || "true".equalsIgnoreCase(parts[6].trim());
                    String note = parts.length >= 8 ? parts[7].trim() : null;

                    items.add(ModerationLexicon.builder()
                            .category(category)
                            .matchType(matchType)
                            .pattern(pattern)
                            .severity(severity)
                            .lang(lang)
                            .scope(scope.isBlank() ? "ALL" : scope)
                            .active(active)
                            .note(note)
                            .build());
                }
            }
            if (!items.isEmpty()) {
                // Lưu từng dòng: 1 dòng trùng khoá (uq_lex) không được làm hỏng cả lô như saveAll
                int ok = 0, skipped = 0;
                for (ModerationLexicon item : items) {
                    try {
                        lexiconRepository.save(item);
                        ok++;
                    } catch (org.springframework.dao.DataIntegrityViolationException dup) {
                        skipped++;
                        log.warn("Bỏ qua từ khóa trùng khóa unique khi seed: {} / {} / {}",
                                item.getCategory(), item.getMatchType(), item.getPattern());
                    }
                }
                log.info("Đã nạp {} từ khóa vào moderation_lexicon (bỏ qua {} dòng trùng)", ok, skipped);
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc file lexicon.seed.csv: {}", e.getMessage(), e);
        }
    }

    public synchronized void reloadCache() {
        activeRules.clear();
        List<ModerationLexicon> lexicons = lexiconRepository.findByActiveTrue();

        for (ModerationLexicon lex : lexicons) {
            try {
                Pattern p;
                String pat = lex.getPattern().trim();
                if ("REGEX".equalsIgnoreCase(lex.getMatchType())) {
                    p = Pattern.compile(pat, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
                } else {
                    // WORD hoặc PHRASE: So khớp theo ranh giới từ (Word Boundary)
                    String quoted = Pattern.quote(pat.toLowerCase());
                    String regex = "(?i)(?<=^|[^\\p{L}\\p{N}_])" + quoted + "(?=[^\\p{L}\\p{N}_]|$)";
                    p = Pattern.compile(regex, Pattern.UNICODE_CASE);
                }

                activeRules.add(CompiledLexiconRule.builder()
                        .id(lex.getId())
                        .category(lex.getCategory())
                        .matchType(lex.getMatchType())
                        .rawPattern(lex.getPattern())
                        .severity(lex.getSeverity())
                        .scope(lex.getScope())
                        .compiledPattern(p)
                        .build());
            } catch (Exception ex) {
                log.warn("Không thể biên dịch regex cho từ khóa '{}': {}", lex.getPattern(), ex.getMessage());
            }
        }
        log.info("Biên dịch thành công {} luật từ khóa trong bộ nhớ", activeRules.size());
    }

    /**
     * Quét văn bản theo phạm vi (ALL | TITLE_DESC | BODY | QUESTION) - Bỏ qua mức CONTEXT
     */
    public List<LexiconMatch> scan(String text, String targetScope) {
        return scan(text, targetScope, false);
    }

    /**
     * Quét văn bản theo phạm vi, tùy chọn có lấy mức CONTEXT hay không
     */
    public List<LexiconMatch> scan(String text, String targetScope, boolean includeContext) {
        if (text == null || text.isBlank()) return Collections.emptyList();

        String normBase = TextNormalizer.normalizeBase(text);
        String normDeobf = TextNormalizer.normalizeDeobfuscated(text);

        List<LexiconMatch> matches = new ArrayList<>();
        Set<String> deduplicateKey = new HashSet<>();

        for (CompiledLexiconRule rule : activeRules) {
            // Mức CONTEXT không tự tạo lỗi; chỉ đánh dấu khi được yêu cầu (LLM)
            if (!includeContext && "CONTEXT".equalsIgnoreCase(rule.getSeverity())) {
                continue;
            }

            // Kiểm tra scope
            if (!"ALL".equalsIgnoreCase(rule.getScope()) && targetScope != null && !rule.getScope().equalsIgnoreCase(targetScope)) {
                continue;
            }

            Matcher m1 = rule.getCompiledPattern().matcher(normBase);
            boolean found = m1.find();
            String matchedString = found ? m1.group() : null;

            if (!found) {
                Matcher m2 = rule.getCompiledPattern().matcher(normDeobf);
                if (m2.find()) {
                    found = true;
                    matchedString = m2.group();
                }
            }

            if (found) {
                String dedup = rule.getCategory() + ":" + rule.getRawPattern();
                if (!deduplicateKey.contains(dedup)) {
                    deduplicateKey.add(dedup);
                    matches.add(LexiconMatch.builder()
                            .category(rule.getCategory())
                            .severity(rule.getSeverity())
                            .matchedWord(matchedString)
                            .scope(targetScope)
                            .note("Khớp mẫu '" + rule.getRawPattern() + "' (" + rule.getCategory() + ")")
                            .build());
                }
            }
        }

        return matches;
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