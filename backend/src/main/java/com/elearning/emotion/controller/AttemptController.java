package com.elearning.emotion.controller;

import com.elearning.emotion.dto.AttemptResultDto;
import com.elearning.emotion.dto.AttemptStartRequest;
import com.elearning.emotion.dto.AttemptStartResponse;
import com.elearning.emotion.dto.AttemptSubmitRequest;
import com.elearning.emotion.service.AttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * FR-LES-03/05/06: chay bai luyen tap tu vung / lam bai Part 1-7 / ngu phap / chinh ta.
 * KHONG lien quan Phien hoc hay AI cam xuc (BR-19) - hoat dong hoan toan doc lap voi
 * LearningSessionController/EmotionController.
 */
@RestController
@RequestMapping("/api/attempts")
@RequiredArgsConstructor
public class AttemptController {

    private final AttemptService attemptService;

    @PostMapping
    public AttemptStartResponse start(@AuthenticationPrincipal String userId,
                                       @Valid @RequestBody AttemptStartRequest req) {
        return attemptService.start(userId, req);
    }

    @PostMapping("/{id}/submit")
    public AttemptResultDto submit(@AuthenticationPrincipal String userId, @PathVariable String id,
                                    @RequestBody AttemptSubmitRequest req) {
        return attemptService.submit(userId, id, req);
    }
}
