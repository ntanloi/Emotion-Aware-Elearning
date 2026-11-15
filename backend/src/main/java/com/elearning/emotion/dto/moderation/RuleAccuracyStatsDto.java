package com.elearning.emotion.dto.moderation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleAccuracyStatsDto {
    private String ruleId;
    private long totalDecisions;
    private long acceptCount;
    private long dismissCount;
    private long needFixCount;
    /** Tỷ lệ chấp nhận / xác nhận vi phạm thật: (accept + needFix) / total */
    private double precisionRate;
}
