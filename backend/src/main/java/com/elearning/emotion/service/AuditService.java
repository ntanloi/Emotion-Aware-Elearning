package com.elearning.emotion.service;

import com.elearning.emotion.entity.AuditLog;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

@Service
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, @Autowired(required = false) ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Transactional
    public void log(User actor, String action, String targetType, String targetId, String detailJson) {
        try {
            String ip = extractClientIp();
            String safeDetail = ensureValidJson(detailJson);
            AuditLog auditLog = AuditLog.builder()
                    .actor(actor)
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .detail(safeDetail)
                    .ip(ip)
                    .build();
            auditLogRepository.save(auditLog);
            log.info("AUDIT: User {} performed {} on {}:{}", actor != null ? actor.getEmail() : "SYSTEM", action, targetType, targetId);
        } catch (Exception e) {
            log.error("Failed to persist audit log: action={}, targetType={}, targetId={}, error={}",
                    action, targetType, targetId, e.getMessage(), e);
        }
    }

    private String ensureValidJson(String detail) {
        if (detail == null || detail.isBlank()) {
            return "{}";
        }
        String trimmed = detail.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
                objectMapper.readTree(trimmed);
                return trimmed;
            } catch (Exception ignored) {
                // Không phải JSON hợp lệ -> bọc thành JSON object
            }
        }
        try {
            return objectMapper.writeValueAsString(Map.of("message", trimmed));
        } catch (Exception e) {
            return "{\"message\":\"" + trimmed.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "") + "\"}";
        }
    }

    private String extractClientIp() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                    ip = request.getRemoteAddr();
                } else if (ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        } catch (Exception ignored) {
        }
        return "127.0.0.1";
    }
}
