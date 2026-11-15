package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.service.GrammarTopicService;
import com.elearning.emotion.service.HtmlSanitizerService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
public class Str10_GrammarSectionRule implements ModerationRule {

    private final GrammarTopicService grammarTopicService;
    private final HtmlSanitizerService htmlSanitizerService;

    @Override
    public String id() { return "STR-10"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        if (!ctx.isSectionOpened("GRAMMAR")) {
            return Collections.emptyList();
        }

        JsonNode policy = ctx.getPolicy();
        JsonNode grmNode = policy != null && policy.has("sections") ? policy.path("sections").path("GRAMMAR") : null;
        int minTopics = grmNode != null ? grmNode.path("minTopics").asInt(8) : 8;
        int minArticleChars = grmNode != null ? grmNode.path("minArticleChars").asInt(800) : 800;

        List<RuleIssue> issues = new ArrayList<>();
        List<ContentItem> grammarItems = ctx.getSectionItems("GRAMMAR");

        Set<String> uniqueTopicCodes = new HashSet<>();

        for (ContentItem item : grammarItems) {
            if ("GRAMMAR_ARTICLE".equals(item.getType())) {
                String topicCode = item.getTopicCode();
                if (topicCode == null || topicCode.isBlank() || grammarTopicService.getTopicByCode(topicCode).isEmpty()) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(item.getId())
                            .message(String.format("Bài ngữ pháp '%s' chưa được gắn mã chủ điểm (topic_code) hợp lệ trong danh mục.", item.getTitle()))
                            .suggestion("Chọn đúng chủ điểm ngữ pháp TOEIC chuẩn từ danh sách gợi ý.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?item=" + item.getId())
                            .build());
                } else {
                    uniqueTopicCodes.add(topicCode);
                }

                String bodyText = htmlSanitizerService.toBodyText(item.getBodyHtml());
                if (bodyText.length() < minArticleChars) {
                    issues.add(RuleIssue.builder()
                            .ruleId(id())
                            .category(category())
                            .severity(defaultSeverity())
                            .targetType("ITEM")
                            .targetId(item.getId())
                            .message(String.format("Bài ngữ pháp '%s' có nội dung quá ngắn (%d/%d ký tự thuần chữ).", item.getTitle(), bodyText.length(), minArticleChars))
                            .suggestion("Bổ sung cấu trúc công thức, phân tích chi tiết và ví dụ câu tiếng Anh minh họa.")
                            .confidence(1.0f)
                            .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?item=" + item.getId())
                            .build());
                }
            }
        }

        if (uniqueTopicCodes.size() < minTopics) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("SECTION")
                    .targetId("GRAMMAR")
                    .message(String.format("Mục Ngữ pháp (GRAMMAR) chưa đủ số chủ điểm tối thiểu (%d/%d chủ điểm khác nhau).", uniqueTopicCodes.size(), minTopics))
                    .suggestion(String.format("Soạn thêm ít nhất %d bài ngữ pháp với các chủ điểm khác nhau.", minTopics - uniqueTopicCodes.size()))
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/content?section=GRAMMAR")
                    .build());
        }

        return issues;
    }
}
