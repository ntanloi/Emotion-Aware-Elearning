package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CameraPermissionRequest;
import com.elearning.emotion.dto.StartSessionRequest;
import com.elearning.emotion.entity.LearningSession;
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

    @PostMapping
    public LearningSession start(@AuthenticationPrincipal String userId, @Valid @RequestBody StartSessionRequest req) {
        return sessionService.startSession(userId, req.lessonId());
    }

    @PostMapping("/{id}/camera-permission")
    public LearningSession setCameraPermission(@PathVariable String id, @RequestBody CameraPermissionRequest req) {
        return sessionService.setCameraPermission(id, req.granted());
    }

    @PostMapping("/{id}/pause")
    public LearningSession pause(@PathVariable String id) {
        return sessionService.pause(id);
    }

    @PostMapping("/{id}/resume")
    public LearningSession resume(@PathVariable String id) {
        return sessionService.resume(id);
    }

    @PostMapping("/{id}/finish")
    public LearningSession finish(@PathVariable String id, @RequestParam(defaultValue = "false") boolean abandoned) {
        return sessionService.finish(id, abandoned);
    }
}
