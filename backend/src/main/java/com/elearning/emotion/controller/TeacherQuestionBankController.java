package com.elearning.emotion.controller;

import com.elearning.emotion.dto.QuestionDto;
import com.elearning.emotion.dto.test.BankImportRequest;
import com.elearning.emotion.dto.test.TeacherBankPartDto;
import com.elearning.emotion.dto.test.TeacherBankSummaryDto;
import com.elearning.emotion.service.TeacherQuestionBankService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teacher/question-bank")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@RequiredArgsConstructor
public class TeacherQuestionBankController {

    private final TeacherQuestionBankService teacherQuestionBankService;

    @GetMapping("/parts/{partNo}")
    public ResponseEntity<TeacherBankPartDto> getBankPart(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("partNo") int partNo
    ) {
        return ResponseEntity.ok(teacherQuestionBankService.getBankPart(teacherId, partNo));
    }

    @GetMapping("/summary")
    public ResponseEntity<TeacherBankSummaryDto> getBankSummary(
            @AuthenticationPrincipal String teacherId
    ) {
        return ResponseEntity.ok(teacherQuestionBankService.getBankSummary(teacherId));
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> deleteQuestion(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("id") String id
    ) {
        teacherQuestionBankService.deleteQuestionFromBank(teacherId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/candidate-questions")
    public ResponseEntity<List<QuestionDto>> getCandidateQuestions(
            @AuthenticationPrincipal String teacherId,
            @RequestParam("partNo") int partNo,
            @RequestParam("courseId") String courseId
    ) {
        return ResponseEntity.ok(teacherQuestionBankService.getCandidateQuestionsFromCourse(teacherId, partNo, courseId));
    }

    @PostMapping("/parts/{partNo}/import-from-course")
    public ResponseEntity<TeacherBankPartDto> importQuestionsFromCourse(
            @AuthenticationPrincipal String teacherId,
            @PathVariable("partNo") int partNo,
            @Valid @RequestBody BankImportRequest req
    ) {
        return ResponseEntity.ok(teacherQuestionBankService.importQuestionsFromCourse(teacherId, partNo, req));
    }
}
