package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class Txt01_ContactInfoRule implements ModerationRule {

    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?:\\+?84|0)[\\s.-]?[1-9][0-9]{1,2}[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{3,4}|\\b0[0-9]{9,10}\\b"
    );

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b"
    );

    private static final Pattern URL_PATTERN = Pattern.compile(
            "(?i)\\b(?:https?://|www\\.)[a-zA-Z0-9.\\-_]+(?:/[\\S]*)?|\\b(?:zalo\\.me|t\\.me)[/\\S]*"
    );

    private static final Set<String> DEFAULT_ALLOWED_DOMAINS = new HashSet<>(Arrays.asList(
            "youtube.com", "youtu.be", "dictionary.cambridge.org", "oxfordlearnersdictionaries.com", "merriam-webster.com"
    ));

    @Override
    public String id() { return "TXT-01"; }

    @Override
    public String category() { return "SAFETY"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        JsonNode policy = ctx.getPolicy();
        Set<String> allowedDomains = new HashSet<>(DEFAULT_ALLOWED_DOMAINS);
        if (policy != null && policy.has("text") && policy.path("text").has("allowedLinkDomains")) {
            JsonNode arr = policy.path("text").path("allowedLinkDomains");
            if (arr.isArray()) {
                allowedDomains.clear();
                arr.forEach(d -> allowedDomains.add(d.asText().toLowerCase().trim()));
            }
        }

        // 1. Kiểm tra tiêu đề và mô tả khóa học
        scanText(ctx.getCourse().getTitle(), "COURSE", ctx.getCourse().getId(), "Tiêu đề khóa học", allowedDomains, issues, ctx);
        scanText(ctx.getCourse().getDescription(), "COURSE", ctx.getCourse().getId(), "Mô tả khóa học", allowedDomains, issues, ctx);

        // 2. Kiểm tra các ContentItems
        if (ctx.getItems() != null) {
            for (ContentItem it : ctx.getItems()) {
                scanText(it.getTitle(), "ITEM", it.getId(), "Tiêu đề bài học '" + it.getTitle() + "'", allowedDomains, issues, ctx);
                if (it.getBodyHtml() != null) {
                    String plain = Jsoup.parse(it.getBodyHtml()).text();
                    scanText(plain, "ITEM", it.getId(), "Nội dung bài học '" + it.getTitle() + "'", allowedDomains, issues, ctx);
                }
            }
        }

        // 3. Kiểm tra câu hỏi & giải thích
        if (ctx.getQuestions() != null) {
            for (Question q : ctx.getQuestions()) {
                scanText(q.getPromptText(), "QUESTION", q.getId(), "Đề câu hỏi", allowedDomains, issues, ctx);
                scanText(q.getExplanation(), "QUESTION", q.getId(), "Lời giải thích", allowedDomains, issues, ctx);

                List<AnswerOption> opts = ctx.getQuestionOptions(q.getId());
                for (AnswerOption opt : opts) {
                    scanText(opt.getContent(), "QUESTION", q.getId(), "Lựa chọn " + opt.getLabel(), allowedDomains, issues, ctx);
                }
            }
        }

        return issues;
    }

    private void scanText(String text, String targetType, String targetId, String location,
                          Set<String> allowedDomains, List<RuleIssue> issues, ModerationContext ctx) {
        if (text == null || text.isBlank()) return;

        // Quét số điện thoại
        Matcher phoneMatcher = PHONE_PATTERN.matcher(text);
        if (phoneMatcher.find()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(Severity.ERROR)
                    .targetType(targetType)
                    .targetId(targetId)
                    .message(String.format("%s có chứa thông tin số điện thoại liên hệ cá nhân: '%s'.", location, phoneMatcher.group()))
                    .suggestion("Loại bỏ số điện thoại cá nhân theo quy định an toàn và bảo mật của nền tảng.")
                    .confidence(0.95f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                    .build());
        }

        // Quét email
        Matcher emailMatcher = EMAIL_PATTERN.matcher(text);
        if (emailMatcher.find()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(Severity.ERROR)
                    .targetType(targetType)
                    .targetId(targetId)
                    .message(String.format("%s có chứa địa chỉ email liên hệ cá nhân: '%s'.", location, emailMatcher.group()))
                    .suggestion("Loại bỏ thông tin email cá nhân khỏi nội dung giảng dạy.")
                    .confidence(0.95f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                    .build());
        }

        // Quét liên kết lạ
        Matcher urlMatcher = URL_PATTERN.matcher(text);
        while (urlMatcher.find()) {
            String url = urlMatcher.group();
            String lower = url.toLowerCase();
            boolean allowed = false;
            for (String domain : allowedDomains) {
                if (lower.contains(domain)) {
                    allowed = true;
                    break;
                }
            }

            if (!allowed) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(Severity.WARNING)
                        .targetType(targetType)
                        .targetId(targetId)
                        .message(String.format("%s chứa liên kết bên ngoài chưa được kiểm duyệt: '%s'.", location, url))
                        .suggestion("Chỉ dẫn liên kết tới các nguồn học liệu từ điển và video được chấp thuận.")
                        .confidence(0.9f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
                break;
            }
        }
    }
}
