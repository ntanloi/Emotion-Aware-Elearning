package com.elearning.emotion.controller;

import com.elearning.emotion.dto.DictationGenerateResultDto;
import com.elearning.emotion.dto.DictationSourceRequest;
import com.elearning.emotion.service.DictationGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * FR-TCH: sinh (hoặc sinh lại) toàn bộ câu hỏi cho 1 Bộ chính tả (DICTATION_SET) từ thư viện
 * từ vựng. Xem lại kết quả đã sinh (kèm đáp án) dùng ENDPOINT CÓ SẴN
 * `GET /api/questions/teacher-view?contentItemId=...` — không cần API riêng.
 */
@RestController
@RequiredArgsConstructor
public class DictationController {

    private final DictationGeneratorService dictationGeneratorService;

    @PostMapping("/api/content-items/{id}/dictation-source")
    @PreAuthorize("hasRole('TEACHER')")
    public DictationGenerateResultDto generate(@AuthenticationPrincipal String teacherId,
                                                @PathVariable String id,
                                                @RequestBody DictationSourceRequest req) {
        return dictationGeneratorService.generate(teacherId, id, req);
    }
}
