package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.service.LexiconService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class Txt04_ScoreGuaranteeRule implements ModerationRule {

    private final LexiconService lexiconService;

    private static final Pattern SCORE_GUARANTEE_REGEX = Pattern.compile(
            "(?i)\\b(?:cam kết|đảm bảo|chắc chắn)\\s*(?:đạt)?\\s*\\d{3}\\+?\\s*(?:toeic|điểm)?|\\b(?:bao đỗ|bao đậu|lộ đề thi|tuồn đề)\\b"
    );

    @Override
    public String id() { return "TXT-04"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();

        scan(ctx.getCourse().getTitle(), "Tiêu đề khóa học", issues, ctx);
        scan(ctx.getCourse().getDescription(), "Mô tả khóa học", issues, ctx);

        return issues;
    }

    private void scan(String text, String location, List<RuleIssue> issues, ModerationContext ctx) {
        if (text == null || text.isBlank()) return;

        // 1. Quét bằng regex cụ thể
        Matcher m = SCORE_GUARANTEE_REGEX.matcher(text);
        if (m.find()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message(String.format("%s chứa cam kết điểm số hoặc tuyên bố lộ đề thi: '%s'.", location, m.group()))
                    .suggestion("Quy định nền tảng nghiêm cấm cam kết khống điểm số (ví dụ: 'cam kết 900+ TOEIC') hoặc tuyên bố liên quan lộ đề thi.")
                    .confidence(0.98f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                    .build());
            return;
        }

        // 2. Quét qua từ điển SCORE_GUARANTEE
        List<LexiconService.LexiconMatch> matches = lexiconService.scan(text, "TITLE_DESC");
        for (LexiconService.LexiconMatch lex : matches) {
            if ("SCORE_GUARANTEE".equalsIgnoreCase(lex.getCategory())) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("COURSE")
                        .targetId(ctx.getCourse().getId())
                        .message(String.format("%s chứa nội dung cam kết điểm số không được phép: '%s'.", location, lex.getMatchedWord()))
                        .suggestion("Thay đổi bằng mô tả mục tiêu học tập khách quan.")
                        .confidence(0.95f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                        .build());
                break;
            }
        }
    }
}
