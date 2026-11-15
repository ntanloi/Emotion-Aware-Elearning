package com.elearning.emotion.moderation.rule.dic;

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
public class Dic02_SentenceLengthRule implements ModerationRule {

    @Override
    public String id() { return "DIC-02"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> dictationItems = ctx.getSectionItems("DICTATION");
        if (dictationItems.isEmpty()) return issues;

        JsonNode policy = ctx.getPolicy();
        int minWords = 3;
        int maxWords = 30;
        if (policy != null && policy.has("sections") && policy.path("sections").has("DICTATION")) {
            JsonNode sw = policy.path("sections").path("DICTATION").path("sentenceWords");
            if (sw.isArray() && sw.size() >= 2) {
                minWords = sw.get(0).asInt(3);
                maxWords = sw.get(1).asInt(30);
            }
        }

        for (ContentItem it : dictationItems) {
            List<Question> questions = ctx.getItemQuestions(it.getId());
            for (Question q : questions) {
                String prompt = q.getPromptText();
                if (prompt != null && !prompt.isBlank()) {
                    String[] words = prompt.trim().split("\\s+");
                    if (words.length < minWords || words.length > maxWords) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("Câu nghe chép chính tả có %d từ (khoảng chuẩn là %d–%d từ).",
                                        words.length, minWords, maxWords))
                                .suggestion("Điều chỉnh độ dài câu chép chính tả phù hợp với dung lượng nghe hiểu.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    }
                }
            }
        }

        return issues;
    }
}
