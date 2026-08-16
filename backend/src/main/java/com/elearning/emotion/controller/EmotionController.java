package com.elearning.emotion.controller;

import com.elearning.emotion.dto.EmotionBatchFramesRequest;
import com.elearning.emotion.dto.EmotionBatchLabeledRequest;
import com.elearning.emotion.dto.EmotionLogDto;
import com.elearning.emotion.service.EmotionIngestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 2 endpoint song song, cung ghi vao EMOTION_LOGS:
 *  - /frames/batch : frontend gui anh tho -> backend goi AI (mock hoac that qua ai-service)
 *  - /emotions/batch : frontend da tu tinh nhan san (che do face-api.js/legacy hoac test nhanh)
 * Xem docs/erd.md va docs/ai-service-contract.md de biet ly do thiet ke.
 */
@RestController
@RequestMapping("/api/sessions/{sessionId}")
@RequiredArgsConstructor
public class EmotionController {

    private final EmotionIngestService ingestService;

    @PostMapping("/frames/batch")
    public List<EmotionLogDto> ingestFrames(@PathVariable String sessionId,
                                             @Valid @RequestBody EmotionBatchFramesRequest req) {
        return ingestService.ingestFrames(sessionId, req);
    }

    @PostMapping("/emotions/batch")
    public List<EmotionLogDto> ingestLabeled(@PathVariable String sessionId,
                                              @Valid @RequestBody EmotionBatchLabeledRequest req) {
        return ingestService.ingestLabeled(sessionId, req);
    }
}
