package com.elearning.emotion.controller;

import com.elearning.emotion.config.EmotionAlertProperties;
import com.elearning.emotion.dto.LessonAlertDto;
import com.elearning.emotion.repository.LessonAlertRepository;
import com.elearning.emotion.service.EmotionAlertDemoService;
import com.elearning.emotion.service.SegmentAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher/alerts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TEACHER')")
public class TeacherAlertController {

    private final SegmentAlertService alertService;
    private final LessonAlertRepository lessonAlertRepository;
    private final EmotionAlertDemoService demoService;
    private final EmotionAlertProperties alertProperties;

    @GetMapping
    public ResponseEntity<List<LessonAlertDto>> getMyAlerts(
            @AuthenticationPrincipal String teacherId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(alertService.getAlertsByTeacher(teacherId, status));
    }

    @GetMapping("/count-open")
    public ResponseEntity<Map<String, Long>> countOpenAlerts(@AuthenticationPrincipal String teacherId) {
        long count = lessonAlertRepository.countOpenAlertsByTeacherId(teacherId);
        return ResponseEntity.ok(Map.of("openAlerts", count));
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<List<LessonAlertDto>> getLessonAlerts(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String lessonId) {
        return ResponseEntity.ok(alertService.getAlertsByLesson(teacherId, lessonId));
    }

    @PutMapping("/{alertId}/status")
    public ResponseEntity<LessonAlertDto> updateAlertStatus(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String alertId,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            throw new IllegalArgumentException("Trạng thái status không được để trống");
        }
        return ResponseEntity.ok(alertService.updateAlertStatus(teacherId, alertId, newStatus));
    }

    @PostMapping("/scan")
    public ResponseEntity<Map<String, Object>> triggerScan(@AuthenticationPrincipal String teacherId) {
        int count = alertService.scanAndGenerateAlertsForTeacher(teacherId);
        return ResponseEntity.ok(Map.of("success", true, "generatedAlerts", count));
    }

    @PostMapping("/demo-seed")
    public ResponseEntity<Map<String, Object>> seedDemo(
            @AuthenticationPrincipal String teacherId,
            @RequestParam(required = false) String contentItemId,
            @RequestParam(defaultValue = "20") int studentCount) {
        if (!alertProperties.isDemoSeedEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", "Chức năng sinh dữ liệu demo đã bị tắt trên môi trường này."));
        }
        return ResponseEntity.ok(demoService.seedDemoData(teacherId, contentItemId, studentCount));
    }
}
