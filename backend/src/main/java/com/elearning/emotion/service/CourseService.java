package com.elearning.emotion.service;

import com.elearning.emotion.dto.CourseCreateRequest;
import com.elearning.emotion.dto.CourseUpdateRequest;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.CourseReviewLog;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.CourseReviewLogRepository;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.elearning.emotion.entity.ModerationRun;
import com.elearning.emotion.entity.ModerationIssue;
import com.elearning.emotion.entity.ModerationIssueDecision;
import com.elearning.emotion.moderation.engine.CourseReadinessService;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.ReadinessReportDto;
import com.elearning.emotion.moderation.model.RuleIssue;
import com.elearning.emotion.repository.ModerationRunRepository;
import com.elearning.emotion.repository.ModerationIssueRepository;
import com.elearning.emotion.repository.ModerationIssueDecisionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final ContentItemRepository contentItemRepository;
    private final ToeicFormatAuditorService toeicFormatAuditorService;
    private final CourseReviewLogRepository courseReviewLogRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final CourseReadinessService courseReadinessService;
    private final ModerationRunRepository moderationRunRepository;
    private final ModerationIssueRepository moderationIssueRepository;
    private final ModerationIssueDecisionRepository moderationIssueDecisionRepository;
    private final ModerationContextBuilder moderationContextBuilder;
    private final ModerationAnalysisService moderationAnalysisService;
    private final HtmlSanitizerService htmlSanitizerService;
    private final PolicyService policyService;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    /** FR-TCH-01: tao khoa hoc moi. Mặc định là DRAFT */
    public Course create(String teacherId, CourseCreateRequest req) {
        var teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay giang vien"));

        // H5 Item 4: Kiểm tra trạng thái duyệt tài khoản giảng viên
        if ("PENDING_APPROVAL".equalsIgnoreCase(teacher.getStatus())) {
            throw new IllegalStateException("Tài khoản giảng viên của bạn đang chờ quản trị viên phê duyệt. Trong thời gian này bạn chưa thể tạo khóa học.");
        }
        if (!"ACTIVE".equalsIgnoreCase(teacher.getStatus())) {
            throw new IllegalStateException("Tài khoản giảng viên không ở trạng thái hoạt động.");
        }

        String profile = req.profile() != null && !req.profile().isBlank() ? req.profile().toUpperCase() : "TOPIC";

        Course course = Course.builder()
                .teacher(teacher)
                .title(req.title())
                .description(htmlSanitizerService.sanitize(req.description()))
                .level(req.level())
                .profile(profile)
                .durationHours(req.durationHours())
                .price(req.price())
                .originalPrice(req.originalPrice())
                .coverMedia(resolveMedia(req.coverMediaId()))
                .status("DRAFT")
                .build();
        return courseRepository.save(course);
    }

    /** Cập nhật thông tin khoá học. Bỏ status để ngăn giảng viên tự xuất bản né kiểm duyệt */
    public Course update(String teacherId, String courseId, CourseUpdateRequest req) {
        Course course = getOwnedOrThrow(teacherId, courseId);
        validateCanModifyCourseContent(course);

        if (req.title() != null) course.setTitle(req.title());
        if (req.description() != null) course.setDescription(htmlSanitizerService.sanitize(req.description()));
        if (req.level() != null) course.setLevel(req.level());
        if (req.profile() != null && !req.profile().isBlank()) course.setProfile(req.profile().toUpperCase());
        if (req.durationHours() != null) course.setDurationHours(req.durationHours());
        if (req.price() != null) course.setPrice(req.price());
        if (req.originalPrice() != null) course.setOriginalPrice(req.originalPrice());
        if (req.coverMediaId() != null) course.setCoverMedia(resolveMedia(req.coverMediaId()));
        Course saved = courseRepository.save(course);
        notifyContentChanged(saved);
        return saved;
    }

    /** Giảng viên gửi duyệt khoá học -> Chuyển sang PENDING_REVIEW */
    @Transactional
    public Course submit(String teacherId, String courseId) {
        Course course = getOwnedOrThrowWithLock(teacherId, courseId);
        String currentStatus = course.getStatus();

        if (!"DRAFT".equals(currentStatus) && !"REJECTED".equals(currentStatus)) {
            if ("SUSPENDED".equals(currentStatus)) {
                throw new IllegalStateException("Khóa học đang bị đình chỉ (SUSPENDED), không thể gửi duyệt. Vui lòng liên hệ quản trị viên.");
            }
            if ("PENDING_REVIEW".equals(currentStatus)) {
                throw new IllegalStateException("Khoá học đang trong danh sách chờ duyệt, không thể gửi lại lúc này.");
            }
            if ("PUBLISHED".equals(currentStatus)) {
                throw new IllegalStateException("Khoá học đã được xuất bản công khai.");
            }
            throw new IllegalStateException("Không thể gửi duyệt khóa học ở trạng thái: " + currentStatus + ". Chỉ khóa học Nháp (DRAFT) hoặc Bị từ chối (REJECTED) mới được gửi duyệt.");
        }

        // P0: Kiểm tra điều kiện gửi duyệt theo toàn bộ nhóm luật STR (STR-01..STR-13)
        ReadinessReportDto readiness = courseReadinessService.checkReadiness(courseId, teacherId);
        if (!readiness.isCanSubmit()) {
            StringBuilder sb = new StringBuilder("Khóa học chưa đủ điều kiện gửi duyệt (còn " + readiness.getBlockerCount() + " điều kiện bắt buộc chưa đạt):");
            for (RuleIssue b : readiness.getBlockers()) {
                sb.append("\n• ").append(b.getMessage());
            }
            throw new IllegalArgumentException(sb.toString());
        }

        // Chặn chạy trùng nếu đang có tiến trình ANALYZING còn hiệu lực (dưới 15 phút)
        Optional<ModerationRun> activeRunOpt = moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(course.getId());
        if (activeRunOpt.isPresent()) {
            ModerationRun activeRun = activeRunOpt.get();
            if ("ANALYZING".equals(activeRun.getStatus())
                    && activeRun.getSubmittedAt() != null
                    && activeRun.getSubmittedAt().isAfter(LocalDateTime.now().minusMinutes(15))) {
                throw new IllegalStateException("Khóa học đang trong tiến trình phân tích kiểm duyệt. Vui lòng đợi trong giây lát.");
            }
        }

        ModerationContext modCtx = moderationContextBuilder.buildContext(course);

        // Tạo bản ghi moderation_run (ANALYZING)
        ModerationRun modRun = ModerationRun.builder()
                .course(course)
                .submittedAt(LocalDateTime.now())
                .policyVersion(readiness.getPolicyVersion())
                .contentHash(modCtx.getContentHash())
                .status("ANALYZING")
                .riskScore(0)
                .riskLevel("LOW")
                .build();
        modRun = moderationRunRepository.save(modRun);

        course.setSubmittedAt(LocalDateTime.now());

        // P0-2: Lưu trạng thái trước khi cập nhật để log chính xác
        String oldStatus = course.getStatus();
        course.setStatus("PENDING_REVIEW");
        course.setRejectReason(null);
        Course saved = courseRepository.save(course);

        // Lưu vết lịch sử gửi duyệt
        CourseReviewLog logItem = CourseReviewLog.builder()
                .course(saved)
                .actor(course.getTeacher())
                .action("SUBMIT")
                .fromStatus(oldStatus)
                .toStatus("PENDING_REVIEW")
                .note("Giảng viên gửi yêu cầu kiểm duyệt khóa học")
                .build();
        courseReviewLogRepository.save(logItem);

        // H-b: Chạy phân tích sâu bộ luật kiểm duyệt BẤT ĐỒNG BỘ (@Async) để không block giao dịch gửi duyệt
        moderationAnalysisService.runAnalysisAfterCommit(saved.getId(), modRun.getId());

        // Phát tín hiệu realtime: admin-stats cho Admin và course-status cho Giảng viên
        try {
            if (realtimePublisher != null) {
                realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of("reason", "COURSE_SUBMITTED", "courseId", saved.getId()));
                realtimePublisher.publishToUser(teacherId, "course-status", Map.of("courseId", saved.getId(), "status", "PENDING_REVIEW"));
            }
        } catch (Exception ex) {
            log.warn("[CourseService] Không thể phát sự kiện realtime khi submit: {}", ex.getMessage());
        }

        return saved;
    }

    /** Giảng viên rút lại yêu cầu kiểm duyệt để quay về DRAFT và chỉnh sửa nội dung (P2-4) */
    @Transactional
    public Course cancelSubmit(String teacherId, String courseId) {
        Course course = getOwnedOrThrowWithLock(teacherId, courseId);
        if (!"PENDING_REVIEW".equals(course.getStatus())) {
            throw new IllegalStateException("Chỉ có thể rút lại yêu cầu duyệt khi khóa học đang ở trạng thái chờ duyệt (PENDING_REVIEW). Trạng thái hiện tại: " + course.getStatus());
        }

        String oldStatus = course.getStatus();
        course.setStatus("DRAFT");
        Course saved = courseRepository.save(course);

        CourseReviewLog logItem = CourseReviewLog.builder()
                .course(saved)
                .actor(course.getTeacher())
                .action("CANCEL_SUBMIT")
                .fromStatus(oldStatus)
                .toStatus("DRAFT")
                .note("Giảng viên chủ động rút lại yêu cầu duyệt để chỉnh sửa nội dung")
                .build();
        courseReviewLogRepository.save(logItem);

        auditService.log(course.getTeacher(), "CANCEL_SUBMIT_COURSE", "COURSE", courseId, toJson(Map.of("action", "CANCEL_SUBMIT")));

        try {
            if (realtimePublisher != null) {
                realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of("reason", "COURSE_CANCELLED", "courseId", saved.getId()));
                realtimePublisher.publishToUser(teacherId, "course-status", Map.of("courseId", saved.getId(), "status", "DRAFT"));
            }
        } catch (Exception ex) {
            log.warn("[CourseService] Không thể phát sự kiện realtime khi cancelSubmit: {}", ex.getMessage());
        }

        return saved;
    }

    /** Giảng viên ẩn khoá học đã xuất bản -> Chuyển sang HIDDEN */
    @Transactional
    public Course hide(String teacherId, String courseId) {
        Course course = getOwnedOrThrowWithLock(teacherId, courseId);
        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new IllegalStateException("Chỉ khoá học đang xuất bản (PUBLISHED) mới có thể chuyển sang ẩn. Trạng thái hiện tại: " + course.getStatus());
        }
        course.setStatus("HIDDEN");
        return courseRepository.save(course);
    }

    /** Giảng viên hiện lại khoá học đã ẩn -> Chuyển lại PUBLISHED */
    @Transactional
    public Course show(String teacherId, String courseId) {
        Course course = getOwnedOrThrowWithLock(teacherId, courseId);
        if (!"HIDDEN".equals(course.getStatus())) {
            throw new IllegalStateException("Chỉ khoá học đang ẩn (HIDDEN) mới có thể mở lại. Trạng thái hiện tại: " + course.getStatus());
        }
        course.setStatus("PUBLISHED");
        return courseRepository.save(course);
    }

    /** Quản trị viên (ADMIN) phê duyệt khoá học -> Chuyển sang PUBLISHED (SPEC.md Mục 9) */
    @Transactional
    public Course approve(String adminId, String courseId, String note, String checklistJson) {
        Course course = courseRepository.findByIdWithLock(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khoá học"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        // Ràng buộc 1: Kiểm tra trạng thái PENDING_REVIEW & run READY_FOR_REVIEW
        if (!"PENDING_REVIEW".equals(course.getStatus())) {
            throw new IllegalStateException("Chỉ có thể phê duyệt khóa học đang ở trạng thái chờ duyệt (PENDING_REVIEW). Trạng thái hiện tại: " + course.getStatus());
        }

        ModerationRun run = moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(courseId)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy kết quả kiểm duyệt từ hệ thống cho khóa học này."));

        if (!"READY_FOR_REVIEW".equalsIgnoreCase(run.getStatus())) {
            throw new IllegalStateException("Tiến trình kiểm duyệt tự động chưa hoàn tất. Trạng thái hiện tại: " + run.getStatus());
        }

        List<ModerationIssue> issues = moderationIssueRepository.findByRunId(run.getId());
        List<ModerationIssueDecision> decisions = moderationIssueDecisionRepository.findByCourseId(courseId);
        Map<String, ModerationIssueDecision> decisionMap = new HashMap<>();
        for (ModerationIssueDecision d : decisions) {
            decisionMap.put(d.getIssueKey(), d);
        }

        // Ràng buộc 2: Mọi lỗi ERROR đã có quyết định (requireAllErrorsDecided)
        long undecidedErrors = issues.stream()
                .filter(i -> "ERROR".equalsIgnoreCase(i.getSeverity()))
                .filter(i -> !decisionMap.containsKey(i.getIssueKey()))
                .count();
        if (undecidedErrors > 0) {
            throw new IllegalStateException("Không thể phê duyệt: Còn " + undecidedErrors + " lỗi ERROR bắt buộc kiểm duyệt viên phải quyết định (Chấp nhận / Bỏ qua / Yêu cầu sửa).");
        }

        // Ràng buộc 3: Không còn quyết định NEED_FIX (blockOnNeedFix)
        long needFixCount = issues.stream()
                .filter(i -> decisionMap.containsKey(i.getIssueKey()) && "NEED_FIX".equalsIgnoreCase(decisionMap.get(i.getIssueKey()).getDecision()))
                .count();
        if (needFixCount > 0) {
            throw new IllegalStateException("Không thể phê duyệt: Còn " + needFixCount + " vấn đề đang yêu cầu sửa (NEED_FIX). Hãy yêu cầu giảng viên hoàn thiện hoặc đổi quyết định.");
        }

        // Ràng buộc 4: Checklist đủ 4 mục bắt buộc
        if (checklistJson == null || checklistJson.isBlank()) {
            throw new IllegalStateException("Không thể phê duyệt: Bắt buộc phải hoàn thành checklist thẩm định 4 mục.");
        }
        try {
            JsonNode clNode = objectMapper.readTree(checklistJson);
            boolean allChecked = true;
            if (clNode.isObject()) {
                var fields = clNode.fields();
                int checkedCount = 0;
                while (fields.hasNext()) {
                    var f = fields.next();
                    if (f.getValue().asBoolean(false)) {
                        checkedCount++;
                    } else {
                        allChecked = false;
                    }
                }
                if (checkedCount < 4 || !allChecked) {
                    throw new IllegalStateException("Không thể phê duyệt: Chưa tích chọn đầy đủ 4 mục trong checklist thẩm định bắt buộc.");
                }
            } else {
                throw new IllegalStateException("Checklist thẩm định không đúng định dạng.");
            }
        } catch (Exception ex) {
            if (ex instanceof IllegalStateException) throw (IllegalStateException) ex;
            throw new IllegalStateException("Dữ liệu checklist thẩm định không hợp lệ: " + ex.getMessage());
        }

        // Ràng buộc 5: Rủi ro HIGH bắt buộc ghi chú >= 10 ký tự (highRiskNoteMinChars)
        if ("HIGH".equalsIgnoreCase(run.getRiskLevel())) {
            if (note == null || note.trim().length() < 10 || "Được phê duyệt bởi Quản trị viên".equals(note)) {
                throw new IllegalStateException("Khóa học có mức rủi ro CAO (HIGH). Quản trị viên bắt buộc phải nhập ghi chú thẩm định giải trình (tối thiểu 10 ký tự).");
            }
        }

        String oldStatus = course.getStatus();
        course.setStatus("PUBLISHED");
        course.setReviewedAt(LocalDateTime.now());
        course.setReviewedBy(admin);
        course.setRejectReason(null);
        Course saved = courseRepository.save(course);

        // Lưu review log
        CourseReviewLog reviewLog = CourseReviewLog.builder()
                .course(saved)
                .actor(admin)
                .action("APPROVE")
                .fromStatus(oldStatus)
                .toStatus("PUBLISHED")
                .note(note)
                .checklist(checklistJson)
                .build();
        courseReviewLogRepository.save(reviewLog);

        auditService.log(admin, "APPROVE_COURSE", "COURSE", courseId,
                toJson(Map.of("courseTitle", saved.getTitle() != null ? saved.getTitle() : "")));

        // Gửi thông báo cho giảng viên
        if (saved.getTeacher() != null && saved.getTeacher().getId() != null) {
            String notifContent = "Khóa học \"" + saved.getTitle() + "\" của bạn đã được quản trị viên phê duyệt và xuất bản thành công."
                    + (note != null && !note.isBlank() ? " Ghi chú: " + note : "");
            notificationService.send(
                    saved.getTeacher().getId(),
                    "Khóa học đã được phê duyệt",
                    notifContent,
                    "COURSE_APPROVED",
                    courseId,
                    "/courses/" + courseId
            );

            try {
                if (realtimePublisher != null) {
                    realtimePublisher.publishToUser(saved.getTeacher().getId(), "course-status", Map.of(
                            "courseId", courseId,
                            "status", "PUBLISHED"
                    ));
                }
            } catch (Exception ex) {
                log.warn("[CourseService] Không thể phát sự kiện course-status PUBLISHED: {}", ex.getMessage());
            }
        }

        try {
            if (realtimePublisher != null) {
                realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of(
                        "reason", "COURSE_APPROVED",
                        "courseId", courseId
                ));
            }
        } catch (Exception ex) {
            log.warn("[CourseService] Không thể phát sự kiện admin-stats sau approve: {}", ex.getMessage());
        }

        return saved;
    }

    /** Quản trị viên (ADMIN) từ chối khoá học -> Chuyển sang REJECTED kèm lý do và danh sách NEED_FIX (SPEC.md Mục 9) */
    @Transactional
    public Course reject(String adminId, String courseId, String reasonCode, String note) {
        Course course = courseRepository.findByIdWithLock(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khoá học"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        if (!"PENDING_REVIEW".equals(course.getStatus())) {
            throw new IllegalStateException("Chỉ có thể từ chối khóa học đang ở trạng thái chờ duyệt (PENDING_REVIEW). Trạng thái hiện tại: " + course.getStatus());
        }

        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("Bắt buộc phải nhập lý do khi từ chối khóa học");
        }

        // Tự động tổng hợp các lỗi NEED_FIX để gửi phản hồi chi tiết cho giảng viên
        StringBuilder needFixDetails = new StringBuilder();
        ModerationRun run = moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(courseId).orElse(null);
        if (run != null) {
            List<ModerationIssue> issues = moderationIssueRepository.findByRunId(run.getId());
            List<ModerationIssueDecision> decisions = moderationIssueDecisionRepository.findByCourseId(courseId);
            Map<String, ModerationIssueDecision> decisionMap = new HashMap<>();
            for (ModerationIssueDecision d : decisions) {
                decisionMap.put(d.getIssueKey(), d);
            }

            List<String> needFixList = new ArrayList<>();
            for (ModerationIssue mi : issues) {
                ModerationIssueDecision dec = decisionMap.get(mi.getIssueKey());
                if (dec != null && "NEED_FIX".equalsIgnoreCase(dec.getDecision())) {
                    String msg = mi.getMessage();
                    // Bảo mật: Không lộ khóa học nguồn của DUP-02 cho giảng viên
                    if ("DUP-02".equalsIgnoreCase(mi.getRuleId())) {
                        msg = "Phát hiện câu hỏi hoặc đoạn văn có độ tương đồng cao với nội dung đã có trên hệ thống. Vui lòng kiểm tra và biên soạn lại.";
                    }
                    String itemMsg = String.format("- [%s] %s%s",
                            mi.getRuleId(),
                            msg,
                            (dec.getNote() != null && !dec.getNote().isBlank() ? " (Yêu cầu: " + dec.getNote() + ")" : "")
                    );
                    needFixList.add(itemMsg);
                }
            }

            if (!needFixList.isEmpty()) {
                needFixDetails.append("\n\nCác vấn đề cần chỉnh sửa trước khi gửi duyệt lại:\n");
                for (String item : needFixList) {
                    needFixDetails.append(item).append("\n");
                }
            }
        }

        String fullReason = (reasonCode != null ? "[" + reasonCode + "] " : "") + note + needFixDetails.toString();
        String oldStatus = course.getStatus();
        course.setStatus("REJECTED");
        course.setReviewedAt(LocalDateTime.now());
        course.setReviewedBy(admin);
        course.setRejectReason(fullReason);
        Course saved = courseRepository.save(course);

        // Lưu review log
        CourseReviewLog reviewLog = CourseReviewLog.builder()
                .course(saved)
                .actor(admin)
                .action("REJECT")
                .fromStatus(oldStatus)
                .toStatus("REJECTED")
                .note(fullReason)
                .build();
        courseReviewLogRepository.save(reviewLog);

        auditService.log(admin, "REJECT_COURSE", "COURSE", courseId,
                toJson(Map.of("reason", fullReason)));

        // Gửi thông báo cho giảng viên
        if (saved.getTeacher() != null && saved.getTeacher().getId() != null) {
            notificationService.send(
                    saved.getTeacher().getId(),
                    "Khóa học cần chỉnh sửa và chưa được phê duyệt",
                    "Khóa học \"" + saved.getTitle() + "\" chưa được phê duyệt. Lý do: " + fullReason,
                    "COURSE_REJECTED",
                    courseId,
                    "/teacher/courses/" + courseId + "/edit"
            );

            try {
                if (realtimePublisher != null) {
                    realtimePublisher.publishToUser(saved.getTeacher().getId(), "course-status", Map.of(
                            "courseId", courseId,
                            "status", "REJECTED"
                    ));
                }
            } catch (Exception ex) {
                log.warn("[CourseService] Không thể phát sự kiện course-status REJECTED: {}", ex.getMessage());
            }
        }

        try {
            if (realtimePublisher != null) {
                realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of(
                        "reason", "COURSE_REJECTED",
                        "courseId", courseId
                ));
            }
        } catch (Exception ex) {
            log.warn("[CourseService] Không thể phát sự kiện admin-stats sau reject: {}", ex.getMessage());
        }

        return saved;
    }

    /** Quản trị viên gỡ khóa học vi phạm -> Chuyển sang SUSPENDED */
    @Transactional
    public Course suspend(String adminId, String courseId, String reason) {
        Course course = courseRepository.findByIdWithLock(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khoá học"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        // P0-1: Kiểm tra trạng thái hợp lệ
        if (!"PUBLISHED".equals(course.getStatus()) && !"HIDDEN".equals(course.getStatus())) {
            throw new IllegalStateException("Chỉ có thể đình chỉ khóa học đang xuất bản (PUBLISHED) hoặc đang ẩn (HIDDEN). Trạng thái hiện tại: " + course.getStatus());
        }

        String oldStatus = course.getStatus();
        course.setStatus("SUSPENDED");
        course.setRejectReason(reason);
        Course saved = courseRepository.save(course);

        CourseReviewLog reviewLog = CourseReviewLog.builder()
                .course(saved)
                .actor(admin)
                .action("SUSPEND")
                .fromStatus(oldStatus)
                .toStatus("SUSPENDED")
                .note(reason)
                .build();
        courseReviewLogRepository.save(reviewLog);

        // P0-7: Chuẩn hóa format JSON trong audit log
        auditService.log(admin, "SUSPEND_COURSE", "COURSE", courseId,
                toJson(Map.of("reason", reason != null ? reason : "")));

        // P0-3: Gửi thông báo cho giảng viên
        if (saved.getTeacher() != null && saved.getTeacher().getId() != null) {
            String notifContent = "Khóa học \"" + saved.getTitle() + "\" đã bị tạm ngưng hiển thị bởi quản trị viên."
                    + (reason != null && !reason.isBlank() ? " Lý do: " + reason : "");
            notificationService.send(
                    saved.getTeacher().getId(),
                    "Khóa học đã bị tạm ngưng hiển thị",
                    notifContent,
                    "COURSE_SUSPENDED",
                    courseId,
                    "/teacher/courses"
            );
        }

        return saved;
    }

    /** Quản trị viên khôi phục khóa học bị gỡ -> Chuyển lại PUBLISHED */
    @Transactional
    public Course restore(String adminId, String courseId) {
        Course course = courseRepository.findByIdWithLock(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khoá học"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        // P0-1: Kiểm tra trạng thái hợp lệ
        if (!"SUSPENDED".equals(course.getStatus())) {
            throw new IllegalStateException("Chỉ có thể khôi phục khóa học đang bị đình chỉ (SUSPENDED). Trạng thái hiện tại: " + course.getStatus());
        }

        String oldStatus = course.getStatus();
        course.setStatus("PUBLISHED");
        course.setRejectReason(null);
        Course saved = courseRepository.save(course);

        CourseReviewLog reviewLog = CourseReviewLog.builder()
                .course(saved)
                .actor(admin)
                .action("RESTORE")
                .fromStatus(oldStatus)
                .toStatus("PUBLISHED")
                .note("Quản trị viên khôi phục hiển thị khóa học")
                .build();
        courseReviewLogRepository.save(reviewLog);

        // P0-7: Chuẩn hóa format JSON trong audit log
        auditService.log(admin, "RESTORE_COURSE", "COURSE", courseId,
                toJson(Map.of("action", "RESTORE")));

        // P0-3: Gửi thông báo cho giảng viên
        if (saved.getTeacher() != null && saved.getTeacher().getId() != null) {
            String notifContent = "Khóa học \"" + saved.getTitle() + "\" đã được quản trị viên khôi phục hiển thị.";
            notificationService.send(
                    saved.getTeacher().getId(),
                    "Khóa học đã được khôi phục",
                    notifContent,
                    "COURSE_RESTORED",
                    courseId,
                    "/courses/" + courseId
            );
        }

        return saved;
    }

    /** Kiểm tra xem khóa học có đang ở trạng thái cho phép sửa nội dung hay không (P2-4) */
    public void validateCanModifyCourseContent(Course course) {
        if ("PENDING_REVIEW".equals(course.getStatus())) {
            throw new IllegalStateException("Khóa học đang trong quá trình chờ kiểm duyệt. Để sửa nội dung, vui lòng rút lại yêu cầu duyệt về bản nháp (DRAFT).");
        }
        if ("SUSPENDED".equals(course.getStatus())) {
            throw new IllegalStateException("Khóa học đang bị đình chỉ (SUSPENDED), không thể chỉnh sửa nội dung. Vui lòng liên hệ quản trị viên.");
        }
    }

    /**
     * H-b: Cập nhật thời điểm thay đổi nội dung khi khóa học đang PUBLISHED và tự động phân tích lại có debounce (SPEC 14.6)
     */
    public void notifyContentChanged(Course course) {
        if ("EXAM".equalsIgnoreCase(course.getProfile()) || "BANK".equalsIgnoreCase(course.getProfile())) {
            return;
        }
        if ("PUBLISHED".equals(course.getStatus())) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime lastChanged = course.getContentChangedAt();
            course.setContentChangedAt(now);
            courseRepository.save(course);

            // Debounce: nếu vừa phân tích trong vòng 3 phút qua thì không khởi tạo run mới
            if (lastChanged != null && lastChanged.plusMinutes(3).isAfter(now)) {
                log.info("Nội dung khóa học {} thay đổi nhưng đang trong khoảng thời gian debounce (3 phút). Bỏ qua re-run.", course.getId());
                return;
            }

            try {
                // Chặn chạy trùng nếu đang có tiến trình ANALYZING còn hiệu lực (dưới 15 phút)
                Optional<ModerationRun> activeRunOpt = moderationRunRepository.findFirstByCourseIdOrderBySubmittedAtDesc(course.getId());
                if (activeRunOpt.isPresent()) {
                    ModerationRun activeRun = activeRunOpt.get();
                    if ("ANALYZING".equals(activeRun.getStatus())
                            && activeRun.getSubmittedAt() != null
                            && activeRun.getSubmittedAt().isAfter(LocalDateTime.now().minusMinutes(15))) {
                        log.info("Nội dung thay đổi nhưng khóa học {} đang trong tiến trình phân tích kiểm duyệt (ANALYZING). Bỏ qua re-run.", course.getId());
                        return;
                    }
                }

                ModerationContext modCtx = moderationContextBuilder.buildContext(course);
                ModerationRun modRun = ModerationRun.builder()
                        .course(course)
                        .submittedAt(now)
                        .policyVersion(policyService != null ? policyService.getActivePolicyVersion() : 1)
                        .contentHash(modCtx.getContentHash())
                        .status("ANALYZING")
                        .riskScore(0)
                        .riskLevel("LOW")
                        .build();
                modRun = moderationRunRepository.save(modRun);
                moderationAnalysisService.runAnalysisAfterCommit(course.getId(), modRun.getId());
            } catch (Exception e) {
                log.warn("Không thể tự động re-run kiểm duyệt sau khi thay đổi nội dung khóa học: {}", e.getMessage());
            }
        }
    }

    public boolean isAdmin(String userId) {
        if (userId == null || userRepository == null) return false;
        return userRepository.findById(userId)
                .map(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                .orElse(false);
    }

    /** Kiem tra khoa hoc thuoc dung giang vien dang dang nhap (hoac ADMIN) - dung lai o ContentGroup/ContentItem service khac */
    public Course getOwnedOrThrow(String teacherId, String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
        if (!course.getTeacher().getId().equals(teacherId)) {
            if (!isAdmin(teacherId)) {
                throw new SecurityException("Bạn không có quyền chỉnh sửa khóa học này");
            }
        }
        return course;
    }

    public Course getOwnedOrThrowWithLock(String teacherId, String courseId) {
        Course course = courseRepository.findByIdWithLock(courseId)
                .or(() -> courseRepository.findByIdForUpdate(courseId))
                .or(() -> courseRepository.findById(courseId))
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
        if (!course.getTeacher().getId().equals(teacherId)) {
            if (!isAdmin(teacherId)) {
                throw new SecurityException("Bạn không có quyền chỉnh sửa khóa học này");
            }
        }
        return course;
    }

    private MediaAsset resolveMedia(String mediaId) {
        if (mediaId == null) return null;
        return mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay media: " + mediaId));
    }

    private String toJson(Map<String, ?> data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            log.error("Error serializing to JSON for audit log", e);
            return "{}";
        }
    }
}
