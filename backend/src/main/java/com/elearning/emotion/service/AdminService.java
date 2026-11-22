package com.elearning.emotion.service;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.engine.ModerationContextBuilder;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.security.AuthInfoCache;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseReviewLogRepository courseReviewLogRepository;
    private final ReviewReportRepository reviewReportRepository;
    private final AuditLogRepository auditLogRepository;
    private final OrderRepository orderRepository;
    private final AuditService auditService;
    private final CourseService courseService;
    private final ToeicFormatAuditorService toeicFormatAuditorService;
    private final ObjectMapper objectMapper;

    private final ContentItemRepository contentItemRepository;
    private final ContentGroupRepository contentGroupRepository;
    private final CourseCustomSectionRepository courseCustomSectionRepository;
    private final QuestionRepository questionRepository;
    private final PassageRepository passageRepository;
    private final QuestionService questionService;
    private final NotificationService notificationService;
    private final AuthInfoCache authInfoCache;
    private final ModerationAnalysisService moderationAnalysisService;
    private final ModerationRunRepository moderationRunRepository;
    private final ModerationContextBuilder moderationContextBuilder;
    private final PasswordEncoder passwordEncoder;

    private static final Map<String, String> FIXED_SECTION_NAMES = Map.of(
            "VOCAB", "Từ vựng",
            "GRAMMAR", "Ngữ pháp",
            "PART1", "Part 1 - Mô tả tranh (Photographs)",
            "PART2", "Part 2 - Hỏi đáp (Question & Response)",
            "PART3", "Part 3 - Đoạn hội thoại (Conversations)",
            "PART4", "Part 4 - Bài nói ngắn (Short Talks)",
            "PART5", "Part 5 - Hoàn thành câu (Incomplete Sentences)",
            "PART6", "Part 6 - Hoàn thành đoạn văn (Text Completion)",
            "PART7", "Part 7 - Đọc hiểu (Reading Comprehension)",
            "DICTATION", "Luyện nghe chép chính tả"
    );

    private static final List<String> FIXED_SECTION_ORDER = List.of(
            "VOCAB", "GRAMMAR", "PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7", "DICTATION"
    );

    // =========================================================================
    // 1. QUẢN LÝ NGƯỜI DÙNG (USERS)
    // =========================================================================

    public Page<AdminUserDto> getUsers(String role, String status, String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<User> spec = Specification.where(null);
        if (role != null && !role.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("role"), role.toUpperCase()));
        }
        if (status != null && !status.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.toUpperCase()));
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("fullName")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern)
            ));
        }

        Page<User> userPage = userRepository.findAll(spec, pageable);
        List<User> users = userPage.getContent();
        if (users.isEmpty()) {
            return userPage.map(u -> AdminUserDto.from(u, 0L, 0L));
        }

        List<String> studentIds = users.stream()
                .filter(u -> "STUDENT".equals(u.getRole()))
                .map(User::getId)
                .toList();

        List<String> teacherIds = users.stream()
                .filter(u -> "TEACHER".equals(u.getRole()))
                .map(User::getId)
                .toList();

        Map<String, Long> enrollmentCounts = new HashMap<>();
        if (!studentIds.isEmpty()) {
            List<Object[]> res = enrollmentRepository.countEnrollmentsByUserIds(studentIds);
            for (Object[] r : res) {
                enrollmentCounts.put((String) r[0], ((Number) r[1]).longValue());
            }
        }

        Map<String, Long> createdCounts = new HashMap<>();
        if (!teacherIds.isEmpty()) {
            List<Object[]> res = courseRepository.countCoursesByTeacherIds(teacherIds);
            for (Object[] r : res) {
                createdCounts.put((String) r[0], ((Number) r[1]).longValue());
            }
        }

        return userPage.map(user -> {
            long enrolledCount = enrollmentCounts.getOrDefault(user.getId(), 0L);
            long createdCount = createdCounts.getOrDefault(user.getId(), 0L);
            return AdminUserDto.from(user, enrolledCount, createdCount);
        });
    }

    @Transactional
    public AdminUserDto updateUserStatus(String adminId, String targetUserId, String newStatus, String reason) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        if (admin.getId().equals(user.getId())) {
            throw new IllegalArgumentException("Bạn không thể tự thay đổi trạng thái của chính mình");
        }

        user.setStatus(newStatus.toUpperCase());
        user.setStatusReason(reason);
        if ("LOCKED".equalsIgnoreCase(newStatus)) {
            // Tăng tokenVersion để hủy toàn bộ phiên JWT đang mở của user này
            int currentTv = user.getTokenVersion() != null ? user.getTokenVersion() : 0;
            user.setTokenVersion(currentTv + 1);
        }
        User saved = userRepository.save(user);

        // B4: Xóa bộ nhớ đệm xác thực để thay đổi trạng thái/tokenVersion có hiệu lực tức thì
        authInfoCache.evict(targetUserId);

        // P0-7: Chuẩn hóa format JSON
        auditService.log(admin, "CHANGE_USER_STATUS", "USER", targetUserId,
                toJson(Map.of("newStatus", newStatus, "reason", reason != null ? reason : "")));

        long enrolledCount = "STUDENT".equals(saved.getRole()) ? (long) enrollmentRepository.findByUserId(saved.getId()).size() : 0L;
        long createdCount = "TEACHER".equals(saved.getRole()) ? (long) courseRepository.findByTeacherId(saved.getId()).size() : 0L;
        return AdminUserDto.from(saved, enrolledCount, createdCount);
    }

    /**
     * Quản trị viên tạo tài khoản Kiểm duyệt viên (MODERATOR).
     * Vai trò này không có trong luồng đăng ký công khai nên chỉ ADMIN mới cấp được.
     */
    @Transactional
    public AdminUserDto createModerator(String adminId, CreateModeratorRequest req) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        String cleanEmail = req.email().trim().toLowerCase();
        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }

        User moderator = User.builder()
                .fullName(req.fullName().trim())
                .email(cleanEmail)
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(Role.MODERATOR.name())
                .status("ACTIVE")
                .emailVerified(true)
                .mustChangePassword(true)
                .build();
        User saved = userRepository.save(moderator);

        auditService.log(admin, "CREATE_MODERATOR", "USER", saved.getId(),
                toJson(Map.of("email", saved.getEmail(), "fullName", saved.getFullName())));

        return AdminUserDto.from(saved, 0L, 0L);
    }

    /**
     * H5 Item 4: Lấy danh sách giảng viên đang chờ duyệt (PENDING_APPROVAL)
     */
    public List<AdminUserDto> getPendingTeachers() {
        return userRepository.findByRoleOrderByCreatedAtAsc("TEACHER").stream()
                .filter(u -> "PENDING_APPROVAL".equalsIgnoreCase(u.getStatus()))
                .map(u -> AdminUserDto.from(u, 0L, 0L))
                .toList();
    }

    /**
     * H5 Item 4: Quản trị viên duyệt hồ sơ giảng viên
     */
    @Transactional
    public AdminUserDto approveTeacher(String adminId, String teacherId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giảng viên"));

        teacher.setStatus("ACTIVE");
        teacher.setStatusReason("Hồ sơ giảng viên đã được phê duyệt");
        User saved = userRepository.save(teacher);
        authInfoCache.evict(teacherId);

        auditService.log(admin, "APPROVE_TEACHER", "USER", teacherId,
                toJson(Map.of("action", "APPROVE", "teacherName", teacher.getFullName() != null ? teacher.getFullName() : "", "email", teacher.getEmail() != null ? teacher.getEmail() : "")));
        notificationService.send(teacherId, "Tài khoản giảng viên đã được phê duyệt",
                "Chúc mừng! Hồ sơ giảng viên của bạn đã được quản trị viên phê duyệt. Bây giờ bạn đã có thể tạo và xuất bản khóa học.",
                "SYSTEM", teacherId, "/teacher/courses");

        return AdminUserDto.from(saved, 0L, 0L);
    }

    /**
     * H5 Item 4: Quản trị viên từ chối hồ sơ giảng viên (chuyển về tài khoản học viên thông thường)
     */
    @Transactional
    public AdminUserDto rejectTeacher(String adminId, String teacherId, String reason) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giảng viên"));

        teacher.setRole("STUDENT");
        teacher.setStatus("ACTIVE");
        teacher.setStatusReason("Hồ sơ giảng viên bị từ chối: " + (reason != null ? reason : ""));
        int tv = teacher.getTokenVersion() != null ? teacher.getTokenVersion() : 0;
        teacher.setTokenVersion(tv + 1); // Cập nhật tokenVersion để làm mới quyền JWT
        User saved = userRepository.save(teacher);
        authInfoCache.evict(teacherId);

        auditService.log(admin, "REJECT_TEACHER", "USER", teacherId,
                toJson(Map.of("action", "REJECT", "reason", reason != null ? reason : "", "teacherName", teacher.getFullName() != null ? teacher.getFullName() : "")));
        notificationService.send(teacherId, "Kết quả xét duyệt hồ sơ giảng viên",
                "Hồ sơ đăng ký giảng viên của bạn chưa được duyệt: " + (reason != null ? reason : "Chưa đạt tiêu chí nền tảng")
                        + ". Tài khoản của bạn được chuyển thành tài khoản học viên.",
                "SYSTEM", teacherId, "/profile");

        return AdminUserDto.from(saved, 0L, 0L);
    }

    // =========================================================================
    // 2. QUẢN LÝ & KIỂM DUYỆT KHÓA HỌC (COURSES & MODERATION)
    // =========================================================================

    public Page<AdminCourseDto> getCourses(String status, String teacherId, String q, String sortStr, int page, int size) {
        Sort sort;
        if (sortStr != null && !sortStr.isBlank()) {
            String[] parts = sortStr.split(",");
            String field = parts[0].trim();
            Sort.Direction dir = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                    ? Sort.Direction.ASC : Sort.Direction.DESC;
            sort = Sort.by(dir, field);
        } else if ("PENDING_REVIEW".equalsIgnoreCase(status)) {
            // P1-4: Hàng đợi duyệt ưu tiên FIFO theo thời gian gửi duyệt (gửi sớm nhất xếp trước)
            sort = Sort.by(Sort.Direction.ASC, "submittedAt");
        } else {
            sort = Sort.by(Sort.Direction.DESC, "createdAt");
        }

        Pageable pageable = PageRequest.of(page, Math.min(size, 100), sort);

        Specification<Course> spec = Specification.where(null);
        if (status != null && !status.isBlank()) {
            if ("FLAGGED".equalsIgnoreCase(status)) {
                spec = spec.and((root, query, cb) -> cb.or(
                        cb.equal(root.get("status"), "SUSPENDED"),
                        cb.and(
                                cb.equal(root.get("status"), "PUBLISHED"),
                                cb.isNotNull(root.get("contentChangedAt")),
                                cb.isNotNull(root.get("reviewedAt")),
                                cb.greaterThan(root.get("contentChangedAt"), root.get("reviewedAt"))
                        )
                ));
            } else {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.toUpperCase()));
            }
        }
        if (teacherId != null && !teacherId.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("teacher").get("id"), teacherId));
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), pattern),
                    cb.like(cb.lower(root.get("description")), pattern)
            ));
        }

        return courseRepository.findAll(spec, pageable).map(AdminCourseDto::from);
    }

    public Map<String, Object> getCourseReviewDetails(String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        List<CourseReviewLogDto> reviewLogs = courseReviewLogRepository.findByCourseIdOrderByCreatedAtDesc(courseId)
                .stream()
                .map(CourseReviewLogDto::from)
                .toList();

        Map<String, Object> result = new HashMap<>();
        result.put("course", AdminCourseDto.from(course));
        result.put("reviewLogs", reviewLogs);
        result.put("aiReport", course.getAiModerationReport());
        return result;
    }

    /**
     * P1-1: Endpoint preview cấu trúc toàn bộ khóa học (Sections -> Groups -> Items metadata)
     */
    public AdminCoursePreviewDto getCoursePreview(String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        List<ContentItem> allItems = contentItemRepository.findByCourseId(courseId);
        List<ContentGroup> allGroups = contentGroupRepository.findByCourseIdOrderBySectionCodeAscOrderIndexAsc(courseId);
        List<CourseCustomSection> customSections = courseCustomSectionRepository.findByCourseIdOrderByOrderIndex(courseId);

        // Gom số câu hỏi theo từng contentItem
        List<String> itemIds = allItems.stream().map(ContentItem::getId).toList();
        Map<String, Long> questionCounts = new HashMap<>();
        if (!itemIds.isEmpty()) {
            List<Object[]> counts = questionRepository.countActiveQuestionsByItemIds(itemIds);
            for (Object[] row : counts) {
                if (row[0] != null && row[1] != null) {
                    questionCounts.put((String) row[0], ((Number) row[1]).longValue());
                }
            }
        }

        // Nhóm contentItems theo groupId
        Map<String, List<ContentItem>> itemsByGroup = allItems.stream()
                .filter(i -> i.getGroup() != null)
                .collect(Collectors.groupingBy(i -> i.getGroup().getId()));

        // Nhóm contentItems mồ côi (ungrouped) theo sectionCode
        Map<String, List<ContentItem>> ungroupedBySection = allItems.stream()
                .filter(i -> i.getGroup() == null)
                .collect(Collectors.groupingBy(ContentItem::getSectionCode));

        // Nhóm contentGroups theo sectionCode
        Map<String, List<ContentGroup>> groupsBySection = allGroups.stream()
                .collect(Collectors.groupingBy(ContentGroup::getSectionCode));

        // Danh sách section cần hiển thị:
        // Các section cố định có nội dung + Các custom section
        Set<String> activeSectionCodes = new LinkedHashSet<>();
        for (String fixedCode : FIXED_SECTION_ORDER) {
            boolean hasGroups = groupsBySection.containsKey(fixedCode) && !groupsBySection.get(fixedCode).isEmpty();
            boolean hasItems = ungroupedBySection.containsKey(fixedCode) && !ungroupedBySection.get(fixedCode).isEmpty();
            if (hasGroups || hasItems) {
                activeSectionCodes.add(fixedCode);
            }
        }
        for (CourseCustomSection cs : customSections) {
            activeSectionCodes.add("CUSTOM_" + cs.getId());
        }

        List<AdminCoursePreviewDto.SectionPreviewDto> sectionDtos = new ArrayList<>();
        int totalQuestionsCount = 0;

        for (String secCode : activeSectionCodes) {
            String title = FIXED_SECTION_NAMES.getOrDefault(secCode, secCode);
            if (secCode.startsWith("CUSTOM_")) {
                String csId = secCode.substring("CUSTOM_".length());
                title = customSections.stream()
                        .filter(cs -> cs.getId().equals(csId))
                        .map(CourseCustomSection::getTitle)
                        .findFirst()
                        .orElse(secCode);
            }

            // Nhóm
            List<ContentGroup> groups = groupsBySection.getOrDefault(secCode, List.of());
            List<AdminCoursePreviewDto.GroupPreviewDto> groupDtos = new ArrayList<>();
            for (ContentGroup g : groups) {
                List<ContentItem> gItems = itemsByGroup.getOrDefault(g.getId(), List.of());
                List<AdminCoursePreviewDto.ItemSummaryDto> itemSummaries = gItems.stream()
                        .sorted(Comparator.comparing(ContentItem::getOrderIndex, Comparator.nullsLast(Integer::compareTo)))
                        .map(i -> {
                            long qCount = questionCounts.getOrDefault(i.getId(), 0L);
                            return new AdminCoursePreviewDto.ItemSummaryDto(
                                    i.getId(),
                                    i.getTitle(),
                                    i.getType(),
                                    i.getOrderIndex(),
                                    i.getVideoMedia() != null,
                                    i.getBodyHtml() != null && !i.getBodyHtml().isBlank(),
                                    qCount
                            );
                        })
                        .toList();
                groupDtos.add(new AdminCoursePreviewDto.GroupPreviewDto(g.getId(), g.getTitle(), g.getOrderIndex(), itemSummaries));
            }

            // Ungrouped
            List<ContentItem> ungrouped = ungroupedBySection.getOrDefault(secCode, List.of());
            List<AdminCoursePreviewDto.ItemSummaryDto> ungroupedSummaries = ungrouped.stream()
                    .sorted(Comparator.comparing(ContentItem::getOrderIndex, Comparator.nullsLast(Integer::compareTo)))
                    .map(i -> {
                        long qCount = questionCounts.getOrDefault(i.getId(), 0L);
                        return new AdminCoursePreviewDto.ItemSummaryDto(
                                i.getId(),
                                i.getTitle(),
                                i.getType(),
                                i.getOrderIndex(),
                                i.getVideoMedia() != null,
                                i.getBodyHtml() != null && !i.getBodyHtml().isBlank(),
                                qCount
                        );
                    })
                    .toList();

            sectionDtos.add(new AdminCoursePreviewDto.SectionPreviewDto(secCode, title, groupDtos, ungroupedSummaries));
        }

        for (long count : questionCounts.values()) {
            totalQuestionsCount += (int) count;
        }

        return new AdminCoursePreviewDto(
                AdminCourseDto.from(course),
                sectionDtos,
                sectionDtos.size(),
                allItems.size(),
                totalQuestionsCount
        );
    }

    /**
     * P1-1: Endpoint xem chi tiết một bài học (nội dung text, video, audio, passages & toàn bộ câu hỏi kèm đáp án đúng)
     */
    public AdminContentItemPreviewDto getContentItemPreview(String contentItemId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài học / hoạt động"));

        List<Passage> passages = passageRepository.findByContentItemIdWithMedia(contentItemId);
        List<PassageDto> passageDtos = passages.stream().map(PassageDto::from).toList();

        List<Question> questions = questionRepository.findByContentItemIdWithMedia(contentItemId);
        List<QuestionDto> questionDtos = questionService.toTeacherDtos(questions);

        String videoUrl = item.getVideoMedia() != null ? item.getVideoMedia().getUrl() : null;
        String groupTitle = item.getGroup() != null ? item.getGroup().getTitle() : null;
        String groupId = item.getGroup() != null ? item.getGroup().getId() : null;

        return new AdminContentItemPreviewDto(
                item.getId(),
                item.getCourse().getId(),
                item.getSectionCode(),
                groupId,
                groupTitle,
                item.getType(),
                item.getTitle(),
                item.getOrderIndex(),
                item.getTimeLimitMinutes(),
                videoUrl,
                item.getBodyHtml(),
                passageDtos,
                questionDtos
        );
    }

    /**
     * Chạy lại phân tích chuẩn đề thi TOEIC bằng AI theo yêu cầu của Quản trị viên
     */
    @Transactional
    public String reAuditCourseWithAi(String adminId, String courseId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        var modCtx = moderationContextBuilder.buildContext(course);
        var newRun = com.elearning.emotion.entity.ModerationRun.builder()
                .course(course)
                .submittedAt(java.time.LocalDateTime.now())
                .policyVersion(modCtx.getPolicyVersion())
                .contentHash(modCtx.getContentHash())
                .status("SUBMITTED")
                .riskScore(0)
                .riskLevel("LOW")
                .build();
        newRun = moderationRunRepository.save(newRun);
        moderationAnalysisService.runAnalysis(course, newRun);

        String freshReport = course.getAiModerationReport();
        auditService.log(admin, "AI_REAUDIT_COURSE", "COURSE", courseId, "{}");
        return freshReport != null ? freshReport : "{}";
    }

    // =========================================================================
    // 3. TỔNG QUAN HỆ THỐNG & DASHBOARD STATS
    // =========================================================================

    public Map<String, Object> getOverviewStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalStudents", userRepository.countByRole("STUDENT"));
        stats.put("totalTeachers", userRepository.countByRole("TEACHER"));
        stats.put("totalCourses", courseRepository.count());
        stats.put("pendingCourses", courseRepository.countByStatus("PENDING_REVIEW"));
        stats.put("pendingTeachers", userRepository.countByRoleAndStatus("TEACHER", "PENDING_APPROVAL"));
        stats.put("publishedCourses", courseRepository.countByStatus("PUBLISHED"));
        stats.put("rejectedCourses", courseRepository.countByStatus("REJECTED"));
        stats.put("totalEnrollments", enrollmentRepository.count());
        stats.put("totalOrders", orderRepository.count());

        // P3-1: Bổ sung chỉ số việc cần xử lý
        long pendingReports = reviewReportRepository.countByStatus("PENDING");
        stats.put("pendingReviewReports", pendingReports);

        long modifiedCoursesCount = courseRepository.countModifiedCoursesAfterPublish();
        stats.put("modifiedCourses", modifiedCoursesCount);

        // Top 5 khóa chờ duyệt xếp theo thời gian chờ (gửi lâu nhất xếp trước)
        Pageable top5 = PageRequest.of(0, 5);
        List<Course> urgentCourses = courseRepository.findTopPendingCoursesOrderBySubmittedAtAsc(top5);
        List<Map<String, Object>> urgentCoursesDto = urgentCourses.stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("title", c.getTitle());
            m.put("teacherName", c.getTeacher() != null ? c.getTeacher().getFullName() : "Chưa rõ");
            m.put("submittedAt", c.getSubmittedAt());
            m.put("coverUrl", c.getCoverMedia() != null ? c.getCoverMedia().getUrl() : null);
            m.put("aiModerationReport", c.getAiModerationReport());
            return m;
        }).toList();
        stats.put("urgentPendingCourses", urgentCoursesDto);

        // Top 5 khóa học bị sửa sau khi xuất bản
        List<Course> recentModified = courseRepository.findTopModifiedCourses(top5);
        List<Map<String, Object>> recentModifiedDto = recentModified.stream().map(c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("title", c.getTitle());
            m.put("teacherName", c.getTeacher() != null ? c.getTeacher().getFullName() : "Chưa rõ");
            m.put("reviewedAt", c.getReviewedAt());
            m.put("contentChangedAt", c.getContentChangedAt());
            m.put("coverUrl", c.getCoverMedia() != null ? c.getCoverMedia().getUrl() : null);
            return m;
        }).toList();
        stats.put("recentModifiedCourses", recentModifiedDto);

        // Top 5 báo cáo đánh giá vi phạm chưa xử lý (xếp theo gửi sớm nhất)
        List<ReviewReport> urgentReports = reviewReportRepository.findByStatusOrderByCreatedAtAsc("PENDING", top5);
        List<Map<String, Object>> urgentReportsDto = urgentReports.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("reason", r.getReason());
            m.put("details", r.getDetails());
            m.put("createdAt", r.getCreatedAt());
            m.put("reporterName", r.getReporter() != null ? r.getReporter().getFullName() : "Ẩn danh");
            m.put("reviewId", r.getReview() != null ? r.getReview().getId() : null);
            m.put("reviewComment", r.getReview() != null ? r.getReview().getComment() : null);
            m.put("courseTitle", (r.getReview() != null && r.getReview().getCourse() != null)
                    ? r.getReview().getCourse().getTitle() : "Khóa học");
            return m;
        }).toList();
        stats.put("urgentReviewReports", urgentReportsDto);

        return stats;
    }

    // =========================================================================
    // 4. NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)
    // =========================================================================

    public Page<AuditLogDto> getAuditLogs(String action, String targetType, String q, int page, int size) {
        return getAuditLogs(null, action, targetType, q, page, size);
    }

    /**
     * @param actorId nếu khác null: chỉ trả về nhật ký do chính người này thực hiện
     *                (dùng cho Kiểm duyệt viên chỉ xem được hoạt động của bản thân).
     */
    public Page<AuditLogDto> getAuditLogs(String actorId, String action, String targetType, String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<AuditLog> spec = Specification.where(null);
        if (actorId != null && !actorId.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("actor").get("id"), actorId));
        }
        if (action != null && !action.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("action"), action.trim().toUpperCase()));
        }
        if (targetType != null && !targetType.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("targetType"), targetType.trim().toUpperCase()));
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> {
                Join<AuditLog, User> actorJoin = root.join("actor", JoinType.LEFT);
                return cb.or(
                        cb.like(cb.lower(actorJoin.get("fullName")), pattern),
                        cb.like(cb.lower(actorJoin.get("email")), pattern),
                        cb.like(cb.lower(root.get("targetId")), pattern),
                        cb.like(cb.lower(root.get("detail")), pattern)
                );
            });
        }

        return auditLogRepository.findAll(spec, pageable).map(AuditLogDto::from);
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
