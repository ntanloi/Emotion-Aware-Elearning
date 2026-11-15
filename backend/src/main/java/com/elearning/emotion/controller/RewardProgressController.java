package com.elearning.emotion.controller;

import com.elearning.emotion.dto.RewardProgressDto;
import com.elearning.emotion.service.RewardProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me/rewards")
@RequiredArgsConstructor
public class RewardProgressController {

    private final RewardProgressService rewardProgressService;

    @GetMapping
    public ResponseEntity<List<RewardProgressDto>> getMyRewards(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String courseId
    ) {
        return ResponseEntity.ok(rewardProgressService.getMyRewards(userId, courseId));
    }
}
