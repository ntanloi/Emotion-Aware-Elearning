package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class Str11_DictationSectionRule implements ModerationRule {

    @Override
    public String id() { return "STR-11"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        if (!ctx.isSectionOpened("DICTATION")) {
            return Collections.emptyList();
        }

        JsonNode policy = ctx.getPolicy();
        JsonNode dicNode = policy != null && policy.has("sections") ? policy.path("sections").path("DICTATION") : null;
        int minSets = dicNode != null ? dicNode.path("minSets").asInt(1) : 1;
        int minSentences = dicNode != null ? dicNode.path("minSentences").asInt(10) : 10;

        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> dictationItems = ctx.getSectionItems("DICTATION");

        int setMeetingAudio = 0;
        int totalAudioQuestions = 0;

        for (ContentItem item : dictationItems) {
            if ("DICTATION_SET".equals(item.getType())) {
                List<Question> qs = ctx.getItemQuestions(item.getId());
                int itemAudioQs = 0;
                for (Question q : qs) {
                    if (q.getAudio() != null) {
                        itemAudioQs++;
                    }
                }
                if (itemAudioQs > 0) {
                    setMeetingAudio++;
                }
                totalAudioQuestions += itemAudioQs;
            }
        }

        if (setMeetingAudio < minSets) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("SECTION")
                    .targetId("DICTATION")
                    .message(String.format("Mục Chính tả (DICTATION) cần có ít nhất %d bộ nghe chép chính tả.", minSets))
                    .suggestion("Tạo bộ đề chính tả hoặc tự sinh đề từ bộ từ vựng.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=DICTATION")
                    .build());
        }

        if (totalAudioQuestions < minSentences) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("SECTION")
                    .targetId("DICTATION")
                    .message(String.format("Mục Chính tả chưa đủ số câu nghe chép tối thiểu (%d/%d câu có file âm thanh).", totalAudioQuestions, minSentences))
                    .suggestion(String.format("Bổ sung thêm ít nhất %d câu nghe có âm thanh vào mục chính tả.", minSentences - totalAudioQuestions))
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=DICTATION")
                    .build());
        }

        return issues;
    }
}
