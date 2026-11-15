package com.elearning.emotion.service;

import com.elearning.emotion.dto.test.ToeicTestDto;
import com.elearning.emotion.entity.ToeicTest;
import com.elearning.emotion.entity.ToeicTestPart;
import com.elearning.emotion.repository.ToeicTestPartRepository;
import com.elearning.emotion.repository.ToeicTestRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ToeicTestService {

    private final ToeicTestRepository toeicTestRepository;
    private final ToeicTestPartRepository toeicTestPartRepository;
    private final TestAccessService testAccessService;

    @Transactional(readOnly = true)
    public Page<ToeicTestDto> listPublishedTests(String source, String query, Pageable pageable) {
        Specification<ToeicTest> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "PUBLISHED"));

            if (source != null && !source.isBlank() && !"ALL".equalsIgnoreCase(source)) {
                predicates.add(cb.equal(root.get("source"), source.trim().toUpperCase()));
            }

            if (query != null && !query.isBlank()) {
                String likePattern = "%" + query.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("title")), likePattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<ToeicTest> page = toeicTestRepository.findAll(spec, pageable);
        List<String> testIds = page.getContent().stream().map(ToeicTest::getId).toList();

        Map<String, List<ToeicTestPart>> partsByTestId = testIds.isEmpty() ? Map.of()
                : testIds.stream()
                .collect(Collectors.toMap(id -> id, toeicTestPartRepository::findByTestIdOrderByPartNoAsc));

        return page.map(t -> ToeicTestDto.from(t, partsByTestId.getOrDefault(t.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public ToeicTestDto getTest(String id, String currentUserId) {
        ToeicTest test = toeicTestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi"));

        // Nếu đề không PUBLISHED, kiểm tra quyền
        if (!"PUBLISHED".equalsIgnoreCase(test.getStatus())) {
            testAccessService.validateCanTakeTest(currentUserId, test);
        }

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        return ToeicTestDto.from(test, parts);
    }
}
