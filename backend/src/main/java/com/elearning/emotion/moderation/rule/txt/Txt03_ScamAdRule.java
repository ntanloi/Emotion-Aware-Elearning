package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.service.LexiconService;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Txt03_ScamAdRule implements ModerationRule {

    private final LexiconService lexiconService;

    @Override
    public String id() { return "TXT-03"; }

    @Override
    public String category() { return "SAFETY"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        // 1. Tiêu đề & mô tả
        scan(ctx.getCourse().getTitle(), "COURSE", ctx.getCourse().getId(), "Tiêu đề khóa học", "TITLE_DESC", issues, ctx);
        scan(ctx.getCourse().getDescription(), "COURSE", ctx.getCourse().getId(), "Mô tả khóa học", "TITLE_DESC", issues, ctx);

        // 2. Bài học
        if (ctx.getItems() != null) {
            for (ContentItem it : ctx.getItems()) {
                scan(it.getTitle(), "ITEM", it.getId(), "Tiêu đề bài học '" + it.getTitle() + "'", "BODY", issues, ctx);
                if (it.getBodyHtml() != null) {
                    String plain = Jsoup.parse(it.getBodyHtml()).text();
                    scan(plain, "ITEM", it.getId(), "Nội dung bài học '" + it.getTitle() + "'", "BODY", issues, ctx);
                }
            }
        }

        // 3. Câu hỏi
        if (ctx.getQuestions() != null) {
            for (Question q : ctx.getQuestions()) {
                scan(q.getPromptText(), "QUESTION", q.getId(), "Đề câu hỏi", "QUESTION", issues, ctx);
                scan(q.getExplanation(), "QUESTION", q.getId(), "Giải thích câu hỏi", "QUESTION", issues, ctx);
            }
        }

        return issues;
    }

    private void scan(String text, String targetType, String targetId, String location, String scope,
                      List<RuleIssue> issues, ModerationContext ctx) {
        if (text == null || text.isBlank()) return;

        List<LexiconService.LexiconMatch> matches = lexiconService.scan(text, scope);
        for (LexiconService.LexiconMatch m : matches) {
            if ("SCAM_AD".equalsIgnoreCase(m.getCategory())) {
                Severity sev = "WARNING".equalsIgnoreCase(m.getSeverity()) ? Severity.WARNING : Severity.ERROR;
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(sev)
                        .targetType(targetType)
                        .targetId(targetId)
                        .message(String.format("%s chứa nội dung dấu hiệu quảng cáo, cá độ hoặc lừa đảo: '%s'.", location, m.getMatchedWord()))
                        .suggestion("Loại bỏ nội dung quảng cáo thương mại hoặc lừa đảo ra khỏi nền tảng giáo dục.")
                        .confidence(0.98f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }
    }
}
