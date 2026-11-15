package com.elearning.emotion.controller;

import com.elearning.emotion.dto.VocabWordCreateRequest;
import com.elearning.emotion.dto.VocabWordDto;
import com.elearning.emotion.dto.VocabWordUpdateRequest;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.repository.VocabWordRepository;
import com.elearning.emotion.service.VocabWordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    public Object mine(
            @AuthenticationPrincipal String teacherId,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "partOfSpeech", required = false) String partOfSpeech
    ) {
        // Neu khong truyen param page -> tra ve List nhu cu (danh cho VocabWordPickerModal)
        if (page == null) {
            return vocabWordRepository.findByTeacherId(teacherId).stream()
                    .map(vocabWordService::toDto).toList();
        }

        int pageNum = Math.max(0, page);
        int pageSize = (size != null && size > 0) ? size : 12;
        Pageable pageable = PageRequest.of(pageNum, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String cleanPos = (partOfSpeech != null && !partOfSpeech.isBlank() && !"ALL".equalsIgnoreCase(partOfSpeech)) ? partOfSpeech.trim() : null;

        Page<VocabWord> resultPage = vocabWordRepository.searchTeacherVocab(teacherId, cleanSearch, cleanPos, pageable);
        return resultPage.map(vocabWordService::toDto);
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
