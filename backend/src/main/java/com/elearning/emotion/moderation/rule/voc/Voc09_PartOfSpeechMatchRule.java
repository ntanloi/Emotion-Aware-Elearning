package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.client.AiServiceVocabClient;
import com.elearning.emotion.moderation.client.VocabCheckItemDto;
import com.elearning.emotion.moderation.client.VocabCheckResultDto;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
public class Voc09_PartOfSpeechMatchRule implements ModerationRule {

    private final AiServiceVocabClient aiServiceVocabClient;

    @Override
    public String id() { return "VOC-09"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null || ctx.getVocabWords().isEmpty()) return issues;

        if (aiServiceVocabClient == null || !aiServiceVocabClient.isAvailable()) {
            return issues;
        }

        List<VocabCheckItemDto> checkItems = new ArrayList<>();
        for (VocabWord vw : ctx.getVocabWords()) {
            if (vw.getWord() != null && !vw.getWord().isBlank()) {
                checkItems.add(VocabCheckItemDto.builder()
                        .word(vw.getWord().trim())
                        .partOfSpeech(vw.getPartOfSpeech())
                        .ipa(vw.getIpa())
                        .build());
            }
        }

        Map<String, VocabCheckResultDto> checkResults = aiServiceVocabClient.checkVocabBatch(checkItems);

        for (VocabWord vw : ctx.getVocabWords()) {
            if (vw.getWord() == null || vw.getWord().isBlank()) continue;
            String key = vw.getWord().toLowerCase().trim();
            VocabCheckResultDto res = checkResults.get(key);

            if (res != null && res.isInDictionary() && !res.isPosMatch() && vw.getPartOfSpeech() != null) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Loại từ đã khai báo '%s' cho từ '%s' không khớp với từ điển WordNet. Các loại từ hợp lệ: %s.",
                                vw.getPartOfSpeech(), vw.getWord(), String.join(", ", res.getValidPos())))
                        .suggestion("Chỉnh sửa lại loại từ (part of speech) cho chính xác theo ngữ nghĩa của bài học.")
                        .confidence(0.92f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
