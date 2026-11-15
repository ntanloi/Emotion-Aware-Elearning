package com.elearning.emotion.controller;

import com.elearning.emotion.dto.report.DeleteEmotionDataResultDto;
import com.elearning.emotion.dto.report.EmotionPrivacyOverviewDto;
import com.elearning.emotion.service.report.EmotionPrivacyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/privacy")
@RequiredArgsConstructor
public class EmotionPrivacyController {

    private final EmotionPrivacyService emotionPrivacyService;

    /**
     * Lấy thông tin tổng quan về lưu trữ dữ liệu cảm xúc & chính sách bảo mật cá nhân
     */
    @GetMapping("/emotion-data")
    public ResponseEntity<EmotionPrivacyOverviewDto> getPrivacyOverview(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(emotionPrivacyService.getPrivacyOverview(userId));
    }

    /**
     * Xóa toàn bộ dữ liệu cảm xúc cá nhân của học viên
     */
    @DeleteMapping("/emotion-data")
    public ResponseEntity<DeleteEmotionDataResultDto> deleteMyEmotionData(
            @AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(emotionPrivacyService.deleteUserEmotionData(userId));
    }
}
