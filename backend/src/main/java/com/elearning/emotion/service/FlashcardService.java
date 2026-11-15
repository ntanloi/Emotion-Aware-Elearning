package com.elearning.emotion.service;

import com.elearning.emotion.dto.FlashcardSetSummaryDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.VocabSetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlashcardService {

    private final ContentItemRepository contentItemRepository;
    private final VocabSetItemRepository vocabSetItemRepository;

    @Transactional(readOnly = true)
    public List<FlashcardSetSummaryDto> getAvailableVocabSets() {
        List<ContentItem> vocabSets = contentItemRepository.findAllVocabSetsWithCourse();
        if (vocabSets.isEmpty()) {
            return List.of();
        }

        List<String> contentItemIds = vocabSets.stream().map(ContentItem::getId).toList();

        // 1. Đếm tổng số từ mỗi bộ
        Map<String, Integer> wordCountMap = vocabSetItemRepository.countWordsByContentItemIds(contentItemIds).stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).intValue(),
                        (existing, replacement) -> existing
                ));

        // 2. Lấy các từ mẫu (tối đa 5 từ mỗi bộ)
        List<Object[]> sampleRows = vocabSetItemRepository.findSampleWordsByContentItemIds(contentItemIds);
        Map<String, List<FlashcardSetSummaryDto.SampleWordDetail>> sampleDetailsMap = new HashMap<>();
        Map<String, List<String>> sampleWordsMap = new HashMap<>();

        for (Object[] row : sampleRows) {
            String ciId = (String) row[0];
            String word = (String) row[1];
            String meaningVi = (String) row[2];

            sampleDetailsMap.computeIfAbsent(ciId, k -> new ArrayList<>())
                    .add(new FlashcardSetSummaryDto.SampleWordDetail(word, meaningVi));
            sampleWordsMap.computeIfAbsent(ciId, k -> new ArrayList<>())
                    .add(word);
        }

        // 3. Gom và gán số thứ tự bộ theo từng khóa học
        Map<String, Integer> courseSetCounter = new HashMap<>();
        List<FlashcardSetSummaryDto> result = new ArrayList<>();

        for (ContentItem ci : vocabSets) {
            int count = wordCountMap.getOrDefault(ci.getId(), 0);
            if (count == 0) {
                continue; // Bỏ qua bộ rỗng
            }

            int setIndex = courseSetCounter.merge(ci.getCourse().getId(), 1, Integer::sum);
            List<String> sampleWords = sampleWordsMap.getOrDefault(ci.getId(), List.of());
            List<FlashcardSetSummaryDto.SampleWordDetail> sampleDetails = sampleDetailsMap.getOrDefault(ci.getId(), List.of());

            String rawTitle = ci.getTitle();
            String displayTitle = rawTitle;
            if (displayTitle == null || displayTitle.trim().equals("Từ vựng: Flashcards")
                    || displayTitle.trim().equals("Flashcards") || displayTitle.trim().equals("Bộ từ vựng")) {
                displayTitle = "Bộ từ #" + setIndex + (sampleWords.isEmpty() ? "" : ": " + String.join(", ", sampleWords.stream().limit(3).toList()) + "...");
            } else if (!displayTitle.contains("#" + setIndex)) {
                displayTitle = displayTitle + " (Bộ #" + setIndex + ")";
            }

            String description = "Khóa học \"" + ci.getCourse().getTitle() + "\" • Gồm: "
                    + (sampleWords.isEmpty() ? "..." : String.join(", ", sampleWords) + "...");

            String badge = ci.getCourse().getTitle() + " • Bộ #" + setIndex;

            result.add(new FlashcardSetSummaryDto(
                    "COURSE_SET_" + ci.getId(),
                    ci.getId(),
                    displayTitle,
                    rawTitle,
                    ci.getCourse().getId(),
                    ci.getCourse().getTitle(),
                    setIndex,
                    description,
                    "COURSE",
                    badge,
                    count,
                    sampleWords,
                    sampleDetails
            ));
        }

        return result;
    }
}
