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

import java.util.*;

@Component
public class Cm05_AnswerKeySkewRule implements ModerationRule {

    @Override
    public String id() { return "CM-05"; }

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
        int maxSkewPct = policy != null && policy.has("thresholds")
                ? policy.path("thresholds").path("answerSkewPct").asInt(45) : 45;
        int maxRunLength = policy != null && policy.has("thresholds")
                ? policy.path("thresholds").path("answerRunLength").asInt(8) : 8;

        for (ContentItem item : ctx.getItems()) {
            if (!"PRACTICE_TEST".equalsIgnoreCase(item.getType())) continue;

            List<Question> itemQuestions = ctx.getItemQuestions(item.getId());
            List<String> correctKeys = new ArrayList<>();

            for (Question q : itemQuestions) {
                if ("MULTIPLE_CHOICE".equalsIgnoreCase(q.getQuestionKind())) {
                    List<AnswerOption> opts = ctx.getQuestionOptions(q.getId());
                    String correctLabel = opts.stream()
                            .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                            .map(AnswerOption::getLabel)
                            .filter(Objects::nonNull)
                            .findFirst().orElse(null);
                    if (correctLabel != null) {
                        correctKeys.add(correctLabel.trim().toUpperCase());
                    }
                }
            }

            if (correctKeys.size() >= minQuestions) {
                // 1. Kiểm tra tỷ lệ áp đảo của một chữ cái
                Map<String, Integer> counts = new HashMap<>();
                for (String k : correctKeys) {
                    counts.put(k, counts.getOrDefault(k, 0) + 1);
                }

                for (Map.Entry<String, Integer> entry : counts.entrySet()) {
                    int pct = (entry.getValue() * 100) / correctKeys.size();
                    if (pct > maxSkewPct) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("ITEM")
                                .targetId(item.getId())
                                .message(String.format("Bài tập '%s' có đáp án %s chiếm %d%% tổng số câu (> %d%%), nghi ngờ phân bổ đáp án bị thiên lệch.",
                                        item.getTitle(), entry.getKey(), pct, maxSkewPct))
                                .suggestion("Phân bổ đều các đáp án A, B, C, D để đề thi khách quan hơn.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                        break;
                    }
                }

                // 2. Kiểm tra chuỗi liên tiếp cùng đáp án (run length)
                int currentRun = 1;
                String lastKey = "";
                for (String key : correctKeys) {
                    if (key.equals(lastKey)) {
                        currentRun++;
                        if (currentRun >= maxRunLength) {
                            issues.add(RuleIssue.builder()
                                    .ruleId(id())
                                    .category(category())
                                    .severity(defaultSeverity())
                                    .targetType("ITEM")
                                    .targetId(item.getId())
                                    .message(String.format("Bài tập '%s' có chuỗi %d câu liên tiếp đều là đáp án %s.",
                                            item.getTitle(), currentRun, key))
                                    .suggestion("Đảo lại vị trí các đáp án để tránh tạo bẫy đoán mò cho học viên.")
                                    .confidence(0.85f)
                                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                    .build());
                            break;
                        }
                    } else {
                        lastKey = key;
                        currentRun = 1;
                    }
                }
            }
        }

        return issues;
    }
}
