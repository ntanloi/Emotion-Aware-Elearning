package com.elearning.emotion.controller;

import com.elearning.emotion.dto.PassageCreateRequest;
import com.elearning.emotion.dto.PassageDto;
import com.elearning.emotion.dto.PassageUpdateRequest;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Passage;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.PassageRepository;
import com.elearning.emotion.service.CourseAccessService;
import com.elearning.emotion.service.PassageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** FR-TCH-06: Doan van/hoi thoai dung chung cho nhieu cau hoi (Part 3/4/6/7) */
@RestController
@RequestMapping("/api/passages")
@RequiredArgsConstructor
public class PassageController {

    private final PassageRepository passageRepository;
    private final PassageService passageService;
    private final ContentItemRepository contentItemRepository;
    private final CourseAccessService courseAccessService;

    @GetMapping
    public List<PassageDto> listByContentItem(
            @RequestParam String contentItemId,
            @AuthenticationPrincipal String userId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài học / hoạt động"));
        courseAccessService.validateCanLearn(userId, item.getCourse());

        return passageRepository.findByContentItemIdWithMedia(contentItemId).stream()
                .filter(p -> p.getStatus() == null || "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .map(PassageDto::from)
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public PassageDto create(@AuthenticationPrincipal String teacherId, @Valid @RequestBody PassageCreateRequest req) {
        return PassageDto.from(passageService.create(teacherId, req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public PassageDto update(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                             @RequestBody PassageUpdateRequest req) {
        return PassageDto.from(passageService.update(teacherId, id, req));
    }

    @RequestMapping(value = "/bulk-status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasRole('TEACHER')")
    public void bulkUpdateStatus(
            @AuthenticationPrincipal String teacherId,
            @RequestParam String contentItemId,
            @RequestParam(defaultValue = "DISABLED") String status) {
        passageService.updateAllStatusByContentItem(teacherId, contentItemId, status);
    }

    @RequestMapping(value = "/{id}/status", method = {RequestMethod.PATCH, RequestMethod.PUT})
    @PreAuthorize("hasRole('TEACHER')")
    public PassageDto updateStatus(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                                   @RequestParam(required = false) String status) {
        Passage p = passageService.getOwnedOrThrow(teacherId, id);
        String nextStatus = status != null ? status : ("ACTIVE".equalsIgnoreCase(p.getStatus()) ? "DISABLED" : "ACTIVE");
        return PassageDto.from(passageService.updateStatus(teacherId, id, nextStatus));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        passageService.delete(teacherId, id);
    }

}
