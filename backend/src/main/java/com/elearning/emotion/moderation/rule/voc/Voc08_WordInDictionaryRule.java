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
public class Voc08_WordInDictionaryRule implements ModerationRule {

    private final AiServiceVocabClient aiServiceVocabClient;

    @Override
    public String id() { return "VOC-08"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null || ctx.getVocabWords().isEmpty()) return issues;

        if (aiServiceVocabClient == null || !aiServiceVocabClient.isAvailable()) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category("SYSTEM")
                    .severity(Severity.INFO)
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message("Dịch vụ từ điển ai-service (WordNet) chưa sẵn sàng. Bỏ qua kiểm tra VOC-08.")
                    .confidence(1.0f)
                    .build());
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

            if (res != null && !res.isInDictionary()) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("VOCAB_WORD")
                        .targetId(vw.getId())
                        .message(String.format("Từ vựng '%s' không tồn tại trong từ điển tiếng Anh chuẩn (WordNet). Có thể bị viết sai chính tả.", vw.getWord()))
                        .suggestion("Kiểm tra lại chính tả của từ vựng tiếng Anh.")
                        .confidence(0.95f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                        .build());
            }
        }

        return issues;
    }
}
