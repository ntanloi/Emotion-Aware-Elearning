package com.elearning.emotion.dto;

import com.elearning.emotion.entity.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDto {

    private String id;
    private ActorDto actor;
    private String action;
    private String targetType;
    private String targetId;
    private String detail;
    private String ip;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActorDto {
        private String id;
        private String fullName;
        private String email;
    }

    public static AuditLogDto from(AuditLog log) {
        if (log == null) return null;

        ActorDto actorDto = null;
        if (log.getActor() != null) {
            try {
                actorDto = ActorDto.builder()
                        .id(log.getActor().getId())
                        .fullName(log.getActor().getFullName())
                        .email(log.getActor().getEmail())
                        .build();
            } catch (Exception ignored) {
                // Bỏ qua nếu proxy chưa được nạp
            }
        }

        return AuditLogDto.builder()
                .id(log.getId())
                .actor(actorDto)
                .action(log.getAction())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .detail(log.getDetail())
                .ip(log.getIp())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
