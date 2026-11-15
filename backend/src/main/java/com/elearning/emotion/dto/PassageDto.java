package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Passage;

public record PassageDto(
        String id,
        String contentItemId,
        String transcriptHtml,
        String passageHtml,
        String audioUrl,
        String imageUrl,
        String status
) {
    public static PassageDto from(Passage p) {
        return new PassageDto(
                p.getId(),
                p.getContentItem().getId(),
                p.getTranscriptHtml(),
                p.getPassageHtml(),
                p.getAudio() != null ? p.getAudio().getUrl() : null,
                p.getImage() != null ? p.getImage().getUrl() : null,
                p.getStatus() != null ? p.getStatus() : "ACTIVE"
        );
    }

    public static PassageDto forStudent(Passage p) {
        return new PassageDto(
                p.getId(),
                p.getContentItem().getId(),
                null, // Ẩn transcript bài nghe đối với học viên để chống lộ đáp án
                p.getPassageHtml(),
                p.getAudio() != null ? p.getAudio().getUrl() : null,
                p.getImage() != null ? p.getImage().getUrl() : null,
                p.getStatus() != null ? p.getStatus() : "ACTIVE"
        );
    }
}
