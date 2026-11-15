package com.elearning.emotion.controller;

import com.elearning.emotion.dto.CourseCreateRequest;
import com.elearning.emotion.dto.CourseDto;
import com.elearning.emotion.dto.CourseUpdateRequest;
import com.elearning.emotion.entity.ContentGroup;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.repository.ContentGroupRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.service.CourseAccessService;
import com.elearning.emotion.service.CourseReviewService;
import com.elearning.emotion.service.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseRepository courseRepository;
    private final CourseService courseService;
    private final CourseReviewService courseReviewService;
    private final CourseAccessService courseAccessService;
    private final ContentGroupRepository contentGroupRepository;
    private final ContentItemRepository contentItemRepository;

    // FR-ACC-02: danh sach khoa hoc cong khai (chi hien PUBLISHED cho khach vang lai/hoc vien, an cac khoa EXAM chua de thi)
    @GetMapping
    public List<CourseDto> list() {
        List<Course> courses = courseRepository.findByStatus("PUBLISHED");
        Map<String, double[]> ratings = courseReviewService.summariesFor(courses.stream().map(Course::getId).toList());
        return courses.stream()
                .filter(c -> !"EXAM".equalsIgnoreCase(c.getProfile()) && !"BANK".equalsIgnoreCase(c.getProfile()))
                .map(c -> {
                    double[] r = ratings.get(c.getId());
                    return CourseDto.fromPublic(c, r != null ? r[0] : null, r != null ? (long) r[1] : 0L);
                })
                .toList();
    }

    @GetMapping("/{id}")
    public CourseDto get(@PathVariable String id, @AuthenticationPrincipal String userId) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));

        // Bảo vệ: Khoá chưa PUBLISHED chỉ chủ khoá hoặc ADMIN mới được xem
        courseAccessService.validateCanView(userId, course);

        if (("EXAM".equalsIgnoreCase(course.getProfile()) || "BANK".equalsIgnoreCase(course.getProfile()))
                && !courseAccessService.canManageOrModerate(userId, course)) {
            throw new IllegalArgumentException("Khóa học nội bộ chứa đề thi không hiển thị công khai.");
        }

        Map<String, double[]> ratings = courseReviewService.summariesFor(List.of(id));
        double[] r = ratings.get(id);

        boolean canSeeTeacherDetails = courseAccessService.canManageOrModerate(userId, course);
        return canSeeTeacherDetails
                ? CourseDto.fromTeacher(course, r != null ? r[0] : null, r != null ? (long) r[1] : 0L)
                : CourseDto.fromPublic(course, r != null ? r[0] : null, r != null ? (long) r[1] : 0L);
    }

    // FR-TCH-01: danh sach khoa hoc CUA CHINH giang vien dang dang nhap (gom ca DRAFT/PENDING_REVIEW/HIDDEN)
    @GetMapping("/mine")
    @PreAuthorize("hasRole('TEACHER')")
    public List<CourseDto> mine(@AuthenticationPrincipal String teacherId) {
        List<Course> courses = courseRepository.findByTeacherId(teacherId);
        Map<String, double[]> ratings = courseReviewService.summariesFor(courses.stream().map(Course::getId).toList());
        return courses.stream()
                .filter(c -> !"EXAM".equalsIgnoreCase(c.getProfile()) && !"BANK".equalsIgnoreCase(c.getProfile()))
                .map(c -> {
                    double[] r = ratings.get(c.getId());
                    return CourseDto.fromTeacher(c, r != null ? r[0] : null, r != null ? (long) r[1] : 0L);
                })
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto create(@AuthenticationPrincipal String teacherId, @Valid @RequestBody CourseCreateRequest req) {
        return CourseDto.fromTeacher(courseService.create(teacherId, req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto update(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                            @RequestBody CourseUpdateRequest req) {
        return CourseDto.fromTeacher(courseService.update(teacherId, id, req));
    }

    // Giảng viên gửi duyệt khoá học (thay thế cho việc tự tiện xuất bản)
    @PostMapping("/{id}/submit")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto submit(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        return CourseDto.fromTeacher(courseService.submit(teacherId, id));
    }

    // Giảng viên ẩn khoá học đã xuất bản
    @PostMapping("/{id}/hide")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto hide(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        return CourseDto.fromTeacher(courseService.hide(teacherId, id));
    }

    // Giảng viên hiện lại khoá học đã ẩn
    @PostMapping("/{id}/show")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto show(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        return CourseDto.fromTeacher(courseService.show(teacherId, id));
    }

    // Giảng viên rút lại yêu cầu kiểm duyệt để về DRAFT chỉnh sửa (P2-4)
    @PostMapping("/{id}/cancel-submit")
    @PreAuthorize("hasRole('TEACHER')")
    public CourseDto cancelSubmit(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        return CourseDto.fromTeacher(courseService.cancelSubmit(teacherId, id));
    }

    // Lấy danh sách các sectionCode thực tế đang có nhóm hoặc hoạt động trong khoá học
    @GetMapping("/{id}/sections")
    public List<String> getCourseSections(@PathVariable String id, @AuthenticationPrincipal String userId) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
        courseAccessService.validateCanView(userId, course);

        Set<String> opened = new LinkedHashSet<>();
        contentGroupRepository.findByCourseId(id).forEach(g -> {
            if (g.getSectionCode() != null && !g.getSectionCode().isBlank()) {
                opened.add(g.getSectionCode().toUpperCase());
            }
        });
        contentItemRepository.findByCourseId(id).forEach(it -> {
            if (it.getSectionCode() != null && !it.getSectionCode().isBlank()) {
                opened.add(it.getSectionCode().toUpperCase());
            }
        });
        return new ArrayList<>(opened);
    }

    // Xoá một mục sectionCode (xoá toàn bộ nhóm rỗng hoặc toàn bộ nội dung trong mục này)
    @DeleteMapping("/{id}/sections/{sectionCode}")
    @PreAuthorize("hasRole('TEACHER')")
    public void deleteCourseSection(@PathVariable String id,
                                    @PathVariable String sectionCode,
                                    @AuthenticationPrincipal String teacherId) {
        Course course = courseService.getOwnedOrThrow(teacherId, id);
        courseService.validateCanModifyCourseContent(course);

        String upperCode = sectionCode.toUpperCase();
        List<ContentItem> items = contentItemRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(id, upperCode);
        if (!items.isEmpty()) {
            throw new IllegalStateException("Mục này vẫn còn " + items.size() + " hoạt động bên trong. Vui lòng xoá các hoạt động trước khi gỡ mục.");
        }

        List<ContentGroup> groups = contentGroupRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(id, upperCode);
        contentGroupRepository.deleteAll(groups);
        courseService.notifyContentChanged(course);
    }
}
