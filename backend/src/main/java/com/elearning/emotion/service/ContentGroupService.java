package com.elearning.emotion.service;

import com.elearning.emotion.dto.ContentGroupCreateRequest;
import com.elearning.emotion.dto.ContentGroupReorderRequest;
import com.elearning.emotion.entity.ContentGroup;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.repository.ContentGroupRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * FR-TCH: "Nhóm hoạt động" nằm trực tiếp trong 1 mục sidebar (course + sectionCode) - vd
 * trong mục "Ngữ pháp TOEIC", giáo viên tạo nhóm "Danh từ" rồi thêm nhiều hoạt động con vào
 * trong đó — xem ảnh giao diện "Hoạt động trong Nhóm" mà người dùng cung cấp.
 */
@Service
@RequiredArgsConstructor
public class ContentGroupService {

    private final ContentGroupRepository contentGroupRepository;
    private final ContentItemRepository contentItemRepository;
    private final CourseService courseService;

    public ContentGroup create(String teacherId, ContentGroupCreateRequest req) {
        if (!SectionCodes.isValid(req.sectionCode())) {
            throw new IllegalArgumentException("section_code khong hop le: " + req.sectionCode());
        }
        Course course = courseService.getOwnedOrThrow(teacherId, req.courseId());

        int nextOrder = contentGroupRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(
                req.courseId(), req.sectionCode()).size();

        ContentGroup group = ContentGroup.builder()
                .course(course)
                .sectionCode(req.sectionCode())
                .title(req.title())
                .orderIndex(nextOrder)
                .build();
        return contentGroupRepository.save(group);
    }

    public ContentGroup rename(String teacherId, String groupId, String newTitle) {
        ContentGroup group = getOwnedOrThrow(teacherId, groupId);
        group.setTitle(newTitle);
        return contentGroupRepository.save(group);
    }

    /** Chỉ cho xoá Nhóm khi đã dọn hết hoạt động con (tránh mất dữ liệu do bấm nhầm) */
    public void delete(String teacherId, String groupId) {
        ContentGroup group = getOwnedOrThrow(teacherId, groupId);
        long remaining = contentItemRepository.findByGroupIdOrderByOrderIndex(groupId).size();
        if (remaining > 0) {
            throw new IllegalStateException(
                    "Nhóm này vẫn còn " + remaining + " hoạt động bên trong — hãy xoá/di chuyển hết trước khi xoá Nhóm");
        }
        contentGroupRepository.delete(group);
    }

    public void reorder(String teacherId, String courseId, ContentGroupReorderRequest req) {
        courseService.getOwnedOrThrow(teacherId, courseId); // xac nhan quyen tren ca khoa hoc
        List<ContentGroup> groups = contentGroupRepository.findAllById(req.orderedGroupIds());
        for (int i = 0; i < req.orderedGroupIds().size(); i++) {
            String id = req.orderedGroupIds().get(i);
            int idx = i;
            groups.stream().filter(g -> g.getId().equals(id)).findFirst()
                    .ifPresent(g -> g.setOrderIndex(idx));
        }
        contentGroupRepository.saveAll(groups);
    }

    public ContentGroup getOwnedOrThrow(String teacherId, String groupId) {
        ContentGroup group = contentGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nhom hoat dong"));
        if (!group.getCourse().getTeacher().getId().equals(teacherId)) {
            throw new SecurityException("Ban khong co quyen chinh sua nhom hoat dong nay");
        }
        return group;
    }
}
