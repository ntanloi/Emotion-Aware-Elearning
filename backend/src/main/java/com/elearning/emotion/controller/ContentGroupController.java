package com.elearning.emotion.controller;

import com.elearning.emotion.dto.ContentGroupCreateRequest;
import com.elearning.emotion.dto.ContentGroupDto;
import com.elearning.emotion.dto.ContentGroupReorderRequest;
import com.elearning.emotion.dto.ContentGroupUpdateRequest;
import com.elearning.emotion.repository.ContentGroupRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.service.ContentGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ContentGroupController {

    private final ContentGroupRepository contentGroupRepository;
    private final ContentItemRepository contentItemRepository;
    private final ContentGroupService contentGroupService;

    // Danh sach Nhom hoat dong cua 1 muc sidebar (khong kem items - dung /content-tree neu can ca items)
    @GetMapping("/api/courses/{courseId}/content-groups")
    public List<ContentGroupDto> listBySection(@PathVariable String courseId,
                                                @RequestParam String sectionCode) {
        return contentGroupRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(courseId, sectionCode).stream()
                .map(g -> ContentGroupDto.from(g,
                        contentItemRepository.findByGroupIdOrderByOrderIndex(g.getId()).stream()
                                .map(com.elearning.emotion.dto.ContentItemDto::from).toList()))
                .toList();
    }

    @PostMapping("/api/content-groups")
    @PreAuthorize("hasRole('TEACHER')")
    public ContentGroupDto create(@AuthenticationPrincipal String teacherId,
                                   @Valid @RequestBody ContentGroupCreateRequest req) {
        var group = contentGroupService.create(teacherId, req);
        return ContentGroupDto.from(group, List.of());
    }

    @PutMapping("/api/content-groups/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public ContentGroupDto rename(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                                   @Valid @RequestBody ContentGroupUpdateRequest req) {
        var group = contentGroupService.rename(teacherId, id, req.title());
        var items = contentItemRepository.findByGroupIdOrderByOrderIndex(id).stream()
                .map(com.elearning.emotion.dto.ContentItemDto::from).toList();
        return ContentGroupDto.from(group, items);
    }

    @DeleteMapping("/api/content-groups/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        contentGroupService.delete(teacherId, id);
    }

    @PutMapping("/api/courses/{courseId}/content-groups/reorder")
    @PreAuthorize("hasRole('TEACHER')")
    public void reorder(@AuthenticationPrincipal String teacherId, @PathVariable String courseId,
                         @RequestBody ContentGroupReorderRequest req) {
        contentGroupService.reorder(teacherId, courseId, req);
    }
}
