package com.elearning.emotion.controller;

import com.elearning.emotion.dto.QuestionCheckRequest;
import com.elearning.emotion.dto.QuestionCheckResultDto;
import com.elearning.emotion.dto.QuestionCreateRequest;
import com.elearning.emotion.dto.QuestionDto;
import com.elearning.emotion.dto.QuestionUpdateRequest;
import com.elearning.emotion.entity.ContentGroup;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.repository.ContentGroupRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.QuestionRepository;
import com.elearning.emotion.service.CourseAccessService;
import com.elearning.emotion.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** FR-TCH-06: cau hoi Part 1-7 / ngu phap / chinh ta. FR-LES-05/06: hoc vien lam bai */
@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private static final Pattern PART_SECTION = Pattern.compile("^PART(\\d+)$");

    private final QuestionRepository questionRepository;
    private final QuestionService questionService;
    private final ContentItemRepository contentItemRepository;
    private final ContentGroupRepository contentGroupRepository;
    private final CourseAccessService courseAccessService;

    // Hoc vien lam bai -> AN dap an dung, CHI lay cau hoi ACTIVE (Phai kiem tra quyen HOC khoa hoc)
    @GetMapping
    public List<QuestionDto> listForStudent(
            @RequestParam String contentItemId,
            @AuthenticationPrincipal String userId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài học / hoạt động"));
        courseAccessService.validateCanLearn(userId, item.getCourse());

        var questions = questionRepository.findByContentItemIdWithMedia(contentItemId).stream()
                .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                .toList();
        return questionService.toStudentDtos(questions);
    }

    // Giang vien xem lai -> co dap an dung, dung o trang Preview (FR-TCH-07)
    // Chi chu khoa hoc hoac Admin moi duoc xem dap an cua giang vien
    @GetMapping("/teacher-view")
    public List<QuestionDto> listForTeacher(
            @RequestParam String contentItemId,
            @AuthenticationPrincipal String userId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài học / hoạt động"));
        if (!courseAccessService.canManageOrModerate(userId, item.getCourse())) {
            throw new SecurityException("Bạn không có quyền xem cấu hình đáp án của giảng viên cho nội dung này");
        }
        var questions = questionRepository.findByContentItemIdWithMedia(contentItemId);
        return questionService.toTeacherDtos(questions);
    }

    // Danh sach tag CHO CHON khi tao cau hoi doc lap moi. Lay tu CAC NHOM HOAT DONG (ContentGroup)
    // CO SAN trong cung khoa hoc. Mac dinh (scope=current, hoac khong truyen) CHI tra ve cac
    // nhom trong CUNG section (vd dang o Part 1 -> chi 4 nhom cua Part 1) - phu hop khi soan noi
    // dung cho 1 Part cu the. scope=all tra ve TAT CA nhom cua MOI section trong khoa hoc (nhom
    // theo tung Part nhu tag picker cua Study4) - dung khi soan cau hoi cho de thi tong hop, can
    // chon tag thuoc Part/nhom khac voi Part dang dung.
    @GetMapping("/tags")
    @PreAuthorize("hasRole('TEACHER')")
    public List<String> listTags(@RequestParam String contentItemId,
                                 @RequestParam(defaultValue = "current") String scope) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay content item"));

        List<ContentGroup> groups = "all".equals(scope)
                ? contentGroupRepository.findByCourseIdOrderBySectionCodeAscOrderIndexAsc(item.getCourse().getId())
                : contentGroupRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(item.getCourse().getId(), item.getSectionCode());

        return groups.stream().map(g -> formatTag(g.getSectionCode(), g.getTitle())).toList();
    }

    /** "PART1" + "Tranh ta nguoi" -> "[Part 1] Tranh ta nguoi". Cac section khac (VOCAB, GRAMMAR,
     *  DICTATION, CUSTOM_*) giu nguyen ten nhom, khong co tien to "[Part N]". */
    private static String formatTag(String sectionCode, String groupTitle) {
        Matcher m = PART_SECTION.matcher(sectionCode);
        return m.matches() ? "[Part " + m.group(1) + "] " + groupTitle : groupTitle;
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public QuestionDto create(@AuthenticationPrincipal String teacherId,
                              @Valid @RequestBody QuestionCreateRequest req) {
        return questionService.toTeacherDto(questionService.create(teacherId, req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public QuestionDto update(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                              @Valid @RequestBody QuestionUpdateRequest req) {
        return questionService.toTeacherDto(questionService.update(teacherId, id, req));
    }

    @RequestMapping(value = "/bulk-status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasRole('TEACHER')")
    public void bulkUpdateStatus(
            @AuthenticationPrincipal String teacherId,
            @RequestParam String contentItemId,
            @RequestParam(defaultValue = "DISABLED") String status) {
        questionService.updateAllStatusByContentItem(teacherId, contentItemId, status);
    }

    @RequestMapping(value = "/{id}/status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasRole('TEACHER')")
    public QuestionDto updateStatus(
            @AuthenticationPrincipal String teacherId,
            @PathVariable String id,
            @RequestParam(required = false) String status) {
        Question q = questionService.getOwnedOrThrow(teacherId, id);
        String nextStatus = status != null ? status : ("ACTIVE".equalsIgnoreCase(q.getStatus()) ? "DISABLED" : "ACTIVE");
        return questionService.toTeacherDto(questionService.updateStatus(teacherId, id, nextStatus));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        questionService.delete(teacherId, id);
    }

    // Hoc vien bam "Kiem tra dap an" cho 1 cau ngay khi lam bai (Part 1-7/Ngu phap/Chinh ta),
    // KHONG can nop ca bai. Tra ve dap an dung de FE to mau xanh/do (FR-LES-05/06).
    // Kiem tra quyen validateCanLearn hoac attemptId (tu choi neu dang o che do thi thu).
    @PostMapping("/{id}/check")
    public QuestionCheckResultDto checkAnswer(
            @PathVariable String id,
            @AuthenticationPrincipal String userId,
            @RequestBody QuestionCheckRequest req) {
        return questionService.checkAnswer(userId, id, req);
    }
}
