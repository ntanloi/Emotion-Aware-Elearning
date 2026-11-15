package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class Str04_CoursePriceRule implements ModerationRule {

    @Override
    public String id() { return "STR-04"; }

    @Override
    public String category() { return "STRUCTURE"; }

    @Override
    public Severity defaultSeverity() { return Severity.BLOCKER; }

    @Override
    public List<RuleIssue> evaluate(ModerationContext ctx) {
        BigDecimal price = ctx.getCourse().getPrice();
        BigDecimal originalPrice = ctx.getCourse().getOriginalPrice();

        JsonNode policy = ctx.getPolicy();
        int priceMin = policy != null && policy.has("course") ? policy.path("course").path("priceMin").asInt(10000) : 10000;
        boolean allowFree = policy == null || !policy.has("course") || policy.path("course").path("allowFree").asBoolean(true);

        List<RuleIssue> issues = new ArrayList<>();

        if (price != null && price.compareTo(BigDecimal.ZERO) > 0) {
            if (price.compareTo(BigDecimal.valueOf(priceMin)) < 0) {
                issues.add(RuleIssue.builder()
                        .ruleId(id())
                        .category(category())
                        .severity(defaultSeverity())
                        .targetType("COURSE")
                        .targetId(ctx.getCourse().getId())
                        .message(String.format("Giá bán của khóa học phải tối thiểu %,d đ.", priceMin))
                        .suggestion("Điều chỉnh giá bán hoặc chuyển sang khóa học miễn phí.")
                        .confidence(1.0f)
                        .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                        .build());
            }
        } else if (!allowFree && (price == null || price.compareTo(BigDecimal.ZERO) == 0)) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message("Hệ thống hiện không cho phép tạo khóa học miễn phí.")
                    .suggestion(String.format("Vui lòng đặt giá bán tối thiểu %,d đ.", priceMin))
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                    .build());
        }

        // Kiểm tra giá gốc >= giá bán
        if (originalPrice != null && price != null && originalPrice.compareTo(price) < 0) {
            issues.add(RuleIssue.builder()
                    .ruleId(id())
                    .category(category())
                    .severity(defaultSeverity())
                    .targetType("COURSE")
                    .targetId(ctx.getCourse().getId())
                    .message("Giá gốc (gạch ngang) không được nhỏ hơn giá bán thực tế.")
                    .suggestion("Cập nhật giá gốc lớn hơn hoặc bằng giá bán để hiển thị tỷ lệ giảm giá chính xác.")
                    .confidence(1.0f)
                    .jumpTo("/teacher/courses/" + ctx.getCourse().getId() + "/edit")
                    .build());
        }

        return issues;
    }
}
