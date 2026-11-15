package com.elearning.emotion.moderation.rule;

import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.moderation.model.Severity;

import java.util.List;

public interface ModerationRule {

    /** Định danh luật, ví dụ STR-01, CM-01, P1-01 */
    String id();

    /** Nhóm luật: STRUCTURE, CONTENT, LANGUAGE, SAFETY, SECURITY, COPYRIGHT, SYSTEM */
    String category();

    /** Mức độ mặc định: BLOCKER, ERROR, WARNING, INFO, CONTEXT */
    Severity defaultSeverity();

    /** Thực thi đánh giá trên ngữ cảnh khóa học đã được nạp sẵn */
    List<RuleIssue> evaluate(ModerationContext ctx);
}
