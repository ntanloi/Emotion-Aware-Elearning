package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CameraPermissionRequest;
import com.elearning.emotion.dto.LearningSessionDto;
import com.elearning.emotion.dto.StartSessionRequest;
import com.elearning.emotion.service.LearningSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class LearningSessionController {

    private final LearningSessionService sessionService;

    // BUGFIX: tra ve LearningSessionDto thay vi entity LearningSession truc tiep -
    // xem giai thich chi tiet trong LearningSessionDto (Jackson khong serialize duoc
    // chuoi quan he lazy Hibernate proxy contentItem->unit->course->teacher).
    @PostMapping
    public LearningSessionDto start(@AuthenticationPrincipal String userId, @Valid @RequestBody StartSessionRequest req) {
        return LearningSessionDto.from(sessionService.startSession(userId, req.contentItemId()));
    }

    @PostMapping("/{id}/camera-permission")
    public LearningSessionDto setCameraPermission(@PathVariable String id,
                                                  @RequestBody CameraPermissionRequest req,
                                                  @AuthenticationPrincipal String userId) {
        return LearningSessionDto.from(sessionService.setCameraPermission(id, req.granted(), req.consentVersion(), userId));
    }

    @PostMapping("/{id}/pause")
    public LearningSessionDto pause(@PathVariable String id,
                                   @AuthenticationPrincipal String userId) {
        return LearningSessionDto.from(sessionService.pause(id, userId));
    }

    @PostMapping("/{id}/resume")
    public LearningSessionDto resume(@PathVariable String id,
                                    @AuthenticationPrincipal String userId) {
        return LearningSessionDto.from(sessionService.resume(id, userId));
    }

    @PostMapping("/{id}/finish")
    public LearningSessionDto finish(@PathVariable String id,
                                     @RequestParam(defaultValue = "false") boolean abandoned,
                                     @AuthenticationPrincipal String userId) {
        return LearningSessionDto.from(sessionService.finish(id, abandoned, userId));
    }

    @GetMapping("/{id}/summary")
    public com.elearning.emotion.dto.SessionSummaryDto getSummary(@PathVariable String id,
                                                                 @AuthenticationPrincipal String userId) {
        return sessionService.getSessionSummary(id, userId);
    }

    @PostMapping("/{id}/attempt/restart")
    public com.elearning.emotion.service.VideoViewAttemptService.AttemptSnapshot restartAttempt(
            @PathVariable String id,
            @AuthenticationPrincipal String userId) {
        return sessionService.restartAttempt(id, userId);
    }
}