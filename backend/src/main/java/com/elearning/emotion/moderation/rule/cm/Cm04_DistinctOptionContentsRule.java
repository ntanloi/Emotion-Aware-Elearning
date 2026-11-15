package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class Cm04_DistinctOptionContentsRule implements ModerationRule {

    @Override
    public String id() { return "CM-04"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getQuestions() == null) return issues;

        for (Question q : ctx.getQuestions()) {
            if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                List<AnswerOption> options = ctx.getQuestionOptions(q.getId());
                Set<String> seen = new HashSet<>();
                for (AnswerOption opt : options) {
                    if (opt.getContent() != null && !opt.getContent().trim().isBlank()) {
                        String norm = TextNormalizer.normalizeBase(opt.getContent());
                        if (seen.contains(norm)) {
                            issues.add(RuleIssue.builder()
                                    .ruleId(id())
                                    .category(category())
                                    .severity(defaultSeverity())
                                    .targetType("QUESTION")
                                    .targetId(q.getId())
                                    .message(String.format("Các lựa chọn trắc nghiệm bị trùng lặp nội dung giống nhau ('%s').", opt.getContent().trim()))
                                    .suggestion("Sửa lại nội dung các phương án để đảm bảo tính phân biệt và tính chính xác.")
                                    .confidence(1.0f)
                                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                    .build());
                            break;
                        } else {
                            seen.add(norm);
                        }
                    }
                }
            }
        }

        return issues;
    }
}
