package com.elearning.emotion.service;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemToeicTestSeederService {

    private final ToeicTestRepository toeicTestRepository;
    private final ToeicTestPartRepository toeicTestPartRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ContentItemRepository contentItemRepository;
    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final PassageRepository passageRepository;
    private final AuditService auditService;

    /**
     * Khởi tạo 5 bộ đề thi Hệ thống chuẩn ETS TOEIC
     */
    @Transactional
    public List<ToeicTest> seedSystemTests(String adminUserId) {
        User admin = userRepository.findById(adminUserId)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("Không tìm thấy tài khoản ADMIN")));

        // Khóa chứa đề ẩn của Admin (profile = EXAM)
        Course adminContainerCourse = courseRepository.findFirstByTeacherIdAndProfile(admin.getId(), "EXAM")
                .orElseGet(() -> {
                    Course c = Course.builder()
                            .teacher(admin)
                            .title("Kho chứa đề TOEIC Hệ thống")
                            .description("Khóa chứa đề ẩn lưu trữ các đề thi chuẩn của hệ thống")
                            .profile("EXAM")
                            .status("PUBLISHED")
                            .build();
                    return courseRepository.save(c);
                });

        List<ToeicTest> createdTests = new ArrayList<>();

        // Danh sách 5 đề thi mẫu
        createdTests.add(createTest(admin, adminContainerCourse,
                "ETS TOEIC 2024 — Full Test 01",
                "Đề thi thử TOEIC chuẩn format mới 2024 từ ETS. Bao gồm đầy đủ 7 Parts từ Part 1 đến Part 7 với lời giải chi tiết từng câu.",
                45, 75, 1));

        createdTests.add(createTest(admin, adminContainerCourse,
                "ETS TOEIC 2024 — Full Test 02",
                "Đề thi chuẩn hóa độ khó tương đương kỳ thi thật. Rèn luyện kỹ năng phân tích bẫy nghe Part 2-3 và kỹ năng đọc lướt Part 7.",
                45, 75, 2));

        createdTests.add(createTest(admin, adminContainerCourse,
                "ETS TOEIC 2023 — Practice Test 01",
                "Đề thi luyện tập toàn diện ETS 2023. Tối ưu cho học viên cần kiểm tra trình độ hiện tại và làm quen với áp lực thời gian 120 phút.",
                45, 75, 3));

        createdTests.add(createTest(admin, adminContainerCourse,
                "ETS TOEIC 2023 — Practice Test 02",
                "Bộ đề thi thử ETS 2023 với các câu hỏi từ vựng thương mại, email công sở và thông báo nội bộ thường gặp.",
                45, 75, 4));

        createdTests.add(createTest(admin, adminContainerCourse,
                "New Economy TOEIC — Mini Simulation Test",
                "Đề thi mô phỏng cấp độ nâng cao mục tiêu 750+, tập trung phân loại các bẫy ngữ pháp khó Part 5 và chuỗi văn bản đôi/ba Part 7.",
                30, 45, 5));

        auditService.log(admin, "SEED_SYSTEM_TOEIC_TESTS", "TOEIC_TEST", "SYSTEM",
                "{\"seededCount\":" + createdTests.size() + "}");

        log.info("Khởi tạo thành công {} đề thi Hệ thống chuẩn TOEIC ETS", createdTests.size());
        return createdTests;
    }

    private ToeicTest createTest(User admin, Course container, String title, String desc, int listeningMin, int readingMin, int seedIdx) {
        ToeicTest test = ToeicTest.builder()
                .source("SYSTEM")
                .author(admin)
                .course(container)
                .title(title)
                .description(desc)
                .status("PUBLISHED")
                .version(1)
                .listeningMinutes(listeningMin)
                .readingMinutes(readingMin)
                .attemptCount(0)
                .publishedAt(LocalDateTime.now())
                .build();
        test = toeicTestRepository.save(test);

        // Tạo 7 Parts chuẩn
        for (int partNo = 1; partNo <= 7; partNo++) {
            createPart(test, container, partNo, seedIdx);
        }

        return test;
    }

    private void createPart(ToeicTest test, Course container, int partNo, int seedIdx) {
        String partTitle = getPartName(partNo) + " (" + test.getTitle() + ")";
        ContentItem item = ContentItem.builder()
                .course(container)
                .sectionCode("PART" + partNo)
                .type("PRACTICE_TEST")
                .title(partTitle)
                .orderIndex(partNo)
                .build();
        item = contentItemRepository.save(item);

        int qCount = 0;
        switch (partNo) {
            case 1 -> qCount = seedPart1(item, seedIdx);
            case 2 -> qCount = seedPart2(item, seedIdx);
            case 3 -> qCount = seedPart3(item, seedIdx);
            case 4 -> qCount = seedPart4(item, seedIdx);
            case 5 -> qCount = seedPart5(item, seedIdx);
            case 6 -> qCount = seedPart6(item, seedIdx);
            case 7 -> qCount = seedPart7(item, seedIdx);
        }

        ToeicTestPart part = ToeicTestPart.builder()
                .test(test)
                .partNo(partNo)
                .contentItem(item)
                .questionCount(qCount)
                .build();
        toeicTestPartRepository.save(part);
    }

    private String getPartName(int partNo) {
        return switch (partNo) {
            case 1 -> "Part 1 - Photographs";
            case 2 -> "Part 2 - Question-Response";
            case 3 -> "Part 3 - Short Conversations";
            case 4 -> "Part 4 - Short Talks";
            case 5 -> "Part 5 - Incomplete Sentences";
            case 6 -> "Part 6 - Text Completion";
            case 7 -> "Part 7 - Reading Comprehension";
            default -> "Part " + partNo;
        };
    }

    private int seedPart1(ContentItem item, int seedIdx) {
        // Câu 1
        createQuestionWithOptions(item, null,
                "Look at the picture. What is the woman doing?",
                "Bức tranh miêu tả một phụ nữ đang nhìn vào màn hình máy tính tại bàn làm việc.",
                1,
                List.of(
                        new OptionData("A", "She is looking at a computer monitor.", true),
                        new OptionData("B", "She is drinking from a coffee cup.", false),
                        new OptionData("C", "She is writing on a whiteboard.", false),
                        new OptionData("D", "She is walking out of the room.", false)
                ));

        // Câu 2
        createQuestionWithOptions(item, null,
                "Look at the picture. What is the current arrangement in the office?",
                "Tài liệu và máy tính đang được sắp xếp trải trên bàn họp.",
                2,
                List.of(
                        new OptionData("A", "The chairs are stacked in the corner.", false),
                        new OptionData("B", "Documents are spread across the conference table.", true),
                        new OptionData("C", "A projector is being repaired.", false),
                        new OptionData("D", "The meeting participants are leaving.", false)
                ));
        return 2;
    }

    private int seedPart2(ContentItem item, int seedIdx) {
        createQuestionWithOptions(item, null,
                "When is the annual marketing conference scheduled to begin?",
                "Hỏi 'When' (khi nào) nên câu trả lời chỉ thời gian 'Next Monday at nine' là chính xác.",
                1,
                List.of(
                        new OptionData("A", "Next Monday at nine in the morning.", true),
                        new OptionData("B", "In the main auditorium on the second floor.", false),
                        new OptionData("C", "Yes, I attended it last year.", false)
                ));

        createQuestionWithOptions(item, null,
                "Who approved the travel reimbursement request?",
                "Hỏi 'Who' (ai) nên chọn câu trả lời chỉ người 'Ms. Tanaka'.",
                2,
                List.of(
                        new OptionData("A", "The flight was delayed by two hours.", false),
                        new OptionData("B", "Ms. Tanaka from the accounting department.", true),
                        new OptionData("C", "To visit our branch office in Singapore.", false)
                ));
        return 2;
    }

    private int seedPart3(ContentItem item, int seedIdx) {
        Passage passage = Passage.builder()
                .contentItem(item)
                .transcriptHtml("<p><strong>Man:</strong> Hi Sarah, have you reviewed the vendor proposals for our new office furniture?</p><p><strong>Woman:</strong> Yes, Mr. Gomez. I think Modern Office Solutions offers the best balance between ergonomic quality and warranty support.</p><p><strong>Man:</strong> That sounds promising. Could you prepare a cost comparison chart before our budget meeting on Thursday?</p><p><strong>Woman:</strong> Certainly, I'll send it to your inbox by tomorrow afternoon.</p>")
                .orderIndex(1)
                .status("ACTIVE")
                .build();
        passage = passageRepository.save(passage);

        createQuestionWithOptions(item, passage,
                "What are the speakers mainly discussing?",
                "Hai người đang bàn về việc chọn nhà cung cấp nội thất văn phòng (office furniture).",
                1,
                List.of(
                        new OptionData("A", "Scheduling an annual performance review", false),
                        new OptionData("B", "Purchasing furniture for an office", true),
                        new OptionData("C", "Planning a relocation to a new city", false),
                        new OptionData("D", "Designing a marketing brochure", false)
                ));

        createQuestionWithOptions(item, passage,
                "What will the woman do by tomorrow afternoon?",
                "Người phụ nữ khẳng định: 'I'll send it to your inbox by tomorrow afternoon' để gửi biểu đồ so sánh chi phí.",
                2,
                List.of(
                        new OptionData("A", "Email a cost comparison chart", true),
                        new OptionData("B", "Order sample chairs", false),
                        new OptionData("C", "Call the customer support line", false),
                        new OptionData("D", "Host a budget presentation", false)
                ));
        return 2;
    }

    private int seedPart4(ContentItem item, int seedIdx) {
        Passage passage = Passage.builder()
                .contentItem(item)
                .transcriptHtml("<p><strong>Speaker:</strong> Good morning, passengers on Flight 412 bound for Tokyo. We are currently experiencing a brief delay due to routine maintenance inspection on the aircraft. We anticipate boarding will commence at gate B14 in approximately 30 minutes. Refreshment vouchers are available at the service desk for all affected passengers.</p>")
                .orderIndex(1)
                .status("ACTIVE")
                .build();
        passage = passageRepository.save(passage);

        createQuestionWithOptions(item, passage,
                "What is the reason for the flight delay?",
                "Thông báo nêu rõ: 'delay due to routine maintenance inspection'.",
                1,
                List.of(
                        new OptionData("A", "Adverse weather conditions", false),
                        new OptionData("B", "Scheduled maintenance inspection", true),
                        new OptionData("C", "Air traffic congestion", false),
                        new OptionData("D", "Crew member shortages", false)
                ));

        createQuestionWithOptions(item, passage,
                "Where can passengers pick up refreshment vouchers?",
                "Phiếu giải khát được phát tại 'service desk'.",
                2,
                List.of(
                        new OptionData("A", "At gate B14", false),
                        new OptionData("B", "At the airport duty-free shop", false),
                        new OptionData("C", "At the customer service desk", true),
                        new OptionData("D", "From the flight attendants", false)
                ));
        return 2;
    }

    private int seedPart5(ContentItem item, int seedIdx) {
        createQuestionWithOptions(item, null,
                "The marketing director requested that all department managers ______ their quarterly sales projections before Friday.",
                "Cấu trúc giả định thức: S + request/suggest/demand + that + S + V-nguyên thể. Do đó chọn 'submit'.",
                1,
                List.of(
                        new OptionData("A", "submits", false),
                        new OptionData("B", "submit", true),
                        new OptionData("C", "submitted", false),
                        new OptionData("D", "submission", false)
                ));

        createQuestionWithOptions(item, null,
                "Due to unprecedented demand, the delivery of your customized equipment may be ______ delayed.",
                "Cần một phó từ (Adverb) bổ nghĩa cho quá khứ phân từ 'delayed'. Chọn 'slightly'.",
                2,
                List.of(
                        new OptionData("A", "slightly", true),
                        new OptionData("B", "slight", false),
                        new OptionData("C", "slightness", false),
                        new OptionData("D", "slighted", false)
                ));

        createQuestionWithOptions(item, null,
                "Employees ______ intend to participate in the international conference must submit an approval form.",
                "Đại từ quan hệ làm chủ ngữ chỉ người cho 'Employees' là 'who'.",
                3,
                List.of(
                        new OptionData("A", "which", false),
                        new OptionData("B", "who", true),
                        new OptionData("C", "whom", false),
                        new OptionData("D", "whose", false)
                ));
        return 3;
    }

    private int seedPart6(ContentItem item, int seedIdx) {
        Passage passage = Passage.builder()
                .contentItem(item)
                .passageHtml("<p><strong>Dear Valued Customer,</strong></p><p>Thank you for choosing Horizon Telecom for your high-speed internet service. We are pleased to announce that system upgrades will take place this weekend. The upgraded infrastructure will [1] ______ higher bandwidth and reliable connectivity for all subscribers. If you experience any disruptions, please do not hesitate to contact our technical team.</p>")
                .orderIndex(1)
                .status("ACTIVE")
                .build();
        passage = passageRepository.save(passage);

        createQuestionWithOptions(item, passage,
                "Choose the word that best completes gap [1]:",
                "Hạ tầng được nâng cấp sẽ 'cung cấp' (provide) băng thông cao hơn.",
                1,
                List.of(
                        new OptionData("A", "provide", true),
                        new OptionData("B", "prevent", false),
                        new OptionData("C", "postpone", false),
                        new OptionData("D", "prohibit", false)
                ));
        return 1;
    }

    private int seedPart7(ContentItem item, int seedIdx) {
        Passage passage = Passage.builder()
                .contentItem(item)
                .passageHtml("<p><strong>NOTICE TO ALL RESIDENTS OF PARKVIEW APARTMENTS</strong></p><p>Effective November 1st, maintenance work will be performed on the main water supply pipeline. Water service will be temporarily shut off between 10:00 AM and 2:00 PM on Tuesday and Thursday.</p><p>Residents are advised to store sufficient water for essential needs during these hours. For urgent inquiries, please contact the building superintendent at 555-0199.</p>")
                .orderIndex(1)
                .status("ACTIVE")
                .build();
        passage = passageRepository.save(passage);

        createQuestionWithOptions(item, passage,
                "What is the primary purpose of the notice?",
                "Thông báo gửi cư dân về việc tạm ngắt dịch vụ cấp nước để bảo trì đường ống.",
                1,
                List.of(
                        new OptionData("A", "To announce changes in rental rates", false),
                        new OptionData("B", "To inform residents of temporary water disruption", true),
                        new OptionData("C", "To invite tenants to an annual meeting", false),
                        new OptionData("D", "To recruit maintenance staff", false)
                ));

        createQuestionWithOptions(item, passage,
                "What should residents do during the maintenance period?",
                "Đoạn văn ghi rõ: 'Residents are advised to store sufficient water for essential needs'.",
                2,
                List.of(
                        new OptionData("A", "Vacate their apartments", false),
                        new OptionData("B", "Store adequate water for essential needs", true),
                        new OptionData("C", "Pay outstanding utility bills", false),
                        new OptionData("D", "Inspect the plumbing pipes", false)
                ));
        return 2;
    }

    private void createQuestionWithOptions(ContentItem item, Passage passage, String prompt, String explanation, int orderIdx, List<OptionData> options) {
        Question q = Question.builder()
                .contentItem(item)
                .passage(passage)
                .questionKind("MULTIPLE_CHOICE")
                .promptText(prompt)
                .explanation(explanation)
                .orderIndex(orderIdx)
                .status("ACTIVE")
                .build();
        q = questionRepository.save(q);

        for (OptionData opt : options) {
            AnswerOption ao = AnswerOption.builder()
                    .question(q)
                    .label(opt.label)
                    .content(opt.content)
                    .isCorrect(opt.isCorrect)
                    .build();
            answerOptionRepository.save(ao);
        }
    }

    private record OptionData(String label, String content, boolean isCorrect) {}
}
