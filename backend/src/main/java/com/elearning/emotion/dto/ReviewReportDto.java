package com.elearning.emotion.dto;

import com.elearning.emotion.entity.ReviewReport;
import java.time.LocalDateTime;

public record ReviewReportDto(
        String id,
        String reviewId,
        String courseId,
        String courseTitle,
        String studentName,
        String studentEmail,
        Integer rating,
        String comment,
        String imageId,
        String imageUrl,
        String reporterId,
        String reporterName,
        String reporterEmail,
        String reason,
        String details,
        String status,
        String resolvedByName,
        LocalDateTime resolvedAt,
        String resolutionNote,
        LocalDateTime createdAt
) {
    public static ReviewReportDto from(ReviewReport r) {
        if (r == null) return null;
        var rev = r.getReview();
        return new ReviewReportDto(
                r.getId(),
                rev.getId(),
                rev.getCourse() != null ? rev.getCourse().getId() : null,
                rev.getCourse() != null ? rev.getCourse().getTitle() : null,
                rev.getUser() != null ? CourseReviewDto.anonymizeName(rev.getUser().getFullName()) : "Học viên",
                rev.getUser() != null ? rev.getUser().getEmail() : null,
                rev.getRating(),
                rev.getComment(),
                r.getImage() != null ? r.getImage().getId() : null,
                r.getImage() != null && r.getImage().getMediaAsset() != null ? r.getImage().getMediaAsset().getUrl() : null,
                r.getReporter() != null ? r.getReporter().getId() : null,
                r.getReporter() != null ? r.getReporter().getFullName() : null,
                r.getReporter() != null ? r.getReporter().getEmail() : null,
                r.getReason(),
                r.getDetails(),
                r.getStatus(),
                r.getResolvedBy() != null ? r.getResolvedBy().getFullName() : null,
                r.getResolvedAt(),
                r.getResolutionNote(),
                r.getCreatedAt()
        );
    }
}
