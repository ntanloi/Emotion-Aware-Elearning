package com.elearning.emotion.moderation.rule.voc;

import com.elearning.emotion.entity.VocabExample;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.moderation.client.AiServiceVocabClient;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.util.TextNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class Voc06_ExampleContainsWordRule implements ModerationRule {

    private final AiServiceVocabClient aiServiceVocabClient;

    @Override
    public String id() { return "VOC-06"; }

    @Override
    public String category() { return "CONTENT"; }

    @Override
    public Severity defaultSeverity() { return Severity.ERROR; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        if (ctx.getVocabWords() == null) return issues;

        for (VocabWord vw : ctx.getVocabWords()) {
            String word = vw.getWord();
            if (word == null || word.isBlank()) continue;

            List<VocabExample> examples = ctx.getWordExamples(vw.getId());
            for (VocabExample ve : examples) {
                String en = ve.getSentenceEn();
                if (en == null || en.isBlank()) continue;

                // 1. Kiểm tra từ xuất hiện trực tiếp trong câu ví dụ (hỗ trợ word boundary và các biến thể s/es/ed/ing)
                boolean found = TextNormalizer.containsWord(en, word);
                if (!found && word.length() > 3) {
                    String stem = word.toLowerCase().trim();
                    if (stem.endsWith("e")) stem = stem.substring(0, stem.length() - 1);
                    found = TextNormalizer.containsWord(en, stem);
                }

                // 2. Nếu chưa thấy và có ai-service -> thử đối chiếu qua tách dạng gốc lemma
                if (!found && aiServiceVocabClient != null && aiServiceVocabClient.isAvailable()) {
                    List<String> lemmas = aiServiceVocabClient.getLemmas(en);
                    String cleanWord = word.toLowerCase().trim();
                    if (lemmas.contains(cleanWord)) {
                        found = true;
                    }
                }

                if (!found) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("VOCAB_WORD")
                            .targetId(vw.getId())
                            .message(String.format("Câu ví dụ '%s' không chứa từ vựng tương ứng ('%s').",
                                    en.trim(), word))
                            .suggestion("Viết câu ví dụ có chứa từ vựng đang học để minh họa cách dùng thực tế.")
                            .confidence(0.95f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content")
                            .build());
                }
            }
        }

        return issues;
    }
}

