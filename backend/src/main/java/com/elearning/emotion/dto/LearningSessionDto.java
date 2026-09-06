package com.elearning.emotion.dto;

import com.elearning.emotion.entity.LearningSession;

import java.time.LocalDateTime;

/**
 * BUGFIX (500/loi serialize khi goi POST /api/sessions va cac endpoint pause/resume/finish...):
 * Controller truoc day tra thang ve entity LearningSession. Entity nay co quan he @ManyToOne
 * LAZY toi ContentItem, roi ContentItem lai tham chieu toi Course -> User(teacher)...
 * Vi @EnableMethodSecurity/response dang duoc serialize NGOAI pham vi Hibernate session that
 * su can (hoac Jackson co gang di theo toan bo chuoi quan he), Jackson gap phai cac
 * HibernateProxy (vd ByteBuddyInterceptor) ma no khong biet serialize nhu the nao ->
 * ném InvalidDefinitionException ("No serializer found for class
 * org.hibernate.proxy.pojo.bytebuddy.ByteBuddyInterceptor"), request that bai ngay
 * o buoc ghi JSON response (xem log loi kem theo).
 * Cach sua dung: KHONG tra entity JPA thang ra ngoai API - luon map sang DTO chi chua
 * cac truong can thiet cho frontend (giong cac controller khac trong du an, vd ContentItemDto).
 */
public record LearningSessionDto(
        String id,
        String contentItemId,
        String status,
        Boolean hasCameraPermission,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Float focusScore
) {
    public static LearningSessionDto from(LearningSession s) {
        return new LearningSessionDto(
                s.getId(),
                s.getContentItem().getId(),
                s.getStatus(),
                s.getHasCameraPermission(),
                s.getStartTime(),
                s.getEndTime(),
                s.getFocusScore()
        );
    }
}