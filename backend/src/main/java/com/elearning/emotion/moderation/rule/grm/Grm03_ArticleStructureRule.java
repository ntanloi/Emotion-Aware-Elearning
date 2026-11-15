package com.elearning.emotion.moderation.rule.grm;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class Grm03_ArticleStructureRule implements ModerationRule {

    private static final Pattern FORMULA_PATTERN = Pattern.compile("(?i)\\b(?:công thức|cấu trúc|formula|form|structures?)\\b");
    private static final Pattern EXAMPLE_PATTERN = Pattern.compile("(?i)\\b(?:ví dụ|examples?|e\\.g)\\b");
    private static final Pattern NOTE_PATTERN = Pattern.compile("(?i)\\b(?:lưu ý|chú ý|notes?|cảnh báo|bẫy)\\b");

    @Override
    public String id() { return "GRM-03"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");
        if (grammarItems.isEmpty()) return issues;

        for (ContentItem it : grammarItems) {
            if ("GRAMMAR_ARTICLE".equalsIgnoreCase(it.getType())) {
                String html = it.getBodyHtml();
                String text = html != null ? Jsoup.parse(html).text() : "";

                int blocksFound = 0;
                if (FORMULA_PATTERN.matcher(text).find()) blocksFound++;
                if (EXAMPLE_PATTERN.matcher(text).find()) blocksFound++;
                if (NOTE_PATTERN.matcher(text).find()) blocksFound++;

                if (blocksFound < 2) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(it.getId())
                            .message(String.format("Bài ngữ pháp '%s' thiếu cấu trúc chuẩn (cần ít nhất 2 trong 3 phần: Công thức/Cấu trúc, Ví dụ minh họa, Lưu ý/Mẹo làm bài).", it.getTitle()))
                            .suggestion("Bổ sung các tiêu đề mục rõ ràng: 'Cấu trúc', 'Ví dụ', 'Lưu ý' để học viên dễ theo dõi.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
