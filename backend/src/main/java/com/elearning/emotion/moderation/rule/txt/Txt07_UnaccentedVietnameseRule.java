package com.elearning.emotion.moderation.rule.txt;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class Txt07_UnaccentedVietnameseRule implements ModerationRule {

    private static final Pattern VI_DIACRITICS = Pattern.compile(
            "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", Pattern.CASE_INSENSITIVE
    );

    // Một số từ nhận diện ngữ cảnh tiếng Việt không dấu (như 'hoc', 'khoa hoc', 'bai giang', 'on thi'...)
    private static final Set<String> COMMON_UNACCENTED_WORDS = new HashSet<>(Arrays.asList(
            "khoa", "hoc", "giang", "vien", "bai", "tap", "nghe", "doc", "luyen", "thi", "de", "dap", "an", "tieng", "anh"
    ));

    @Override
    public String id() { return "TXT-07"; }

    @Override
    public String category() { return "LANGUAGE"; }

    @Override
    public Severity defaultSeverity() { return Severity.WARNING; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        List<RuleIssue> issues = new ArrayList<>();
        JsonNode policy = ctx.getPolicy();
        int minLen = policy != null && policy.has("text")
                ? policy.path("text").path("vietnameseUnaccentedMinLength").asInt(40) : 40;

        String desc = ctx.getCourse().getDescription();
        if (desc != null && desc.trim().length() >= minLen) {
            String plain = desc.trim();
            // Nếu không có bất kỳ dấu tiếng Việt nào
            if (!VI_DIACRITICS.matcher(plain).find()) {
                String[] words = plain.toLowerCase().split("\\s+");
                int matchViCount = 0;
                for (String w : words) {
                    if (COMMON_UNACCENTED_WORDS.contains(w)) matchViCount++;
                }

                if (matchViCount >= 3) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("COURSE")
                            .targetId(ctx.getCourse().getId())
                            .message("Mô tả khóa học dường như viết bằng tiếng Việt không dấu.")
                            .suggestion("Viết tiếng Việt có dấu đầy đủ và đúng chính tả để tăng tính chuyên nghiệp.")
                            .confidence(0.9f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                            .build());
                }
            }
        }

        return issues;
    }
}
