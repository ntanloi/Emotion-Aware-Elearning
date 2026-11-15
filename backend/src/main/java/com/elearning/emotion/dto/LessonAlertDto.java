package com.elearning.emotion.dto;

import com.elearning.emotion.entity.LessonAlert;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class LessonAlertDto {
    String id;
    String contentItemId;
    String lessonTitle;
    String courseId;
    String courseTitle;
    Integer startSec;
    Integer endSec;
    String timeRangeLabel;
    Double negativeRatio;
    Double negativePercent;
    Integer nStudents;
    String status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    // V2 Fields
    String dominantState;       // CONFUSED | BORED
    Integer affectedStudents;
    Integer recurringStudents;
    Integer sustainedStudents;
    String severity;            // HIGH | MEDIUM | LOW
    Integer rawStartSec;
    Double affectedPercent;
    String recommendation;

    public static String buildRecommendation(String dominantState, int recurring, int sustained, double affectedPercent) {
        StringBuilder sb = new StringBuilder();
        if ("CONFUSED".equalsIgnoreCase(dominantState)) {
            sb.append("Đoạn này học viên có dấu hiệu khó hiểu hoặc cấu trúc ngữ pháp phức tạp. Nên bổ sung ví dụ minh họa và điều chỉnh tốc độ giải thích.");
        } else if ("BORED".equalsIgnoreCase(dominantState)) {
            sb.append("Đoạn này học viên có xu hướng giảm chú ý hoặc nội dung dài dòng. Nên chèn thêm câu hỏi tương tác ngắn hoặc thay đổi ngữ điệu.");
        } else {
            sb.append("Đoạn này có nhiều học viên gặp khó khăn trong tiếp thu. Giảng viên nên xem lại và tinh chỉnh cách truyền đạt.");
        }

        if (recurring > 0) {
            sb.append(" Có ").append(recurring).append(" học viên bị bối rối lặp lại nhiều lần, nên cân nhắc chia nhỏ slide hoặc khái niệm này.");
        }
        return sb.toString();
    }

    public static LessonAlertDto from(LessonAlert alert) {
        if (alert == null) return null;
        int s = alert.getStartSec() != null ? alert.getStartSec() : 0;
        int e = alert.getEndSec() != null ? alert.getEndSec() : 0;
        String label = String.format("%02d:%02d - %02d:%02d", s / 60, s % 60, e / 60, e % 60);

        double ratio = alert.getNegativeRatio() != null ? alert.getNegativeRatio().doubleValue() : 0.0;
        double pct = Math.round(ratio * 1000.0) / 10.0;

        int totalWatching = alert.getNStudents() != null ? alert.getNStudents() : 0;
        int affected = alert.getAffectedStudents() != null ? alert.getAffectedStudents() : 0;
        int recurring = alert.getRecurringStudents() != null ? alert.getRecurringStudents() : 0;
        int sustained = alert.getSustainedStudents() != null ? alert.getSustainedStudents() : 0;
        double affectedPct = totalWatching > 0
                ? Math.round(((double) affected / totalWatching) * 1000.0) / 10.0
                : pct;

        String itemTitle = alert.getContentItem() != null ? alert.getContentItem().getTitle() : null;
        String cId = (alert.getContentItem() != null && alert.getContentItem().getCourse() != null)
                ? alert.getContentItem().getCourse().getId() : null;
        String cTitle = (alert.getContentItem() != null && alert.getContentItem().getCourse() != null)
                ? alert.getContentItem().getCourse().getTitle() : null;

        String dominant = alert.getDominantState() != null ? alert.getDominantState() : "CONFUSED";
        String recommendation = buildRecommendation(dominant, recurring, sustained, affectedPct);

        return LessonAlertDto.builder()
                .id(alert.getId())
                .contentItemId(alert.getContentItem() != null ? alert.getContentItem().getId() : null)
                .lessonTitle(itemTitle)
                .courseId(cId)
                .courseTitle(cTitle)
                .startSec(s)
                .endSec(e)
                .timeRangeLabel(label)
                .negativeRatio(ratio)
                .negativePercent(pct)
                .nStudents(totalWatching)
                .status(alert.getStatus())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .dominantState(alert.getDominantState())
                .affectedStudents(affected)
                .recurringStudents(recurring)
                .sustainedStudents(sustained)
                .severity(alert.getSeverity() != null ? alert.getSeverity() : "MEDIUM")
                .rawStartSec(alert.getRawStartSec() != null ? alert.getRawStartSec() : s)
                .affectedPercent(affectedPct)
                .recommendation(recommendation)
                .build();
    }
}
