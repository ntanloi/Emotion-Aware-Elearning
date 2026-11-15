package com.elearning.emotion.service;

import com.elearning.emotion.dto.PassageDto;
import com.elearning.emotion.dto.QuestionDto;
import com.elearning.emotion.dto.test.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminToeicTestService {

    private final ToeicTestRepository toeicTestRepository;
    private final ToeicTestPartRepository toeicTestPartRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final PassageRepository passageRepository;
    private final QuestionService questionService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final ToeicTestSnapshotService toeicTestSnapshotService;
    private final SystemToeicTestSeederService systemToeicTestSeederService;

    /**
     * Danh sách đề thi cho Admin kiểm duyệt & quản lý
     */
    @Transactional(readOnly = true)
    public Page<ToeicTestDto> listTests(String status, String query, Pageable pageable) {
        Specification<ToeicTest> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("status"), status.trim().toUpperCase()));
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

    /**
     * Chi tiết đề thi cho Admin (hiển thị đầy đủ câu hỏi, đáp án đúng và lời giải)
     */
    @Transactional(readOnly = true)
    public AdminTestDetailDto getTestDetailForAdmin(String testId) {
        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        List<TestPartContentDto> partDtos = new ArrayList<>();

        for (ToeicTestPart part : parts) {
            ContentItem item = part.getContentItem();
            List<PassageDto> passages = passageRepository.findByContentItemIdWithMedia(item.getId()).stream()
                    .map(PassageDto::from)
                    .toList();

            List<Question> questions = questionRepository.findByContentItemIdWithMedia(item.getId());
            // toTeacherDtos hiển thị đáp án đúng và lời giải thích phục vụ Admin duyệt đề
            List<QuestionDto> questionDtos = questionService.toTeacherDtos(questions);

            partDtos.add(new TestPartContentDto(
                    part.getPartNo(),
                    item.getId(),
                    questions.size(),
                    passages,
                    questionDtos
            ));
        }

        return new AdminTestDetailDto(ToeicTestDto.from(test, parts), partDtos);
    }

    /**
     * Phê duyệt đề thi (chuyển sang PUBLISHED, ghi published_at, gửi thông báo)
     */
    @Transactional
    public ToeicTestDto approveTest(String adminId, String testId) {
        User adminUser = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        test.setStatus("PUBLISHED");
        test.setPublishedAt(LocalDateTime.now());
        test.setRejectionReason(null);
        test = toeicTestRepository.save(test);

        // Ghi Audit Log
        auditService.log(adminUser, "APPROVE_TOEIC_TEST", "TOEIC_TEST", testId,
                "{\"testTitle\":\"" + test.getTitle() + "\"}");

        // Gửi thông báo đến giáo viên tác giả
        if (test.getAuthor() != null) {
            notificationService.send(
                    test.getAuthor().getId(),
                    "Đề thi của bạn đã được phê duyệt",
                    "Chúc mừng! Đề thi \"" + test.getTitle() + "\" đã được Ban quản trị phê duyệt và đăng tải lên Thư viện đề thi TOEIC.",
                    "TEST_MODERATION",
                    testId,
                    "/tests/" + testId
            );
        }

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        return ToeicTestDto.from(test, parts);
    }

    /**
     * Từ chối đề thi (chuyển sang REJECTED, lưu rejectionReason, gửi thông báo kèm lý do)
     */
    @Transactional
    public ToeicTestDto rejectTest(String adminId, String testId, String reason) {
        User adminUser = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        String safeReason = (reason != null && !reason.isBlank()) ? reason.trim() : "Chưa đáp ứng tiêu chuẩn chất lượng đề thi";

        test.setStatus("REJECTED");
        test.setRejectionReason(safeReason);
        test = toeicTestRepository.save(test);

        // Ghi Audit Log
        auditService.log(adminUser, "REJECT_TOEIC_TEST", "TOEIC_TEST", testId,
                "{\"reason\":\"" + safeReason.replace("\"", "\\\"") + "\"}");

        // Gửi thông báo đến giáo viên tác giả
        if (test.getAuthor() != null) {
            notificationService.send(
                    test.getAuthor().getId(),
                    "Đề thi của bạn bị từ chối phê duyệt",
                    "Đề thi \"" + test.getTitle() + "\" chưa được phê duyệt với lý do: " + safeReason,
                    "TEST_MODERATION",
                    testId,
                    "/teacher/tests"
            );
        }

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        return ToeicTestDto.from(test, parts);
    }

    /**
     * Gỡ bỏ / Ẩn đề thi vi phạm khỏi thư viện
     */
    @Transactional
    public ToeicTestDto hideViolationTest(String adminId, String testId, String reason) {
        User adminUser = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        String safeReason = (reason != null && !reason.isBlank()) ? reason.trim() : "Vi phạm quy chế nội dung thư viện";

        test.setStatus("HIDDEN");
        test.setRejectionReason(safeReason);
        test = toeicTestRepository.save(test);

        // Ghi Audit Log
        auditService.log(adminUser, "HIDE_TOEIC_TEST", "TOEIC_TEST", testId,
                "{\"reason\":\"" + safeReason.replace("\"", "\\\"") + "\"}");

        // Gửi thông báo đến giáo viên tác giả
        if (test.getAuthor() != null) {
            notificationService.send(
                    test.getAuthor().getId(),
                    "Đề thi của bạn đã bị gỡ khỏi thư viện",
                    "Đề thi \"" + test.getTitle() + "\" đã bị Ban quản trị gỡ bỏ do vi phạm: " + safeReason,
                    "TEST_MODERATION",
                    testId,
                    "/teacher/tests"
            );
        }

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        return ToeicTestDto.from(test, parts);
    }

    /**
     * Admin soạn và xuất bản thẳng đề thi Hệ thống (không cần qua duyệt)
     */
    @Transactional
    public ToeicTestDto createSystemTest(String adminId, ToeicTestPublishRequest req) {
        User adminUser = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        ToeicTestDto dto = toeicTestSnapshotService.snapshotFromCourse(adminId, req);

        // Chuyển sang SYSTEM và PUBLISHED ngay lập tức
        ToeicTest test = toeicTestRepository.findById(dto.id())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề vừa tạo"));

        test.setSource("SYSTEM");
        test.setStatus("PUBLISHED");
        test.setPublishedAt(LocalDateTime.now());
        test = toeicTestRepository.save(test);

        auditService.log(adminUser, "CREATE_SYSTEM_TOEIC_TEST", "TOEIC_TEST", test.getId(),
                "{\"title\":\"" + test.getTitle() + "\"}");

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        return ToeicTestDto.from(test, parts);
    }

    /**
     * Khởi tạo bộ 5 đề thi Hệ thống chuẩn ETS TOEIC
     */
    @Transactional
    public List<ToeicTestDto> seedSampleSystemTests(String adminId) {
        List<ToeicTest> tests = systemToeicTestSeederService.seedSystemTests(adminId);
        return tests.stream().map(t -> {
            List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(t.getId());
            return ToeicTestDto.from(t, parts);
        }).toList();
    }
}
