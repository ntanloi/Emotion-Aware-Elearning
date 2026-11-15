package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class Str09_VocabSectionRule implements ModerationRule {

    @Override
    public String id() { return "STR-09"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        if (!ctx.isSectionOpened("VOCAB")) {
            return Collections.emptyList();
        }

        JsonNode policy = ctx.getPolicy();
        JsonNode vocabNode = policy != null && policy.has("sections") ? policy.path("sections").path("VOCAB") : null;
        int minWords = vocabNode != null ? vocabNode.path("minWords").asInt(50) : 50;
        int minWordsPerSet = vocabNode != null ? vocabNode.path("minWordsPerSet").asInt(10) : 10;

        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> vocabItems = ctx.getSectionItems("VOCAB");

        Set<String> uniqueWords = new HashSet<>();
        boolean hasSetMeetingMin = false;

        for (ContentItem item : vocabItems) {
            if ("VOCAB_SET".equals(item.getType())) {
                List<VocabWord> words = ctx.getItemVocabWords(item.getId());
                if (words.size() >= minWordsPerSet) {
                    hasSetMeetingMin = true;
                }
                for (VocabWord w : words) {
                    if (w.getWord() != null) {
                        uniqueWords.add(w.getWord().trim().toLowerCase());
                    }
                }
            }
        }

        if (uniqueWords.size() < minWords) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("SECTION")
                    .targetId("VOCAB")
                    .message(String.format("Mục Từ vựng (VOCAB) chưa đủ số từ tối thiểu (%d/%d từ không trùng lặp).", uniqueWords.size(), minWords))
                    .suggestion(String.format("Bổ sung thêm ít nhất %d từ vựng vào mục này.", minWords - uniqueWords.size()))
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=VOCAB")
                    .build());
        }

        if (!hasSetMeetingMin) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("SECTION")
                    .targetId("VOCAB")
                    .message(String.format("Mục Từ vựng cần có ít nhất 1 bộ từ vựng chứa từ %d từ trở lên.", minWordsPerSet))
                    .suggestion("Tạo hoặc bổ sung thêm từ vào một bộ từ vựng để đạt quy chuẩn tối thiểu.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=VOCAB")
                    .build());
        }

        return issues;
    }
}
