package com.elearning.emotion.controller;

import com.elearning.emotion.dto.FlashcardProgressDto;
import com.elearning.emotion.dto.FlashcardReviewRequest;
import com.elearning.emotion.dto.VocabExampleDto;
import com.elearning.emotion.repository.FlashcardProgressRepository;
import com.elearning.emotion.repository.VocabExampleRepository;
import com.elearning.emotion.service.FlashcardProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** FR-LES-07: On tap Flashcards tong hop - gom TU MOI muc sidebar/khoa hoc da hoc, KHONG do giang vien soan */
@RestController
@RequestMapping("/api/flashcards")
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardProgressRepository progressRepository;
    private final FlashcardProgressService progressService;
    private final VocabExampleRepository vocabExampleRepository;

    @GetMapping("/mine")
    public List<FlashcardProgressDto> mine(@AuthenticationPrincipal String userId) {
        return progressRepository.findByUserId(userId).stream()
                .map(p -> FlashcardProgressDto.from(p, examplesFor(p.getWord().getId())))
                .toList();
    }

    @PostMapping("/review")
    public FlashcardProgressDto review(@AuthenticationPrincipal String userId,
                                       @Valid @RequestBody FlashcardReviewRequest req) {
        var progress = progressService.review(userId, req.wordId(), req.knewIt());
        return FlashcardProgressDto.from(progress, examplesFor(req.wordId()));
    }

    private List<VocabExampleDto> examplesFor(String wordId) {
        return vocabExampleRepository.findByWordId(wordId).stream().map(VocabExampleDto::from).toList();
    }
}