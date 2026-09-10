package com.elearning.emotion.service;

import com.elearning.emotion.dto.CourseCreateRequest;
import com.elearning.emotion.dto.CourseUpdateRequest;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.repository.CourseRepository;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final MediaAssetRepository mediaAssetRepository;

    /** FR-TCH-01: tao khoa hoc moi. Sidebar 4 muc la khung CO DINH o tang hien thi (section_code),
     *  KHONG can seed du lieu gi them o day. */
    public Course create(String teacherId, CourseCreateRequest req) {
        var teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay giang vien"));

        Course course = Course.builder()
                .teacher(teacher)
                .title(req.title())
                .description(req.description())
                .level(req.level())
                .durationHours(req.durationHours())
                .price(req.price())
                .originalPrice(req.originalPrice())
                .coverMedia(resolveMedia(req.coverMediaId()))
                .status("DRAFT")
                .build();
        return courseRepository.save(course);
    }

    public Course update(String teacherId, String courseId, CourseUpdateRequest req) {
        Course course = getOwnedOrThrow(teacherId, courseId);
        if (req.title() != null) course.setTitle(req.title());
        if (req.description() != null) course.setDescription(req.description());
        if (req.level() != null) course.setLevel(req.level());
        if (req.durationHours() != null) course.setDurationHours(req.durationHours());
        if (req.price() != null) course.setPrice(req.price());
        if (req.originalPrice() != null) course.setOriginalPrice(req.originalPrice());
        if (req.coverMediaId() != null) course.setCoverMedia(resolveMedia(req.coverMediaId()));
        if (req.status() != null) course.setStatus(req.status());
        return courseRepository.save(course);
    }

    /** Kiem tra khoa hoc thuoc dung giang vien dang dang nhap - dung lai o ContentGroup/ContentItem service khac */
    public Course getOwnedOrThrow(String teacherId, String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay khoa hoc"));
        if (!course.getTeacher().getId().equals(teacherId)) {
            throw new SecurityException("Ban khong co quyen chinh sua khoa hoc nay");
        }
        return course;
    }

    private MediaAsset resolveMedia(String mediaId) {
        if (mediaId == null) return null;
        return mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay media: " + mediaId));
    }
}
