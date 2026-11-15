package com.elearning.emotion.controller;

import com.elearning.emotion.dto.test.*;
import com.elearning.emotion.service.TeacherTestBuilderService;
import com.elearning.emotion.service.ToeicTestSnapshotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teacher/tests")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@RequiredArgsConstructor
public class TeacherToeicTestController {

    private final ToeicTestSnapshotService toeicTestSnapshotService;
    private final TeacherTestBuilderService teacherTestBuilderService;

    @PostMapping("/custom")
    public ResponseEntity<ToeicTestDto> createCustomTest(
            @AuthenticationPrincipal String teacherId,
            @Valid @RequestBody ToeicTestCreateCustomRequest req
    ) {
        return ResponseEntity.ok(teacherTestBuilderService.createCustomTest(teacherId, req));
    }

    @GetMapping("/{id}/builder")
    public ResponseEntity<TeacherTestBuilderDto> getTestBuilderDetail(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(teacherTestBuilderService.getTestBuilderDetail(teacherId, id));
    }

    @PostMapping("/{id}/parts/{partNo}/import-from-bank")
    public ResponseEntity<TeacherTestPartDetailDto> importQuestionsFromBank(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("id") String id,
            @PathVariable("partNo") int partNo,
            @Valid @RequestBody BankImportRequest req
    ) {
        return ResponseEntity.ok(teacherTestBuilderService.importQuestionsFromBank(teacherId, id, partNo, req));
    }

    @DeleteMapping("/{id}/questions/{questionId}")
    public ResponseEntity<Void> removeQuestionFromTest(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("id") String id,
            @PathVariable("questionId") String questionId
    ) {
        teacherTestBuilderService.removeQuestionFromTest(teacherId, id, questionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDraftTest(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("id") String id
    ) {
        teacherTestBuilderService.deleteDraftTest(teacherId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ToeicTestDto> snapshotFromCourse(
            @AuthenticationPrincipal String teacherId,
            @Valid @RequestBody ToeicTestPublishRequest req
    ) {
        return ResponseEntity.ok(toeicTestSnapshotService.snapshotFromCourse(teacherId, req));
    }

    @PostMapping("/{id}/submit-review")
    public ResponseEntity<ToeicTestDto> submitForReview(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(toeicTestSnapshotService.submitForReview(teacherId, id));
    }

    @PostMapping("/{id}/toggle-status")
    public ResponseEntity<ToeicTestDto> toggleStatusOrWithdraw(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("id") String id
    ) {
        return ResponseEntity.ok(toeicTestSnapshotService.toggleStatusOrWithdraw(teacherId, id));
    }

    @GetMapping
    public ResponseEntity<Page<ToeicTestDto>> listTeacherTests(
            @AuthenticationPrincipal String teacherId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(toeicTestSnapshotService.listTeacherTests(teacherId, pageable));
    }

    @GetMapping("/stats")
    public ResponseEntity<TeacherTestStatsDto> getTeacherTestStats(
            @AuthenticationPrincipal String teacherId
    ) {
        return ResponseEntity.ok(toeicTestSnapshotService.getTeacherTestStats(teacherId));
    }
}
