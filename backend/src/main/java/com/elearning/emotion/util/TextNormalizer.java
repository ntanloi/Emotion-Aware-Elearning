package com.elearning.emotion.util;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Tiện ích chuẩn hóa văn bản rà soát từ khóa theo quy chuẩn Mục 5 SPEC.md
 */
public final class TextNormalizer {

    private static final Pattern ZERO_WIDTH_CHARS = Pattern.compile("[\\u200B-\\u200D\\uFEFF\\u00AD]");
    private static final Pattern MULTI_WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern REPEATED_CHARS = Pattern.compile("(.)\\1{2,}");

    private TextNormalizer() {}

    /**
     * Chuẩn hóa chuẩn mực (Unicode NFC, hạ chữ thường, xóa zero-width, gom khoảng trắng)
     */
    public static String normalizeBase(String input) {
        if (input == null) return "";
        // 1. Unicode NFC & Lowercase
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFC).toLowerCase();
        // 2. Xóa zero-width
        normalized = ZERO_WIDTH_CHARS.matcher(normalized).replaceAll("");
        // 3. Gom khoảng trắng
        normalized = MULTI_WHITESPACE.matcher(normalized).replaceAll(" ").trim();
        return normalized;
    }

    /**
     * Chuẩn hóa chống lách luật / ngụy trang (Leetspeak, dấu chen giữa, gom ký tự lặp)
     */
    public static String normalizeDeobfuscated(String input) {
        if (input == null) return "";
        String text = normalizeBase(input);

        // Gom ký tự lặp >= 3 lần về 2 lần (vd: vcccl -> vccl, đụuuu -> đụu)
        text = REPEATED_CHARS.matcher(text).replaceAll("$1$1");

        // Thay thế ký tự leetspeak phổ biến
        text = text.replace('@', 'a')
                .replace('$', 's')
                .replace('0', 'o')
                .replace('1', 'i')
                .replace('3', 'e')
                .replace('4', 'a');

        // 3. Bỏ dấu chấm, dấu sao, gạch ngang, gạch dưới chen giữa các chữ cái (vd: đ.m -> đm, f*ck -> fck)
        text = text.replaceAll("(?<=[\\p{L}\\p{N}])([.*_\\-])(?=[\\p{L}\\p{N}])", "");

        // 4. Ghép các ký tự đơn lẻ cách nhau bởi khoảng trắng (vd: 'f u c k' -> 'fuck', 'đ m' -> 'đm', 'c ặ c' -> 'cặc')
        // Dùng regex tìm chuỗi >= 2 ký tự đơn lẻ liên tiếp phân tách bởi dấu cách:
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?<!\\p{L})\\p{L}(?:\\s+\\p{L})+(?!\\p{L})").matcher(text);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String matched = m.group();
            m.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(matched.replaceAll("\\s+", "")));
        }
        m.appendTail(sb);
        text = sb.toString();

        return text;
    }

    /**
     * Kiểm tra xem một đoạn văn bản có chứa một từ/cụm từ theo ranh giới từ (Word Boundary) hay không
     * Đối với tiếng Việt, ranh giới từ là ký tự không phải chữ/số/dấu tiếng Việt
     */
    public static boolean containsWord(String source, String word) {
        if (source == null || word == null || word.isBlank()) return false;
        String cleanSource = " " + normalizeBase(source) + " ";
        String cleanWord = normalizeBase(word);
        
        // Tạo regex ranh giới từ an toàn cho cả ký tự Unicode tiếng Việt
        String regex = "(?i)(?<=^|[^\\p{L}\\p{N}_])" + Pattern.quote(cleanWord) + "(?=[^\\p{L}\\p{N}_]|$)";
        return Pattern.compile(regex).matcher(cleanSource).find();
    }
}
