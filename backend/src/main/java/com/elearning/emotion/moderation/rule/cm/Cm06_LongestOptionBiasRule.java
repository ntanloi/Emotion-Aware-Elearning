package com.elearning.emotion.moderation.rule.cm;

import com.elearning.emotion.entity.AnswerOption;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class Cm06_LongestOptionBiasRule implements ModerationRule {

    @Override
    public String id() { return "CM-06"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        int minQuestions = policy != null && policy.has("thresholds")
                ? policy.path("thresholds").path("answerSkewMinQuestions").asInt(20) : 20;
        int maxLongestCorrectPct = policy != null && policy.has("thresholds")
                ? policy.path("thresholds").path("longestCorrectPct").asInt(60) : 60;

        for (ContentItem item : ctx.getItems()) {
            if (!"PRACTICE_TEST".equalsIgnoreCase(item.getType())) continue;

            List<Question> itemQuestions = ctx.getItemQuestions(item.getId());
            int validQuestions = 0;
            int longestCorrectCount = 0;

            for (Question q : itemQuestions) {
                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> opts = ctx.getQuestionOptions(q.getId());
                    if (opts.size() >= 3) {
                        AnswerOption correctOpt = opts.stream()
                                .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                                .findFirst().orElse(null);

                        if (correctOpt != null && correctOpt.getContent() != null) {
                            validQuestions++;
                            int correctLen = correctOpt.getContent().trim().length();
                            boolean strictlyLongest = true;
                            for (AnswerOption o : opts) {
                                if (o != correctOpt) {
                                    int len = o.getContent() != null ? o.getContent().trim().length() : 0;
                                    if (len >= correctLen) {
                                        strictlyLongest = false;
                                        break;
                                    }
                                }
                            }
                            if (strictlyLongest) {
                                longestCorrectCount++;
                            }
                        }
                    }
                }
            }

            if (validQuestions >= minQuestions) {
                int pct = (longestCorrectCount * 100) / validQuestions;
                if (pct > maxLongestCorrectPct) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(item.getId())
                            .message(String.format("Bài tập '%s' có %d%% số câu mà đáp án đúng là phương án dài nhất (> %d%%), nghi ngờ thiên lệch độ dài đáp án.",
                                    item.getTitle(), pct, maxLongestCorrectPct))
                            .suggestion("Cân bằng độ dài giữa đáp án đúng và các phương án nhiễu để tránh học viên đoán mò.")
                            .confidence(0.85f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}
