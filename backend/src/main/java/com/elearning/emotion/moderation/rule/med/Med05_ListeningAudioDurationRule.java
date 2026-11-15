package com.elearning.emotion.moderation.rule.med;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.MediaAsset;
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
public class Med05_ListeningAudioDurationRule implements ModerationRule {

    @Override
    public String id() { return "MED-05"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getItems() == null) return issues;

        JsonNode policy = ctx.getPolicy();
        int part1Max = policy != null && policy.has("audio")
                ? policy.path("audio").path("part1MaxSec").asInt(30) : 30;
        int part2Max = policy != null && policy.has("audio")
                ? policy.path("audio").path("part2MaxSec").asInt(40) : 40;

        for (ContentItem it : ctx.getItems()) {
            String sec = it.getSectionCode() != null ? it.getSectionCode().toUpperCase() : "";
            if (!"PART1".equals(sec) && !"PART2".equals(sec)) continue;

            List<Question> questions = ctx.getItemQuestions(it.getId());
            for (Question q : questions) {
                MediaAsset audio = q.getAudio();
                if (audio != null && audio.getDurationSec() != null) {
                    if ("PART1".equals(sec) && audio.getDurationSec() > part1Max) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("File âm thanh câu hỏi Part 1 dài quá mức (%ds > %ds quy định, nghi ngờ nhầm tệp).",
                                        audio.getDurationSec(), part1Max))
                                .suggestion("Part 1 chỉ gồm 4 câu miêu tả tranh ngắn dưới 30 giây.")
                                .confidence(0.9f)
                                .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                                .build());
                    } else if ("PART2".equals(sec) && audio.getDurationSec() > part2Max) {
                        issues.add(RuleIssue.builder()
                                .ruleId(id())
                                .category(category())
                                .severity(defaultSeverity())
                                .targetType("QUESTION")
                                .targetId(q.getId())
                                .message(String.format("File âm thanh câu hỏi Part 2 dài quá mức (%ds > %ds quy định, nghi ngờ nhầm tệp).",
                                        audio.getDurationSec(), part2Max))
                                .suggestion("Part 2 là câu hỏi ngắn và 3 phản hồi nhanh dưới 40 giây.")
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
