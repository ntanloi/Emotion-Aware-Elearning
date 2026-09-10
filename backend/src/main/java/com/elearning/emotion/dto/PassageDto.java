package com.elearning.emotion.dto;

import com.elearning.emotion.entity.Passage;

public record PassageDto(String id, String contentItemId, String transcriptHtml, String passageHtml, String audioUrl, String imageUrl) {
    public static PassageDto from(Passage p) {
        return new PassageDto(p.getId(), p.getContentItem().getId(), p.getTranscriptHtml(), p.getPassageHtml(),
                p.getAudio() != null ? p.getAudio().getUrl() : null,
                p.getImage() != null ? p.getImage().getUrl() : null);
    }
}
