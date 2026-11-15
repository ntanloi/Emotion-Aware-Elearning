package com.elearning.emotion.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Dịch vụ kiểm duyệt nội dung đánh giá tự động (Phase 3):
 * - Phát hiện số điện thoại (tránh lôi kéo, lộ thông tin cá nhân).
 * - Phát hiện liên kết web (URL, domain spam, lừa đảo).
 * - Phát hiện từ ngữ thô tục, xúc phạm hoặc spam.
 */
@Service
@Slf4j
public class ReviewContentFilterService {

    // Pattern số điện thoại Việt Nam (liền hoặc có dấu cách/chấm/gạch nối)
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:\\+?84|0)[\\s.-]?[1-9][0-9]{1,2}[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{3,4}|\\b0[0-9]{9,10}\\b"
    );

    // Pattern liên kết web, url, domain
    private static final Pattern URL_PATTERN = Pattern.compile(
            "(?i)\\b(?:https?://|ftp://|www\\.)\\S+|\\b[a-zA-Z0-9.-]+\\.(?:com|vn|net|org|edu|xyz|top|site|online|me|info|biz)\\b"
    );

    // Danh sách từ khóa thô tục / cấm kỵ (tiếng Việt có dấu và không dấu)
    private static final List<String> PROFANITY_KEYWORDS = List.of(
            "đm", "dm", "đcm", "dcm", "vcl", "vkl", "đkm", "dkm",
            "địt", "dit", "đụ", "du ma", "đụ má", "lồn", "lon", "buồi", "buoi",
            "cặc", "cac", "chó chết", "đĩ", "di", "mẹ mày", "me may", "óc chó", "oc cho",
            "lừa đảo", "lua dao", "đa cấp", "da cap", "scam"
    );

    public record FilterResult(
            boolean flagged,
            String reason,
            String matchedSnippet
    ) {
        public static FilterResult clean() {
            return new FilterResult(false, null, null);
        }

        public static FilterResult violation(String reason, String matchedSnippet) {
            return new FilterResult(true, reason, matchedSnippet);
        }
    }

    /**
     * Kiểm tra nội dung bình luận của đánh giá
     */
    public FilterResult inspect(String text) {
        if (text == null || text.isBlank()) {
            return FilterResult.clean();
        }

        // 1. Kiểm tra số điện thoại
        Matcher phoneMatcher = PHONE_PATTERN.matcher(text);
        if (phoneMatcher.find()) {
            String snippet = phoneMatcher.group();
            log.info("Phát hiện số điện thoại trong đánh giá: {}", snippet);
            return FilterResult.violation("Chứa số điện thoại liên hệ cá nhân", snippet);
        }

        // 2. Kiểm tra liên kết web / link ngoài
        Matcher urlMatcher = URL_PATTERN.matcher(text);
        if (urlMatcher.find()) {
            String snippet = urlMatcher.group();
            log.info("Phát hiện liên kết web trong đánh giá: {}", snippet);
            return FilterResult.violation("Chứa liên kết trang web hoặc domain ngoài", snippet);
        }

        // 3. Kiểm tra từ ngữ thô tục / xúc phạm
        String normalized = removeAccents(text).toLowerCase();
        String originalLower = text.toLowerCase();

        for (String kw : PROFANITY_KEYWORDS) {
            Pattern wordPattern = Pattern.compile("\\b" + Pattern.quote(kw) + "\\b", Pattern.CASE_INSENSITIVE);
            if (wordPattern.matcher(originalLower).find() || wordPattern.matcher(normalized).find()) {
                log.info("Phát hiện từ khóa nhạy cảm trong đánh giá: {}", kw);
                return FilterResult.violation("Chứa từ ngữ thô tục hoặc không phù hợp", kw);
            }
        }

        return FilterResult.clean();
    }

    private static String removeAccents(String s) {
        if (s == null) return "";
        String normalized = Normalizer.normalize(s, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "").replace('đ', 'd').replace('Đ', 'D');
    }
}
