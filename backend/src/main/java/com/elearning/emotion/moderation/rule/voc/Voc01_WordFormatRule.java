package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class Voc01_WordFormatRule implements ModerationRule {

    private static final Pattern VALID_WORD_PATTERN = Pattern.compile("^[a-zA-Z\\s\\-'.]+$");

    @Override
    public String id() { return "VOC-01"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null) return issues;

        for (VocabWord vw : ctx.getVocabWords()) {
            String word = vw.getWord();
            if (word == null || word.trim().isBlank()) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message("Từ vựng không được để trống.")
                        .suggestion("Nhập từ vựng tiếng Anh hợp lệ.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            } else {
                String trimmed = word.trim();
                if (trimmed.length() > 40) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("VOCAB_WORD")
                            .targetId(vw.getId())
                            .message(String.format("Từ vựng '%s' quá dài (%d ký tự, tối đa 40 ký tự).", trimmed, trimmed.length()))
                            .suggestion("Rút gọn từ hoặc tách thành cụm từ phù hợp.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                } else if (!VALID_WORD_PATTERN.matcher(trimmed).matches()) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("VOCAB_WORD")
                            .targetId(vw.getId())
                            .message(String.format("Từ vựng '%s' chứa ký tự lạ (chỉ cho phép chữ cái tiếng Anh, khoảng trắng, gạch nối, dấu nháy đơn).", trimmed))
                            .suggestion("Loại bỏ các ký tự số hoặc ký tự đặc biệt không hợp lệ trong từ vựng.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
