package com.elearning.emotion.dto.test;

import com.elearning.emotion.entity.ToeicTest;
import com.elearning.emotion.entity.ToeicTestPart;
import java.time.LocalDateTime;
import java.util.List;

public record ToeicTestDto(
        String id,
        String title,
        String description,
        String source,
        String status,
        String authorId,
        String authorName,
        Integer listeningMinutes,
        Integer readingMinutes,
        Integer totalMinutes,
        Integer attemptCount,
        Integer totalQuestions,
        List<ToeicTestPartInfoDto> parts,
        Integer version,
        String originTestId,
        String rejectionReason,
        LocalDateTime publishedAt
) {
    public static ToeicTestDto from(ToeicTest test, List<ToeicTestPart> parts) {
        int listening = test.getListeningMinutes() != null ? test.getListeningMinutes() : 45;
        int reading = test.getReadingMinutes() != null ? test.getReadingMinutes() : 75;
        int totalQ = parts == null ? 0 : parts.stream()
                .mapToInt(p -> p.getQuestionCount() != null ? p.getQuestionCount() : 0)
                .sum();
        List<ToeicTestPartInfoDto> partInfos = parts == null ? List.of() : parts.stream()
                .map(p -> new ToeicTestPartInfoDto(p.getPartNo(), p.getQuestionCount()))
                .toList();

        String authorName = "SYSTEM".equalsIgnoreCase(test.getSource())
                ? "Hệ thống"
                : (test.getAuthor() != null ? test.getAuthor().getFullName() : "Hệ thống");

        return new ToeicTestDto(
                test.getId(),
                test.getTitle(),
                test.getDescription(),
                test.getSource(),
                test.getStatus(),
                test.getAuthor() != null ? test.getAuthor().getId() : null,
                authorName,
                listening,
                reading,
                listening + reading,
                test.getAttemptCount() != null ? test.getAttemptCount() : 0,
                totalQ,
                partInfos,
                test.getVersion(),
                test.getOriginTest() != null ? test.getOriginTest().getId() : null,
                test.getRejectionReason(),
                test.getPublishedAt()
        );
    }
}
