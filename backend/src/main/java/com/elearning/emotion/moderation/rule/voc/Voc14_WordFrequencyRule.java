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
public class Voc14_WordFrequencyRule implements ModerationRule {

    private final AiServiceVocabClient aiServiceVocabClient;

    @Override
    public String id() { return "VOC-14"; }

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

            if (res != null && res.isInDictionary() && res.isRare()) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Từ vựng '%s' có tần suất xuất hiện rất thấp trong thực tế (Zipf score: %.2f/8.0). Có thể quá cổ xưa hoặc không thông dụng trong kỳ thi TOEIC.",
                                vw.getWord(), res.getFrequencyZipf()))
                        .suggestion("Cân nhắc sử dụng từ vựng thông dụng hơn, phù hợp với ngữ cảnh kinh doanh và giao tiếp quốc tế TOEIC.")
                        .confidence(0.80f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
