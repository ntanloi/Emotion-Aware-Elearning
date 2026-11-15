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
public class Voc13_IpaMatchRule implements ModerationRule {

    private final AiServiceVocabClient aiServiceVocabClient;

    @Override
    public String id() { return "VOC-13"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null || ctx.getVocabWords().isEmpty()) return issues;

        if (aiServiceVocabClient == null || !aiServiceVocabClient.isAvailable()) {
            return issues;
        }

        List<VocabCheckItemDto> checkItems = new ArrayList<>();
        for (VocabWord vw : ctx.getVocabWords()) {
            if (vw.getWord() != null && !vw.getWord().isBlank() && vw.getIpa() != null && !vw.getIpa().isBlank()) {
                checkItems.add(VocabCheckItemDto.builder()
                        .word(vw.getWord().trim())
                        .partOfSpeech(vw.getPartOfSpeech())
                        .ipa(vw.getIpa().trim())
                        .build());
            }
        }

        Map<String, VocabCheckResultDto> checkResults = aiServiceVocabClient.checkVocabBatch(checkItems);

        for (VocabWord vw : ctx.getVocabWords()) {
            if (vw.getWord() == null || vw.getIpa() == null || vw.getIpa().isBlank()) continue;
            String key = vw.getWord().toLowerCase().trim();
            VocabCheckResultDto res = checkResults.get(key);

            if (res != null && res.isInDictionary() && !res.isIpaMatch()) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Phiên âm IPA '%s' cho từ '%s' có dấu hiệu bất thường hoặc không tương thích với từ điển phát âm chuẩn (CMUdict).",
                                vw.getIpa(), vw.getWord()))
                        .suggestion("Kiểm tra lại ký hiệu phiên âm quốc tế IPA (ví dụ tra cứu theo từ điển Oxford hoặc Cambridge).")
                        .confidence(0.85f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
