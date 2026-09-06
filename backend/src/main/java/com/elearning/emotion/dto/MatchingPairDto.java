package com.elearning.emotion.dto;

import com.elearning.emotion.entity.MatchingPair;

public record MatchingPairDto(String id, String leftContent, String rightContent) {
    public static MatchingPairDto from(MatchingPair p) {
        return new MatchingPairDto(p.getId(), p.getLeftContent(), p.getRightContent());
    }
}
