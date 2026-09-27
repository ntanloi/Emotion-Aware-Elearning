package com.elearning.emotion.controller;

import com.elearning.emotion.dto.VocabPracticeQuestionDto;
import com.elearning.emotion.service.VocabPracticeGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** FR-LES-03: hoc vien lay cau hoi cho 1 trong 5 dang luyen tap tu vung tu sinh (BR-18) */
@RestController
@RequestMapping("/api/content-items/{contentItemId}/vocab-practice")
@RequiredArgsConstructor
public class VocabPracticeController {

    private final VocabPracticeGeneratorService generator;

    @GetMapping("/{practiceType}")
    public List<VocabPracticeQuestionDto> getQuestions(@PathVariable String contentItemId,
                                                         @PathVariable String practiceType) {
        var type = VocabPracticeGeneratorService.PracticeType.valueOf(practiceType.toUpperCase());
        // reveal=false: hoc vien khong duoc thay truoc dap an dung (tru FLASHCARD/MATCHING/FILL_BLANK
        // von khong co khai niem "reveal" vi khong phai trac nghiem)
        return generator.generate(contentItemId, type, false);
    }
}
