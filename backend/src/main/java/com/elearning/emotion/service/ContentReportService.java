package com.elearning.emotion.service;

import com.elearning.emotion.dto.ContentReportDto;
import com.elearning.emotion.dto.CreateContentReportRequest;
import com.elearning.emotion.dto.HandleReportRequest;
import com.elearning.emotion.entity.ContentReport;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.ContentReportRepository;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.security.AuthInfoCache;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContentReportService {

    private final ContentReportRepository contentReportRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final CourseService courseService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final AuthInfoCache authInfoCache;

    @Transactional
    public ContentReportDto submitReport(String reporterId, CreateContentReportRequest req) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        ContentReport report = ContentReport.builder()
                .reporter(reporter)
                .targetType(req.targetType().trim().toUpperCase())
                .targetId(req.targetId().trim())
                .reason(req.reason().trim().toUpperCase())
                .description(req.description() != null ? req.description().trim() : null)
                .status("PENDING")
                .build();

        ContentReport saved = contentReportRepository.save(report);
        log.info("User {} submitted report {} against {}/{}", reporterId, saved.getId(), req.targetType(), req.targetId());
        return ContentReportDto.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<ContentReportDto> getReports(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ContentReport> reports = (status != null && !status.isBlank())
                ? contentReportRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable)
                : contentReportRepository.findAllByOrderByCreatedAtDesc(pageable);
        return reports.map(ContentReportDto::from);
    }

    @Transactional
    public ContentReportDto handleReport(String adminId, String reportId, HandleReportRequest req) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        ContentReport report = contentReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy báo cáo vi phạm"));

        String action = req.action().trim().toUpperCase();
        String note = req.adminNote() != null ? req.adminNote().trim() : "";

        report.setHandledBy(admin);
        report.setHandledAt(LocalDateTime.now());
        report.setAdminNote(note);

        switch (action) {
            case "DISMISS" -> {
                report.setStatus("DISMISSED");
                log.info("Admin {} dismissed report {}", adminId, reportId);
            }
            case "WARN" -> {
                report.setStatus("WARNED");
                // Gửi cảnh báo đến chủ sở hữu đối tượng
                resolveTargetOwnerAndNotify(report, "Cảnh báo vi phạm nội dung",
                        "Nội dung của bạn bị báo cáo vi phạm (" + report.getReason() + "). Vui lòng kiểm tra và chỉnh sửa. Ghi chú admin: " + note);
            }
            case "SUSPEND_COURSE" -> {
                report.setStatus("SUSPENDED");
                if ("COURSE".equalsIgnoreCase(report.getTargetType())) {
                    courseService.suspend(adminId, report.getTargetId(), "Đình chỉ do vi phạm báo cáo: " + note);
                }
            }
            case "LOCK_USER" -> {
                report.setStatus("LOCKED");
                resolveTargetUserAndLock(report, admin, note);
            }
            default -> throw new IllegalArgumentException("Hành động xử lý không hợp lệ: " + action);
        }

        ContentReport saved = contentReportRepository.save(report);
        auditService.log(admin, "HANDLE_REPORT", "CONTENT_REPORT", reportId,
                "Hành động: " + action + ", Ghi chú: " + note);

        return ContentReportDto.from(saved);
    }

    private void resolveTargetOwnerAndNotify(ContentReport report, String title, String content) {
        try {
            if ("COURSE".equalsIgnoreCase(report.getTargetType())) {
                courseRepository.findById(report.getTargetId()).ifPresent(c -> {
                    if (c.getTeacher() != null) {
                        notificationService.send(c.getTeacher().getId(), title, content, "MODERATION", c.getId(), "/teacher/courses");
                    }
                });
            } else if ("TEACHER".equalsIgnoreCase(report.getTargetType())) {
                notificationService.send(report.getTargetId(), title, content, "MODERATION", report.getId(), "/profile");
            }
        } catch (Exception ex) {
            log.warn("Không thể gửi thông báo cảnh báo báo cáo: {}", ex.getMessage());
        }
    }

    private void resolveTargetUserAndLock(ContentReport report, User admin, String note) {
        String targetUserId = null;
        if ("TEACHER".equalsIgnoreCase(report.getTargetType())) {
            targetUserId = report.getTargetId();
        } else if ("COURSE".equalsIgnoreCase(report.getTargetType())) {
            Course c = courseRepository.findById(report.getTargetId()).orElse(null);
            if (c != null && c.getTeacher() != null) {
                targetUserId = c.getTeacher().getId();
            }
        }

        if (targetUserId != null) {
            User target = userRepository.findById(targetUserId).orElse(null);
            if (target != null) {
                target.setStatus("LOCKED");
                target.setStatusReason("Khóa tài khoản do vi phạm: " + note);
                int tv = target.getTokenVersion() != null ? target.getTokenVersion() : 0;
                target.setTokenVersion(tv + 1);
                userRepository.save(target);
                authInfoCache.evict(targetUserId);
                auditService.log(admin, "LOCK_USER_VIA_REPORT", "USER", targetUserId, note);
            }
        }
    }
}
