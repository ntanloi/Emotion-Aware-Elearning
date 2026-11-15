package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.client.LanguageToolClient;
import com.elearning.emotion.moderation.client.LanguageToolMatchDto;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class Grm05_ExampleGrammarRule implements ModerationRule {

    private final LanguageToolClient languageToolClient;

    // Ký hiệu đánh dấu câu phản ví dụ có chủ đích (sai để đối chiếu ngữ pháp)
    private static final Pattern INTENTIONAL_WRONG_MARKER = Pattern.compile(
            "[✗✘xX]\\s*|\\(sai\\)|\\(incorrect\\)|\\(wrong\\)|\\bIncorrect:|\\bWrong:",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private static final Pattern ENGLISH_LINE = Pattern.compile("^[A-Za-z\\s,;:'\"\\-]{15,}[.?!]?$");

    @Override
    public String id() { return "GRM-05"; }

    @Override
    public String category() { return "LANGUAGE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        if (languageToolClient == null || !languageToolClient.isAvailable()) {
            return issues;
        }

        for (ContentItem it : grammarItems) {
            if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType()) && it.getBodyHtml() != null) {
                String plain = Jsoup.parse(it.getBodyHtml()).text();
                String[] lines = plain.split("\\r?\\n|(?<=[.?!])\\s+");

                for (String line : lines) {
                    String trimmed = line.trim();
                    if (trimmed.length() < 15) continue;

                    // SPEC mục 11.20: Nếu dòng có ký hiệu đánh dấu câu sai '✗' thì KHÔNG được báo lỗi ngữ pháp
                    if (INTENTIONAL_WRONG_MARKER.matcher(trimmed).find()) {
                        continue;
                    }

                    // Chỉ kiểm tra các câu thuần tiếng Anh
                    if (!trimmed.matches(".*[a-zA-Z]{4,}.*") || trimmed.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ].*")) {
                        continue;
                    }

                    List<LanguageToolMatchDto> matches = languageToolClient.checkText(trimmed, "en-US");
                    for (LanguageToolMatchDto m : matches) {
                        // Bỏ qua lỗi chính tả gõ phím nhẹ nếu không phải lỗi ngữ pháp cấu trúc
                        if ("grammar".equalsIgnoreCase(m.getIssueType()) || m.getRuleId().contains("GRAMMAR") || m.getRuleId().contains("AGREEMENT")) {
                            issues.add(RuleIssue.builder()
                                    .ruleId(id())
                                    .category(category())
                                    .severity(defaultSeverity())
                                    .targetType("ITEM")
                                    .targetId(it.getId())
                                    .message(String.format("Nghi vấn lỗi ngữ pháp tiếng Anh trong bài '%s': %s (trong câu: \"%s\").",
                                            it.getTitle(), m.getMessage(), trimmed))
                                    .suggestion(m.getReplacements() != null && !m.getReplacements().isEmpty()
                                            ? "Gợi ý sửa: " + String.join(", ", m.getReplacements())
                                            : "Kiểm tra lại cấu trúc ngữ pháp câu ví dụ.")
                                    .confidence(0.88f)
                                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                    .build());
                            break; // Giới hạn 1 issue mỗi câu
                        }
                    }
                }
            }
        }

        return issues;
    }
}
