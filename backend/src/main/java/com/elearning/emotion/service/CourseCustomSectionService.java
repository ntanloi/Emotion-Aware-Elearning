package com.elearning.emotion.service;

import com.elearning.emotion.dto.CourseCustomSectionDto;
import com.elearning.emotion.dto.CourseCustomSectionRequest;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.CourseCustomSection;
import com.elearning.emotion.repository.CourseCustomSectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseCustomSectionService {

    private final CourseCustomSectionRepository repo;
    private final CourseService courseService;

    public List<CourseCustomSectionDto> list(String courseId) {
        return repo.findByCourseIdOrderByOrderIndex(courseId).stream()
                .map(CourseCustomSectionDto::from).toList();
    }

    public CourseCustomSectionDto create(String teacherId, String courseId, CourseCustomSectionRequest req) {
        var course = courseService.getOwnedOrThrow(teacherId, courseId);
        courseService.validateCanModifyCourseContent(course);

        int nextOrder = repo.findByCourseIdOrderByOrderIndex(courseId).size();
        var section = CourseCustomSection.builder()
                .course(course)
                .title(req.title().trim())
                .icon(req.icon() != null && !req.icon().isBlank() ? req.icon().trim() : "📌")
                .orderIndex(nextOrder)
                .build();
        CourseCustomSection saved = repo.save(section);
        courseService.notifyContentChanged(course);
        return CourseCustomSectionDto.from(saved);
    }

    public CourseCustomSectionDto update(String teacherId, String sectionId, CourseCustomSectionRequest req) {
        var section = getOwnedOrThrow(teacherId, sectionId);
        section.setTitle(req.title().trim());
        if (req.icon() != null && !req.icon().isBlank()) section.setIcon(req.icon().trim());
        CourseCustomSection saved = repo.save(section);
        courseService.notifyContentChanged(saved.getCourse());
        return CourseCustomSectionDto.from(saved);
    }

    public void delete(String teacherId, String sectionId) {
        var section = getOwnedOrThrow(teacherId, sectionId);
        Course course = section.getCourse();
        repo.delete(section);
        courseService.notifyContentChanged(course);
    }

    private CourseCustomSection getOwnedOrThrow(String teacherId, String sectionId) {
        var section = repo.findById(sectionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mục nội dung: " + sectionId));
        if (!section.getCourse().getTeacher().getId().equals(teacherId)) {
            throw new SecurityException("Bạn không có quyền chỉnh sửa mục nội dung này");
        }
        courseService.validateCanModifyCourseContent(section.getCourse());
        return section;
    }
}
