package com.elearning.emotion.controller;

import com.elearning.emotion.dto.moderation.LexiconCreateRequest;
import com.elearning.emotion.dto.moderation.LexiconUpdateRequest;
import com.elearning.emotion.entity.ModerationLexicon;
import com.elearning.emotion.repository.ModerationLexiconRepository;
import com.elearning.emotion.service.LexiconService;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin/lexicon")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class AdminLexiconController {

    private final ModerationLexiconRepository lexiconRepository;
    private final LexiconService lexiconService;

    /**
     * Lấy thống kê tổng quan từ điển kiểm duyệt
     */
    @GetMapping("/stats")
    public ResponseEntity<java.util.Map<String, Object>> getLexiconStats() {
        long total = lexiconRepository.count();
        long activeCount = lexiconRepository.countByActiveTrue();
        long errorCount = lexiconRepository.countBySeverity("ERROR");
        long warningCount = lexiconRepository.countBySeverity("WARNING");
        long infoCount = lexiconRepository.countBySeverity("INFO");
        return ResponseEntity.ok(java.util.Map.of(
                "total", total,
                "activeCount", activeCount,
                "inactiveCount", total - activeCount,
                "errorCount", errorCount,
                "warningCount", warningCount,
                "infoCount", infoCount
        ));
    }

    /**
     * Lấy danh sách từ khóa trong từ điển kiểm duyệt với bộ lọc và phân trang
     */
    @GetMapping
    public ResponseEntity<Page<ModerationLexicon>> getLexiconList(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "category,asc") String sort) {

        String[] sortParts = sort.split(",");
        String sortField = sortParts[0].trim();
        if ("match_type".equalsIgnoreCase(sortField)) {
            sortField = "matchType";
        }
        java.util.Set<String> validSortFields = java.util.Set.of("category", "matchType", "pattern", "severity", "scope", "active", "lang", "id");
        if (!validSortFields.contains(sortField)) {
            sortField = "category";
        }
        Sort.Direction direction = sortParts.length > 1 && "desc".equalsIgnoreCase(sortParts[1].trim())
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        Specification<ModerationLexicon> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), category.trim()));
            }
            if (severity != null && !severity.isBlank()) {
                predicates.add(cb.equal(root.get("severity"), severity.trim()));
            }
            if (scope != null && !scope.isBlank()) {
                predicates.add(cb.equal(root.get("scope"), scope.trim()));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (keyword != null && !keyword.isBlank()) {
                String kw = "%" + keyword.trim().toLowerCase() + "%";
                Predicate patternMatch = cb.like(cb.lower(root.get("pattern")), kw);
                Predicate noteMatch = cb.like(cb.lower(root.get("note")), kw);
                predicates.add(cb.or(patternMatch, noteMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<ModerationLexicon> result = lexiconRepository.findAll(spec, pageable);
        return ResponseEntity.ok(result);
    }

    /**
     * Thêm mới một mục từ điển
     */
    @PostMapping
    public ResponseEntity<ModerationLexicon> createLexicon(@Valid @RequestBody LexiconCreateRequest req) {
        String cat = req.getCategory().trim().toUpperCase();
        String matchType = req.getMatchType().trim().toUpperCase();
        String pattern = req.getPattern().trim();
        String severity = req.getSeverity().trim().toUpperCase();
        String scope = req.getScope() != null && !req.getScope().isBlank() ? req.getScope().trim().toUpperCase() : "ALL";
        String lang = req.getLang() != null && !req.getLang().isBlank() ? req.getLang().trim().toLowerCase() : "vi";

        if (lexiconRepository.findByCategoryAndMatchTypeAndPattern(cat, matchType, pattern).isPresent()) {
            throw new IllegalArgumentException("Từ khóa hoặc mẫu regex này đã tồn tại trong danh mục " + cat);
        }

        ModerationLexicon item = ModerationLexicon.builder()
                .category(cat)
                .matchType(matchType)
                .pattern(pattern)
                .severity(severity)
                .scope(scope)
                .lang(lang)
                .active(req.getActive() != null ? req.getActive() : true)
                .note(req.getNote())
                .build();

        ModerationLexicon saved = lexiconRepository.save(item);
        lexiconService.reloadCache();
        log.info("Admin đã thêm mục từ điển mới: {} [{}] ({})", saved.getPattern(), saved.getCategory(), saved.getSeverity());

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Cập nhật một mục từ điển
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ModerationLexicon> updateLexicon(
            @PathVariable String id,
            @RequestBody LexiconUpdateRequest req) {

        ModerationLexicon item = lexiconRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy mục từ điển với ID: " + id));

        if (req.getCategory() != null && !req.getCategory().isBlank()) {
            item.setCategory(req.getCategory().trim().toUpperCase());
        }
        if (req.getMatchType() != null && !req.getMatchType().isBlank()) {
            item.setMatchType(req.getMatchType().trim().toUpperCase());
        }
        if (req.getPattern() != null && !req.getPattern().isBlank()) {
            item.setPattern(req.getPattern().trim());
        }
        if (req.getSeverity() != null && !req.getSeverity().isBlank()) {
            item.setSeverity(req.getSeverity().trim().toUpperCase());
        }
        if (req.getScope() != null && !req.getScope().isBlank()) {
            item.setScope(req.getScope().trim().toUpperCase());
        }
        if (req.getLang() != null && !req.getLang().isBlank()) {
            item.setLang(req.getLang().trim().toLowerCase());
        }
        if (req.getActive() != null) {
            item.setActive(req.getActive());
        }
        if (req.getNote() != null) {
            item.setNote(req.getNote());
        }

        ModerationLexicon updated = lexiconRepository.save(item);
        lexiconService.reloadCache();
        log.info("Admin đã cập nhật mục từ điển ID {}: {} (active={})", id, updated.getPattern(), updated.getActive());

        return ResponseEntity.ok(updated);
    }

    /**
     * Xóa một mục từ điển
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLexicon(@PathVariable String id) {
        if (!lexiconRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy mục từ điển với ID: " + id);
        }

        lexiconRepository.deleteById(id);
        lexiconService.reloadCache();
        log.info("Admin đã xóa mục từ điển ID {}", id);

        return ResponseEntity.noContent().build();
    }

    /**
     * Nạp lại cache từ điển thủ công
     */
    @PostMapping("/reload")
    public ResponseEntity<String> reloadCache() {
        lexiconService.reloadCache();
        return ResponseEntity.ok("Đã nạp lại bộ nhớ đệm từ điển thành công.");
    }
}
