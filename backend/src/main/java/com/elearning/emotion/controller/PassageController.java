package com.elearning.emotion.controller;

import com.elearning.emotion.dto.PassageCreateRequest;
import com.elearning.emotion.dto.PassageDto;
import com.elearning.emotion.dto.PassageUpdateRequest;
import com.elearning.emotion.repository.PassageRepository;
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

    @GetMapping
    public List<PassageDto> listByContentItem(@RequestParam String contentItemId) {
        return passageRepository.findByContentItemIdOrderByOrderIndex(contentItemId).stream()
                .map(PassageDto::from).toList();
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        passageService.delete(teacherId, id);
    }
}
