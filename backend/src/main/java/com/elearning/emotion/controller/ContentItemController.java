package com.elearning.emotion.controller;

import com.elearning.emotion.dto.ContentGroupDto;
import com.elearning.emotion.dto.ContentItemCreateRequest;
import com.elearning.emotion.dto.ContentItemDto;
import com.elearning.emotion.dto.ContentItemReorderRequest;
import com.elearning.emotion.dto.ContentItemUpdateRequest;
import com.elearning.emotion.dto.SectionContentTreeDto;
import com.elearning.emotion.dto.VocabSetItemsRequest;
import com.elearning.emotion.dto.VocabWordDto;
import com.elearning.emotion.repository.ContentGroupRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.VocabSetItemRepository;
import com.elearning.emotion.service.ContentItemService;
import com.elearning.emotion.service.VocabWordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ContentItemController {

    private final ContentItemRepository contentItemRepository;
    private final ContentGroupRepository contentGroupRepository;
    private final ContentItemService contentItemService;
    private final VocabSetItemRepository vocabSetItemRepository;
    private final VocabWordService vocabWordService;

    // FR-LES-01: hoc vien/giang vien xem danh sach hoat dong trong 1 muc sidebar (kieu PHANG -
    // giu nguyen cho tuong thich nguoc voi frontend/tich hop cu). Trang UnitContentPage hien da
    // chuyen sang dung /content-tree ben duoi de hien thi theo Nhom hoat dong.
    @GetMapping("/api/courses/{courseId}/content-items")
    public List<ContentItemDto> listBySection(@PathVariable String courseId,
                                               @RequestParam String sectionCode) {
        return contentItemRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(courseId, sectionCode).stream()
                .map(ContentItemDto::from).toList();
    }

    // FR-LES-01 (V4): cay noi dung co Nhom hoat dong (vd "Danh tu" gom nhieu video +
    // luyen tap) - xem SectionContentTreeDto. Cac hoat dong khong thuoc Nhom nao (muc sidebar
    // dang dung kieu phang, chua tao Nhom) tra ve trong ungroupedItems.
    @GetMapping("/api/courses/{courseId}/content-tree")
    public SectionContentTreeDto contentTree(@PathVariable String courseId,
                                              @RequestParam String sectionCode) {
        List<ContentGroupDto> groups = contentGroupRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(courseId, sectionCode).stream()
                .map(g -> ContentGroupDto.from(g,
                        contentItemRepository.findByGroupIdOrderByOrderIndex(g.getId()).stream()
                                .map(ContentItemDto::from).toList()))
                .toList();
        List<ContentItemDto> ungrouped = contentItemRepository
                .findByCourseIdAndSectionCodeAndGroupIsNullOrderByOrderIndex(courseId, sectionCode)
                .stream().map(ContentItemDto::from).toList();
        return new SectionContentTreeDto(groups, ungrouped);
    }

    @GetMapping("/api/content-items/{id}")
    public ContentItemDto get(@PathVariable String id) {
        return ContentItemDto.from(contentItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay noi dung")));
    }

    // FR-TCH-03/04/05/06: tao hoat dong moi trong 1 muc sidebar, tuy type
    @PostMapping("/api/content-items")
    @PreAuthorize("hasRole('TEACHER')")
    public ContentItemDto create(@AuthenticationPrincipal String teacherId,
                                 @Valid @RequestBody ContentItemCreateRequest req) {
        return ContentItemDto.from(contentItemService.create(teacherId, req));
    }

    @DeleteMapping("/api/content-items/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        contentItemService.delete(teacherId, id);
    }

    // FR-TCH: sua tieu de/gioi han thoi gian/video/bai viet hoac chuyen hoat dong sang Nhom khac
    @PutMapping("/api/content-items/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public ContentItemDto update(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                                 @RequestBody ContentItemUpdateRequest req) {
        return ContentItemDto.from(contentItemService.update(teacherId, id, req));
    }

    // Keo-tha sap xep thu tu hoat dong (trong cung 1 muc sidebar hoac cung 1 Nhom)
    @PutMapping("/api/content-items/reorder")
    @PreAuthorize("hasRole('TEACHER')")
    public void reorder(@AuthenticationPrincipal String teacherId, @RequestBody ContentItemReorderRequest req) {
        contentItemService.reorder(teacherId, req.orderedItemIds());
    }

    // FR-TCH-03: gan danh sach tu cho 1 Bo tu vung (ghi de toan bo, giu dung thu tu gui len)
    @PutMapping("/api/content-items/{id}/vocab-words")
    @PreAuthorize("hasRole('TEACHER')")
    public void setVocabWords(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                              @RequestBody VocabSetItemsRequest req) {
        contentItemService.setVocabWords(teacherId, id, req.wordIds());
    }

    // FR-LES-03: hoc vien xem danh sach tu cua 1 Bo tu vung (dung lam nguon cho 5 dang luyen tap tu sinh)
    @GetMapping("/api/content-items/{id}/vocab-words")
    public List<VocabWordDto> getVocabWords(@PathVariable String id) {
        return vocabSetItemRepository.findByContentItemIdOrderByOrderIndex(id).stream()
                .map(item -> vocabWordService.toDto(item.getWord()))
                .toList();
    }
}
