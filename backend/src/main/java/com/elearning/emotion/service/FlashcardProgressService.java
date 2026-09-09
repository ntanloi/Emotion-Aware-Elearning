package com.elearning.emotion.service;

import com.elearning.emotion.entity.FlashcardProgress;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.repository.FlashcardProgressRepository;
import com.elearning.emotion.repository.VocabWordRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * FR-LES-07: On tap Flashcards tong hop - spaced repetition don gian (khong dung thuat toan
 * SM-2 day du, chi 3 buoc NEW -> LEARNING -> MASTERED phu hop pham vi do an):
 *   Chua biet (knewIt=false) -> luon quay ve LEARNING, on lai sau 1 ngay.
 *   Da biet lan dau (dang NEW/LEARNING) -> chuyen buoc tiep theo, gian cach dai hon.
 *   Da biet khi dang MASTERED -> giu MASTERED, gian cach xa nhat (7 ngay).
 */
@Service
@RequiredArgsConstructor
public class FlashcardProgressService {

    private final FlashcardProgressRepository progressRepository;
    private final VocabWordRepository vocabWordRepository;
    private final UserRepository userRepository;

    public FlashcardProgress review(String userId, String wordId, boolean knewIt) {
        VocabWord word = vocabWordRepository.findById(wordId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay tu vung"));

        FlashcardProgress progress = progressRepository.findByUserIdAndWordId(userId, wordId)
                .orElseGet(() -> FlashcardProgress.builder()
                        .user(userRepository.getReferenceById(userId))
                        .word(word)
                        .status("NEW")
                        .build());

        LocalDateTime now = LocalDateTime.now();
        progress.setLastReviewedAt(now);

        if (!knewIt) {
            progress.setStatus("LEARNING");
            progress.setNextReviewAt(now.plusDays(1));
        } else {
            String nextStatus = switch (progress.getStatus()) {
                case "NEW" -> "LEARNING";
                case "LEARNING" -> "MASTERED";
                default -> "MASTERED";
            };
            progress.setStatus(nextStatus);
            progress.setNextReviewAt(switch (nextStatus) {
                case "LEARNING" -> now.plusDays(3);
                default -> now.plusDays(7);
            });
        }
        return progressRepository.save(progress);
    }
}
