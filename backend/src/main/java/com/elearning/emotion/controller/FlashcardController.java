package com.elearning.emotion.controller;

import com.elearning.emotion.dto.FlashcardProgressDto;
import com.elearning.emotion.dto.FlashcardReviewRequest;
import com.elearning.emotion.dto.FlashcardSetSummaryDto;
import com.elearning.emotion.dto.VocabExampleDto;
import com.elearning.emotion.entity.FlashcardProgress;
import com.elearning.emotion.entity.VocabExample;
import com.elearning.emotion.repository.FlashcardProgressRepository;
import com.elearning.emotion.repository.VocabExampleRepository;
import com.elearning.emotion.service.FlashcardProgressService;
import com.elearning.emotion.service.FlashcardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** FR-LES-07: On tap Flashcards tong hop - gom TU MOI muc sidebar/khoa hoc da hoc, KHONG do giang vien soan */
@RestController
@RequestMapping("/api/flashcards")
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardProgressRepository progressRepository;
    private final FlashcardProgressService progressService;
    private final VocabExampleRepository vocabExampleRepository;
    private final FlashcardService flashcardService;

    /** Lấy danh sách các bộ từ vựng sẵn có từ khóa học với truy vấn SQL gom nhóm siêu tốc */
    @GetMapping("/available-sets")
    public List<FlashcardSetSummaryDto> availableSets() {
        return flashcardService.getAvailableVocabSets();
    }

    @GetMapping("/mine")
    public List<FlashcardProgressDto> mine(@AuthenticationPrincipal String userId) {
        List<FlashcardProgress> progresses = progressRepository.findByUserIdWithMedia(userId);
        if (progresses.isEmpty()) return List.of();

        List<String> wordIds = progresses.stream().map(p -> p.getWord().getId()).toList();
        List<VocabExample> examples = vocabExampleRepository.findByWordIdInWithAudio(wordIds);
        Map<String, List<VocabExampleDto>> exampleMap = examples.stream()
                .collect(Collectors.groupingBy(ex -> ex.getWord().getId(),
                        Collectors.mapping(VocabExampleDto::from, Collectors.toList())));

        return progresses.stream()
                .map(p -> FlashcardProgressDto.from(p, exampleMap.getOrDefault(p.getWord().getId(), List.of())))
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