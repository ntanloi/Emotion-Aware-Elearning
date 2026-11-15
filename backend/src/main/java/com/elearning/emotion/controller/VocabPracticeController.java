package com.elearning.emotion.controller;

import com.elearning.emotion.dto.VocabPracticeQuestionDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.service.CourseAccessService;
import com.elearning.emotion.service.VocabPracticeGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** FR-LES-03: hoc vien lay cau hoi cho 1 trong 5 dang luyen tap tu vung tu sinh (BR-18) */
@RestController
@RequestMapping("/api/content-items/{contentItemId}/vocab-practice")
@RequiredArgsConstructor
public class VocabPracticeController {

    private final VocabPracticeGeneratorService generator;
    private final ContentItemRepository contentItemRepository;
    private final CourseAccessService courseAccessService;

    @GetMapping("/{practiceType}")
    public List<VocabPracticeQuestionDto> getQuestions(@PathVariable String contentItemId,
                                                         @PathVariable String practiceType,
                                                         @AuthenticationPrincipal String userId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay noi dung"));
        courseAccessService.validateCanLearn(userId, item.getCourse());

        var type = VocabPracticeGeneratorService.PracticeType.valueOf(practiceType.toUpperCase());
        // Tra ve correctChoiceIndex de FE kiem tra dap an ngay khi hoc vien luyen tap trac nghiem / nghe
        return generator.generate(contentItemId, type, true);
    }
}
