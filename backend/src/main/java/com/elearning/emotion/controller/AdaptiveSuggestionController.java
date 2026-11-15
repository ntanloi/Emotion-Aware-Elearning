package com.elearning.emotion.controller;

import com.elearning.emotion.dto.AdaptiveSuggestionDto;
import com.elearning.emotion.dto.SuggestionRespondRequest;
import com.elearning.emotion.service.AdaptiveSuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suggestions")
@RequiredArgsConstructor
public class AdaptiveSuggestionController {

    private final AdaptiveSuggestionService suggestionService;

    @PostMapping("/{id}/respond")
    public AdaptiveSuggestionDto respondToSuggestion(
            @PathVariable String id,
            @RequestBody SuggestionRespondRequest req,
            @AuthenticationPrincipal String userId
    ) {
        return suggestionService.respondToSuggestion(id, req.wasAccepted(), userId);
    }
}
