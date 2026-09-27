package com.elearning.emotion.controller;

import com.elearning.emotion.dto.VocabWordCreateRequest;
import com.elearning.emotion.dto.VocabWordDto;
import com.elearning.emotion.dto.VocabWordUpdateRequest;
import com.elearning.emotion.repository.VocabWordRepository;
import com.elearning.emotion.service.VocabWordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** FR-TCH-03: thu vien tu vung rieng cua giang vien, dung lai giua nhieu muc sidebar/khoa hoc */
@RestController
@RequestMapping("/api/vocab-words")
@RequiredArgsConstructor
public class VocabWordController {

    private final VocabWordRepository vocabWordRepository;
    private final VocabWordService vocabWordService;

    @GetMapping("/mine")
    @PreAuthorize("hasRole('TEACHER')")
    public List<VocabWordDto> mine(@AuthenticationPrincipal String teacherId) {
        return vocabWordRepository.findByTeacherId(teacherId).stream()
                .map(vocabWordService::toDto).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('TEACHER')")
    public VocabWordDto create(@AuthenticationPrincipal String teacherId,
                               @Valid @RequestBody VocabWordCreateRequest req) {
        return vocabWordService.toDto(vocabWordService.create(teacherId, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public void delete(@AuthenticationPrincipal String teacherId, @PathVariable String id) {
        vocabWordService.delete(teacherId, id);
    }

    // FR-TCH: sua 1 tu vung da tao (giao dien VocabWordModal o che do sua)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public VocabWordDto update(@AuthenticationPrincipal String teacherId, @PathVariable String id,
                               @RequestBody VocabWordUpdateRequest req) {
        return vocabWordService.toDto(vocabWordService.update(teacherId, id, req));
    }
}
