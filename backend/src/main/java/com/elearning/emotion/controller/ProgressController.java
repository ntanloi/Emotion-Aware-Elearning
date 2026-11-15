package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CourseProgressDto;
import com.elearning.emotion.dto.ItemProgressDto;
import com.elearning.emotion.dto.VideoProgressRequest;
import com.elearning.emotion.dto.AttemptSubmitRequest;
import com.elearning.emotion.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    /**
     * Lấy cây tiến độ phân cấp đầy đủ của học viên trong 1 khóa học (Cấp 3 -> Cấp 2 -> Cấp 1 -> Cấp 0).
     */
    @GetMapping("/courses/{courseId}/progress")
    public CourseProgressDto getCourseProgress(
            @PathVariable String courseId,
            @AuthenticationPrincipal String userId
    ) {
        return progressService.getCourseProgressTree(userId, courseId);
    }

    /**
     * Ghi nhận tiến độ xem video bài giảng. Xem >= 80% thời lượng đạt 100% hoàn thành.
     */
    @PostMapping("/content-items/{itemId}/video-progress")
    public ItemProgressDto recordVideoProgress(
            @PathVariable String itemId,
            @RequestBody VideoProgressRequest req,
            @AuthenticationPrincipal String userId
    ) {
        return progressService.recordVideoProgress(userId, itemId, req);
    }

    /**
     * Ghi nhận hoàn thành xem Flashcards của 1 bộ từ vựng VOCAB_SET.
     */
    @PostMapping("/content-items/{itemId}/vocab-completed")
    public ItemProgressDto recordVocabCompleted(
            @PathVariable String itemId,
            @AuthenticationPrincipal String userId
    ) {
        return progressService.recordVocabCompleted(userId, itemId);
    }

    /**
     * Đánh dấu đã đọc bài lý thuyết ngữ pháp.
     */
    @PostMapping("/content-items/{itemId}/grammar-read")
    public ItemProgressDto recordGrammarRead(
            @PathVariable String itemId,
            @AuthenticationPrincipal String userId
    ) {
        return progressService.recordGrammarRead(userId, itemId);
    }

    /**
     * Lưu tiến độ các câu hỏi đang làm dang dở mà chưa nộp bài.
     */
    @PostMapping("/content-items/{itemId}/save-partial-answers")
    public ItemProgressDto savePartialAnswers(
            @PathVariable String itemId,
            @RequestParam(required = false) String attemptId,
            @RequestBody AttemptSubmitRequest req,
            @AuthenticationPrincipal String userId
    ) {
        return progressService.savePartialAnswers(userId, itemId, attemptId, req.answers());
    }
}
