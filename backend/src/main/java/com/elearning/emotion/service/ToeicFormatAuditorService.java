package com.elearning.emotion.service;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToeicFormatAuditorService {

    private final ContentItemRepository contentItemRepository;
    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final CourseRepository courseRepository;
    private final ObjectMapper objectMapper;

    // Pattern số điện thoại Việt Nam
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:\\+?84|0)[\\s.-]?[1-9][0-9]{1,2}[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{3,4}|\\b0[0-9]{9,10}\\b"
    );

    // Pattern liên kết web, url, domain, mạng xã hội
    private static final Pattern URL_PATTERN = Pattern.compile(
            "(?i)\\b(?:https?://|ftp://|www\\.)\\S+|\\b[a-zA-Z0-9.-]+\\.(?:com|vn|net|org|edu|xyz|top|site|online|me|info|biz)\\b|\\b(?:zalo|facebook|telegram|t\\.me)\\b"
    );

    // Pattern phát hiện mâu thuẫn giữa đáp án và lời giải thích
    private static final Pattern EXPLANATION_KEY_PATTERN = Pattern.compile(
            "(?i)\\b(?:chọn|đáp án|phương án|key|chọn đáp án)\\s*[:\\-\\s]*([A-D])\\b"
    );

    @Data
    @Builder
    public static class AuditIssue {
        private String level; // ERROR | WARNING | INFO
        private String checkType; // RULE_FORMAT | AI_CONTENT | AI_CONSISTENCY
        private String section; // Metadata | Video | Questions | Vocabulary
        private String targetId;
        private String targetTitle;
        private String message;
        private String suggestion;
        private Float confidence; // Độ tin cậy (0.0 - 1.0)
    }

    @Data
    @Builder
    public static class AuditReport {
        private String status; // PASSED | NEEDS_ATTENTION | FAILED
        private String riskLevel; // LOW | MEDIUM | HIGH
        private int riskScore; // 0 - 100
        private int totalChecks;
        private int passedChecks;
        private int errorCount;
        private int warningCount;
        private String contentHash;
        private List<AuditIssue> issues;
        private Map<String, Object> statistics;
    }

    /**
     * P2-1 & P2-2: Quét kiểm tra toàn diện cấu trúc, quy chuẩn TOEIC và đọc nội dung AI
     */
    public String auditCourse(Course course) {
        List<AuditIssue> issues = new ArrayList<>();
        Map<String, Object> stats = new HashMap<>();

        int totalChecks = 0;
        int failedChecks = 0;

        // 1. Kiểm tra Metadata khóa học
        totalChecks++;
        if (course.getTitle() == null || course.getTitle().trim().length() < 5) {
            failedChecks++;
            issues.add(AuditIssue.builder()
                    .level("ERROR")
                    .checkType("RULE_FORMAT")
                    .section("Metadata")
                    .message("Tiêu đề khóa học quá ngắn hoặc để trống (dưới 5 ký tự)")
                    .suggestion("Cần đặt tiêu đề rõ ràng, ví dụ: 'Luyện thi TOEIC Cấp tốc 650+'")
                    .confidence(1.0f)
                    .build());
        }

        totalChecks++;
        if (course.getDescription() == null || course.getDescription().trim().length() < 20) {
            failedChecks++;
            issues.add(AuditIssue.builder()
                    .level("WARNING")
                    .checkType("RULE_FORMAT")
                    .section("Metadata")
                    .message("Mô tả khóa học còn sơ sài (dưới 20 ký tự)")
                    .suggestion("Bổ sung mục tiêu đầu ra và lộ trình bài giảng cho học viên")
                    .confidence(1.0f)
                    .build());
        }

        totalChecks++;
        if (course.getCoverMedia() == null) {
            failedChecks++;
            issues.add(AuditIssue.builder()
                    .level("WARNING")
                    .checkType("RULE_FORMAT")
                    .section("Metadata")
                    .message("Chưa tải ảnh bìa minh họa (Cover Image)")
                    .suggestion("Cung cấp ảnh bìa chuẩn tỷ lệ 16:9 để thu hút học viên")
                    .confidence(1.0f)
                    .build());
        }

        // P2-1: Kiểm tra trùng tiêu đề với khóa học khác đã xuất bản
        totalChecks++;
        if (course.getTitle() != null && !course.getTitle().isBlank()) {
            List<Course> sameTitle = courseRepository.findByStatus("PUBLISHED").stream()
                    .filter(c -> !c.getId().equals(course.getId()) && c.getTitle().equalsIgnoreCase(course.getTitle().trim()))
                    .toList();
            if (!sameTitle.isEmpty()) {
                failedChecks++;
                issues.add(AuditIssue.builder()
                        .level("WARNING")
                        .checkType("RULE_FORMAT")
                        .section("Metadata")
                        .message("Tiêu đề bị trùng lặp với một khóa học đã xuất bản trên hệ thống")
                        .suggestion("Nên đặt tiêu đề mang nét đặc trưng riêng để tránh gây nhầm lẫn cho học viên")
                        .confidence(1.0f)
                        .build());
            }
        }

        // P2-2: AI Content Moderation - Quét thông tin cá nhân / quảng cáo / spam trong Tiêu đề & Mô tả
        totalChecks += 2;
        inspectTextContent(course.getTitle(), "Tiêu đề khóa học", null, issues);
        inspectTextContent(course.getDescription(), "Mô tả khóa học", null, issues);

        // 2. Kiểm tra Cây nội dung (ContentItems)
        List<ContentItem> items = contentItemRepository.findByCourseId(course.getId());
        stats.put("totalContentItems", items.size());

        totalChecks++;
        if (items.isEmpty()) {
            failedChecks++;
            issues.add(AuditIssue.builder()
                    .level("ERROR")
                    .checkType("RULE_FORMAT")
                    .section("ContentTree")
                    .message("Khóa học chưa có bất kỳ bài giảng hoặc bài tập nào")
                    .suggestion("Thêm ít nhất 1 bài giảng video hoặc bộ đề thực hành")
                    .confidence(1.0f)
                    .build());
        }

        long videoCount = items.stream().filter(i -> "VIDEO_LECTURE".equals(i.getType())).count();
        long practiceCount = items.stream().filter(i -> "PRACTICE_TEST".equals(i.getType())).count();
        long vocabCount = items.stream().filter(i -> "VOCAB_SET".equals(i.getType())).count();
        long dictationCount = items.stream().filter(i -> "DICTATION_SET".equals(i.getType())).count();

        stats.put("videoLectures", videoCount);
        stats.put("practiceTests", practiceCount);
        stats.put("vocabSets", vocabCount);
        stats.put("dictationSets", dictationCount);

        totalChecks++;
        if (videoCount == 0) {
            failedChecks++;
            issues.add(AuditIssue.builder()
                    .level("WARNING")
                    .checkType("RULE_FORMAT")
                    .section("Video")
                    .message("Khóa học chưa có video bài giảng nào")
                    .suggestion("Bổ sung video bài giảng kèm AI phân tích cảm xúc để đạt hiệu quả học tập cao nhất")
                    .confidence(1.0f)
                    .build());
        }

        // 3. Kiểm tra chuyên sâu Format TOEIC và AI đọc câu hỏi
        int totalQuestions = 0;
        int questionsWithoutCorrectAnswer = 0;
        int questionsWithoutExplanation = 0;

        Set<String> seenPrompts = new HashSet<>();

        for (ContentItem item : items) {
            String secCode = item.getSectionCode() != null ? item.getSectionCode().toUpperCase() : "";

            if ("PRACTICE_TEST".equals(item.getType()) || "DICTATION_SET".equals(item.getType())) {
                List<Question> questions = questionRepository.findByContentItemIdOrderByOrderIndex(item.getId());
                totalQuestions += questions.size();

                totalChecks++;
                if (questions.isEmpty()) {
                    failedChecks++;
                    issues.add(AuditIssue.builder()
                            .level("WARNING")
                            .checkType("RULE_FORMAT")
                            .section("Questions")
                            .targetId(item.getId())
                            .targetTitle(item.getTitle())
                            .message("Bài tập '" + item.getTitle() + "' chưa có câu hỏi nào")
                            .suggestion("Soạn câu hỏi hoặc nạp đề thi cho bài tập này")
                            .confidence(1.0f)
                            .build());
                    continue;
                }

                for (Question q : questions) {
                    totalChecks += 4; // Multiple checks per question

                    // P2-2: AI Content Moderation - Quét ngôn từ & quảng cáo trong câu hỏi
                    inspectTextContent(q.getPromptText(), "Câu hỏi #" + (q.getOrderIndex() + 1), q.getId(), issues);

                    // P2-2: Phát hiện câu hỏi trùng lặp nội dung
                    if (q.getPromptText() != null && q.getPromptText().trim().length() > 15) {
                        String cleanPrompt = q.getPromptText().trim().toLowerCase();
                        if (seenPrompts.contains(cleanPrompt)) {
                            issues.add(AuditIssue.builder()
                                    .level("WARNING")
                                    .checkType("AI_CONTENT")
                                    .section("Questions")
                                    .targetId(q.getId())
                                    .targetTitle("Câu hỏi: " + cleanPrompt.substring(0, Math.min(30, cleanPrompt.length())))
                                    .message("Câu hỏi này bị trùng lặp nội dung với một câu khác trong đề")
                                    .suggestion("Kiểm tra lại để tránh học viên làm lại câu hỏi giống nhau")
                                    .confidence(0.95f)
                                    .build());
                        } else {
                            seenPrompts.add(cleanPrompt);
                        }
                    }

                    // P2-1: Kiểm tra Media theo từng Part
                    if ("PART1".equals(secCode)) {
                        if (q.getImage() == null) {
                            failedChecks++;
                            issues.add(AuditIssue.builder()
                                    .level("ERROR")
                                    .checkType("RULE_FORMAT")
                                    .section("Questions")
                                    .targetId(q.getId())
                                    .targetTitle("Câu hỏi Part 1 (ID: " + q.getId() + ")")
                                    .message("Part 1 (Photographs) bắt buộc phải có hình ảnh tranh minh họa")
                                    .suggestion("Tải ảnh tranh mô tả cho câu hỏi này")
                                    .confidence(1.0f)
                                    .build());
                        }
                    }

                    if (secCode.startsWith("PART1") || secCode.startsWith("PART2") || secCode.startsWith("PART3") || secCode.startsWith("PART4")) {
                        boolean hasAudio = q.getAudio() != null || (q.getPassage() != null && q.getPassage().getAudio() != null);
                        if (!hasAudio) {
                            failedChecks++;
                            issues.add(AuditIssue.builder()
                                    .level("ERROR")
                                    .checkType("RULE_FORMAT")
                                    .section("Questions")
                                    .targetId(q.getId())
                                    .targetTitle("Câu hỏi phần Nghe: " + item.getTitle())
                                    .message("Phần nghe TOEIC (Part 1-4) bắt buộc phải có file âm thanh Audio")
                                    .suggestion("Bổ sung file âm thanh câu hỏi hoặc đoạn hội thoại")
                                    .confidence(1.0f)
                                    .build());
                        }
                    }

                    // P2-1: Kiểm tra quy chuẩn số lượng và nội dung lựa chọn trắc nghiệm
                    if ("MULTIPLE_CHOICE".equals(q.getQuestionKind())) {
                        List<AnswerOption> options = answerOptionRepository.findByQuestionIdOrderByLabelAsc(q.getId());

                        // Kiểm tra số lựa chọn theo Part
                        if ("PART2".equals(secCode)) {
                            if (options.size() != 3) {
                                failedChecks++;
                                issues.add(AuditIssue.builder()
                                        .level("WARNING")
                                        .checkType("RULE_FORMAT")
                                        .section("Questions")
                                        .targetId(q.getId())
                                        .targetTitle("Câu hỏi Part 2")
                                        .message("Part 2 chuẩn TOEIC chỉ có 3 lựa chọn (A, B, C), câu này đang có " + options.size() + " lựa chọn")
                                        .suggestion("Xóa bớt lựa chọn D thừa để đúng chuẩn format đề thi TOEIC Part 2")
                                        .confidence(1.0f)
                                        .build());
                            }
                        } else if (options.size() != 4) {
                            failedChecks++;
                            issues.add(AuditIssue.builder()
                                    .level("WARNING")
                                    .checkType("RULE_FORMAT")
                                    .section("Questions")
                                    .targetId(q.getId())
                                    .targetTitle("Câu hỏi trắc nghiệm")
                                    .message("Đề thi TOEIC tiêu chuẩn cần 4 lựa chọn (A, B, C, D), câu này có " + options.size() + " lựa chọn")
                                    .suggestion("Bổ sung đầy đủ 4 đáp án cho học viên lựa chọn")
                                    .confidence(1.0f)
                                    .build());
                        }

                        // Kiểm tra lựa chọn rỗng & trùng lặp
                        Set<String> optionContents = new HashSet<>();
                        for (AnswerOption opt : options) {
                            if (opt.getContent() == null || opt.getContent().trim().isBlank()) {
                                failedChecks++;
                                issues.add(AuditIssue.builder()
                                        .level("ERROR")
                                        .checkType("RULE_FORMAT")
                                        .section("Questions")
                                        .targetId(q.getId())
                                        .targetTitle("Câu hỏi: " + q.getPromptText())
                                        .message("Lựa chọn " + opt.getLabel() + " có nội dung rỗng")
                                        .suggestion("Nhập nội dung cho đáp án " + opt.getLabel())
                                        .confidence(1.0f)
                                        .build());
                            } else {
                                String cleanOpt = opt.getContent().trim().toLowerCase();
                                if (optionContents.contains(cleanOpt)) {
                                    failedChecks++;
                                    issues.add(AuditIssue.builder()
                                            .level("ERROR")
                                            .checkType("RULE_FORMAT")
                                            .section("Questions")
                                            .targetId(q.getId())
                                            .targetTitle("Câu hỏi: " + q.getPromptText())
                                            .message("Các lựa chọn trắc nghiệm bị trùng lặp nội dung giống nhau ('" + opt.getContent() + "')")
                                            .suggestion("Sửa lại nội dung các đáp án phân biệt")
                                            .confidence(1.0f)
                                            .build());
                                } else {
                                    optionContents.add(cleanOpt);
                                }
                            }
                        }

                        // Kiểm tra đánh dấu đáp án đúng
                        long correctCount = options.stream().filter(AnswerOption::getIsCorrect).count();
                        if (correctCount == 0) {
                            questionsWithoutCorrectAnswer++;
                            failedChecks++;
                            issues.add(AuditIssue.builder()
                                    .level("ERROR")
                                    .checkType("RULE_FORMAT")
                                    .section("Questions")
                                    .targetId(q.getId())
                                    .targetTitle("Câu hỏi: " + (q.getPromptText() != null ? q.getPromptText().substring(0, Math.min(35, q.getPromptText().length())) : "ID " + q.getId()))
                                    .message("Câu hỏi chưa được đánh dấu đáp án đúng")
                                    .suggestion("Đánh dấu 1 đáp án đúng (isCorrect = true)")
                                    .confidence(1.0f)
                                    .build());
                        } else if (correctCount > 1) {
                            failedChecks++;
                            issues.add(AuditIssue.builder()
                                    .level("ERROR")
                                    .checkType("RULE_FORMAT")
                                    .section("Questions")
                                    .targetId(q.getId())
                                    .targetTitle("Câu hỏi: " + q.getPromptText())
                                    .message("Câu hỏi trắc nghiệm đơn nhưng có " + correctCount + " đáp án đúng")
                                    .suggestion("Chỉ đánh dấu duy nhất 1 đáp án chính xác")
                                    .confidence(1.0f)
                                    .build());
                        }

                        // P2-2: AI Consistency Check - Thẩm định mâu thuẫn giữa Lời giải thích và Đáp án đúng
                        if (q.getExplanation() != null && !q.getExplanation().isBlank() && correctCount == 1) {
                            AnswerOption correctOpt = options.stream().filter(AnswerOption::getIsCorrect).findFirst().orElse(null);
                            if (correctOpt != null && correctOpt.getLabel() != null) {
                                String explanation = q.getExplanation();
                                Matcher m = EXPLANATION_KEY_PATTERN.matcher(explanation);
                                if (m.find()) {
                                    String mentionedKey = m.group(1).toUpperCase();
                                    if (!mentionedKey.equals(correctOpt.getLabel().toUpperCase())) {
                                        failedChecks++;
                                        issues.add(AuditIssue.builder()
                                                .level("ERROR")
                                                .checkType("AI_CONSISTENCY")
                                                .section("Questions")
                                                .targetId(q.getId())
                                                .targetTitle("Câu hỏi: " + (q.getPromptText() != null ? q.getPromptText().substring(0, Math.min(35, q.getPromptText().length())) : "ID " + q.getId()))
                                                .message("Mâu thuẫn giữa lời giải thích và đáp án: Giải thích nói '" + m.group(0) + "' nhưng hệ thống đang chọn đáp án " + correctOpt.getLabel())
                                                .suggestion("Kiểm tra lại xem đáp án đúng thực sự là " + mentionedKey + " hay " + correctOpt.getLabel())
                                                .confidence(0.92f)
                                                .build());
                                    }
                                }
                            }
                        }
                    }

                    if (q.getExplanation() == null || q.getExplanation().isBlank()) {
                        questionsWithoutExplanation++;
                    }
                }
            }
        }

        stats.put("totalQuestions", totalQuestions);
        stats.put("questionsWithoutCorrectAnswer", questionsWithoutCorrectAnswer);
        stats.put("questionsWithoutExplanation", questionsWithoutExplanation);

        if (questionsWithoutExplanation > 0) {
            issues.add(AuditIssue.builder()
                    .level("INFO")
                    .checkType("RULE_FORMAT")
                    .section("Questions")
                    .message("Có " + questionsWithoutExplanation + " câu hỏi chưa có lời giải thích chi tiết")
                    .suggestion("Thêm phần giải thích (explanation) giúp học viên hiểu rõ ngữ pháp & bẫy đề TOEIC")
                    .confidence(1.0f)
                    .build());
        }

        int errorCount = (int) issues.stream().filter(i -> "ERROR".equals(i.getLevel())).count();
        int warningCount = (int) issues.stream().filter(i -> "WARNING".equals(i.getLevel())).count();

        // P2-3: Tính toán điểm rủi ro & Phân luồng rủi ro
        int riskScore = 0;
        String riskLevel = "LOW";
        if (errorCount > 0) {
            riskLevel = "HIGH";
            riskScore = Math.min(100, 60 + errorCount * 10);
        } else if (warningCount > 0) {
            riskLevel = "MEDIUM";
            riskScore = Math.min(59, 20 + warningCount * 8);
        }

        String overallStatus = errorCount > 0 ? "FAILED" : (warningCount > 0 ? "NEEDS_ATTENTION" : "PASSED");
        int passedChecks = Math.max(0, totalChecks - failedChecks);

        String contentHash = calculateCourseHash(course, items.size(), totalQuestions);

        AuditReport report = AuditReport.builder()
                .status(overallStatus)
                .riskLevel(riskLevel)
                .riskScore(riskScore)
                .totalChecks(Math.max(totalChecks, issues.size() + 5))
                .passedChecks(passedChecks)
                .errorCount(errorCount)
                .warningCount(warningCount)
                .contentHash(contentHash)
                .issues(issues)
                .statistics(stats)
                .build();

        try {
            return objectMapper.writeValueAsString(report);
        } catch (Exception e) {
            log.error("Error serializing audit report: {}", e.getMessage());
            return "{}";
        }
    }

    private void inspectTextContent(String text, String location, String targetId, List<AuditIssue> issues) {
        if (text == null || text.isBlank()) return;

        // Quét số điện thoại
        Matcher phoneMatcher = PHONE_PATTERN.matcher(text);
        if (phoneMatcher.find()) {
            issues.add(AuditIssue.builder()
                    .level("ERROR")
                    .checkType("AI_CONTENT")
                    .section("ContentModeration")
                    .targetId(targetId)
                    .targetTitle(location)
                    .message("Phát hiện số điện thoại cá nhân trong " + location + ": '" + phoneMatcher.group(0) + "'")
                    .suggestion("Gỡ bỏ số điện thoại cá nhân để bảo vệ quyền riêng tư và chống lôi kéo học viên ra ngoài")
                    .confidence(0.98f)
                    .build());
        }

        // Quét URL / Zalo / Telegram
        Matcher urlMatcher = URL_PATTERN.matcher(text);
        if (urlMatcher.find()) {
            issues.add(AuditIssue.builder()
                    .level("WARNING")
                    .checkType("AI_CONTENT")
                    .section("ContentModeration")
                    .targetId(targetId)
                    .targetTitle(location)
                    .message("Phát hiện liên kết ngoài / mạng xã hội trong " + location + ": '" + urlMatcher.group(0) + "'")
                    .suggestion("Hạn chế chèn link web hoặc tài khoản mạng xã hội trong nội dung giảng dạy")
                    .confidence(0.90f)
                    .build());
        }
    }

    private String calculateCourseHash(Course course, int itemsCount, int questionsCount) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            String raw = (course.getTitle() != null ? course.getTitle() : "")
                    + "|" + (course.getDescription() != null ? course.getDescription() : "")
                    + "|" + itemsCount + "|" + questionsCount;
            byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }
}
