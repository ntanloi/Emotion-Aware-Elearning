package com.elearning.emotion.service;

import com.elearning.emotion.dto.PassageDto;
import com.elearning.emotion.dto.QuestionDto;
import com.elearning.emotion.dto.test.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeacherTestBuilderService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ContentItemRepository contentItemRepository;
    private final ToeicTestRepository toeicTestRepository;
    private final ToeicTestPartRepository toeicTestPartRepository;
    private final QuestionRepository questionRepository;
    private final PassageRepository passageRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final TextAnswerRepository textAnswerRepository;
    private final MatchingPairRepository matchingPairRepository;
    private final WordChoicePairRepository wordChoicePairRepository;
    private final DragDropOptionRepository dragDropOptionRepository;
    private final QuestionService questionService;
    private final CourseAccessService courseAccessService;

    /**
     * Tạo mới một đề thi tùy chỉnh (DRAFT) với các Part do giáo viên lựa chọn
     */
    @Transactional
    public ToeicTestDto createCustomTest(String teacherId, ToeicTestCreateCustomRequest req) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + teacherId));

        List<Integer> parts = req.selectedParts().stream()
                .distinct()
                .filter(p -> p >= 1 && p <= 7)
                .sorted()
                .toList();

        if (parts.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất một phần thi (Part 1 - 7)");
        }

        boolean isAdmin = courseAccessService.isAdmin(teacherId);

        // Chống trùng lặp tiêu đề đang chờ duyệt hoặc đã xuất bản
        List<String> activeStatuses = List.of("PENDING_REVIEW", "PUBLISHED");
        if (toeicTestRepository.existsByAuthorIdAndTitleIgnoreCaseAndStatusIn(teacherId, req.title().trim(), activeStatuses)) {
            throw new IllegalArgumentException("Bạn đã có đề thi mang tiêu đề \"" + req.title().trim() + "\" đang chờ duyệt hoặc đã xuất bản. Vui lòng đổi tiêu đề khác.");
        }

        // Tìm hoặc tạo kho chứa đề thi ẩn (profile = 'EXAM')
        Course containerCourse = courseRepository.findFirstByTeacherIdAndProfile(teacherId, "EXAM")
                .orElseGet(() -> {
                    Course c = Course.builder()
                            .teacher(teacher)
                            .title("Kho chứa đề TOEIC - " + teacher.getFullName())
                            .description("Khóa chứa đề ẩn lưu trữ bản sao đề thi công khai")
                            .profile("EXAM")
                            .status("PUBLISHED")
                            .build();
                    return courseRepository.save(c);
                });

        String source = isAdmin ? "SYSTEM" : "COMMUNITY";
        ToeicTest test = ToeicTest.builder()
                .source(source)
                .author(teacher)
                .course(containerCourse)
                .title(req.title().trim())
                .description(req.description())
                .status("DRAFT")
                .version(1)
                .listeningMinutes(req.listeningMinutes() != null ? req.listeningMinutes() : 45)
                .readingMinutes(req.readingMinutes() != null ? req.readingMinutes() : 75)
                .attemptCount(0)
                .build();
        test = toeicTestRepository.save(test);

        List<ToeicTestPart> savedParts = new ArrayList<>();
        for (Integer partNo : parts) {
            ContentItem partItem = ContentItem.builder()
                    .course(containerCourse)
                    .sectionCode("PART" + partNo)
                    .type("PRACTICE_TEST")
                    .title(req.title().trim() + " - Part " + partNo)
                    .orderIndex(partNo)
                    .timeLimitMinutes(0)
                    .build();
            partItem = contentItemRepository.save(partItem);

            ToeicTestPart testPart = ToeicTestPart.builder()
                    .test(test)
                    .partNo(partNo)
                    .contentItem(partItem)
                    .questionCount(0)
                    .build();
            savedParts.add(toeicTestPartRepository.save(testPart));
        }

        return ToeicTestDto.from(test, savedParts);
    }

    /**
     * Lấy toàn bộ nội dung chi tiết của đề thi phục vụ trang soạn đề (Builder)
     */
    @Transactional
    public TeacherTestBuilderDto getTestBuilderDetail(String teacherId, String testId) {
        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        if (!test.getAuthor().getId().equals(teacherId) && !courseAccessService.isAdmin(teacherId)) {
            throw new SecurityException("Bạn không có quyền chỉnh sửa đề thi này");
        }

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(test.getId());
        List<TeacherTestPartDetailDto> partDetails = new ArrayList<>();

        for (ToeicTestPart part : parts) {
            ContentItem item = part.getContentItem();
            List<Question> questions = questionRepository.findByContentItemIdWithMedia(item.getId()).stream()
                    .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                    .toList();

            List<Passage> passages = passageRepository.findByContentItemIdWithMedia(item.getId()).stream()
                    .filter(p -> p.getStatus() == null || "ACTIVE".equalsIgnoreCase(p.getStatus()))
                    .toList();

            // Đồng bộ lại questionCount nếu có chênh lệch
            if (part.getQuestionCount() == null || part.getQuestionCount() != questions.size()) {
                part.setQuestionCount(questions.size());
                toeicTestPartRepository.save(part);
            }

            List<QuestionDto> questionDtos = questionService.toTeacherDtos(questions);
            List<PassageDto> passageDtos = passages.stream().map(PassageDto::from).toList();

            partDetails.add(new TeacherTestPartDetailDto(
                    part.getPartNo(),
                    item.getId(),
                    questions.size(),
                    passageDtos,
                    questionDtos
            ));
        }

        return new TeacherTestBuilderDto(ToeicTestDto.from(test, parts), partDetails);
    }

    /**
     * Thêm (Import) danh sách câu hỏi từ ngân hàng cá nhân vào 1 Part của đề thi
     */
    @Transactional
    public TeacherTestPartDetailDto importQuestionsFromBank(String teacherId, String testId, int partNo, BankImportRequest req) {
        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        if (!test.getAuthor().getId().equals(teacherId) && !courseAccessService.isAdmin(teacherId)) {
            throw new SecurityException("Bạn không có quyền chỉnh sửa đề thi này");
        }

        if (!"DRAFT".equalsIgnoreCase(test.getStatus()) && !"REJECTED".equalsIgnoreCase(test.getStatus())) {
            throw new IllegalStateException("Chỉ có thể chỉnh sửa câu hỏi của đề thi ở trạng thái Nháp hoặc Bị từ chối");
        }

        ToeicTestPart part = toeicTestPartRepository.findByTestIdAndPartNo(testId, partNo)
                .orElseThrow(() -> new IllegalArgumentException("Phần thi Part " + partNo + " không tồn tại trong đề thi này"));

        ContentItem destItem = part.getContentItem();

        // Tải các passages đã có trong destItem để tái sử dụng nếu cần
        List<Passage> existingPassages = new ArrayList<>(passageRepository.findByContentItemIdWithMedia(destItem.getId()));
        Map<String, Passage> passageMapBySourceId = new HashMap<>();

        for (String qId : req.questionIds()) {
            Question sourceQ = questionRepository.findById(qId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + qId));

            // Kiểm tra quyền sở hữu đối với câu hỏi nguồn
            Course sourceCourse = sourceQ.getContentItem().getCourse();
            if (!sourceCourse.getTeacher().getId().equals(teacherId) && !courseAccessService.isAdmin(teacherId)) {
                throw new SecurityException("Bạn không có quyền sao chép câu hỏi này");
            }

            // Xử lý bài đọc (Passage) nếu có
            Passage destPassage = null;
            if (sourceQ.getPassage() != null) {
                Passage sourceP = sourceQ.getPassage();
                if (passageMapBySourceId.containsKey(sourceP.getId())) {
                    destPassage = passageMapBySourceId.get(sourceP.getId());
                } else {
                    // Tìm xem trong existingPassages đã có passage tương tự chưa (cùng orderIndex/transcript)
                    Optional<Passage> matched = existingPassages.stream()
                            .filter(ep -> Objects.equals(ep.getTranscriptHtml(), sourceP.getTranscriptHtml())
                                    && Objects.equals(ep.getPassageHtml(), sourceP.getPassageHtml()))
                            .findFirst();

                    if (matched.isPresent()) {
                        destPassage = matched.get();
                    } else {
                        Passage clonedP = Passage.builder()
                                .contentItem(destItem)
                                .transcriptHtml(sourceP.getTranscriptHtml())
                                .passageHtml(sourceP.getPassageHtml())
                                .audio(sourceP.getAudio())
                                .image(sourceP.getImage())
                                .orderIndex(sourceP.getOrderIndex())
                                .status("ACTIVE")
                                .build();
                        destPassage = passageRepository.save(clonedP);
                        existingPassages.add(destPassage);
                    }
                    passageMapBySourceId.put(sourceP.getId(), destPassage);
                }
            }

            // Sao chép câu hỏi
            Question clonedQ = Question.builder()
                    .contentItem(destItem)
                    .passage(destPassage)
                    .promptText(sourceQ.getPromptText())
                    .questionKind(sourceQ.getQuestionKind())
                    .explanation(sourceQ.getExplanation())
                    .orderIndex(sourceQ.getOrderIndex())
                    .tag(sourceQ.getTag())
                    .audio(sourceQ.getAudio())
                    .image(sourceQ.getImage())
                    .status("ACTIVE")
                    .build();
            clonedQ = questionRepository.save(clonedQ);

            // Sao chép đáp án tùy theo dạng câu hỏi
            cloneAnswersForQuestion(sourceQ, clonedQ);
        }

        // Cập nhật số lượng câu hỏi của part
        List<Question> updatedQuestions = questionRepository.findByContentItemIdWithMedia(destItem.getId()).stream()
                .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                .toList();

        part.setQuestionCount(updatedQuestions.size());
        toeicTestPartRepository.save(part);

        List<Passage> updatedPassages = passageRepository.findByContentItemIdWithMedia(destItem.getId()).stream()
                .filter(p -> p.getStatus() == null || "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .toList();

        return new TeacherTestPartDetailDto(
                part.getPartNo(),
                destItem.getId(),
                updatedQuestions.size(),
                updatedPassages.stream().map(PassageDto::from).toList(),
                questionService.toTeacherDtos(updatedQuestions)
        );
    }

    /**
     * Xóa 1 câu hỏi khỏi đề thi
     */
    @Transactional
    public void removeQuestionFromTest(String teacherId, String testId, String questionId) {
        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        if (!test.getAuthor().getId().equals(teacherId) && !courseAccessService.isAdmin(teacherId)) {
            throw new SecurityException("Bạn không có quyền chỉnh sửa đề thi này");
        }

        if (!"DRAFT".equalsIgnoreCase(test.getStatus()) && !"REJECTED".equalsIgnoreCase(test.getStatus())) {
            throw new IllegalStateException("Chỉ có thể xóa câu hỏi ở trạng thái Nháp hoặc Bị từ chối");
        }

        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + questionId));

        String itemId = q.getContentItem().getId();
        questionService.delete(teacherId, questionId);

        // Cập nhật lại questionCount trong part tương ứng
        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(testId);
        for (ToeicTestPart p : parts) {
            if (p.getContentItem().getId().equals(itemId)) {
                int count = (int) questionRepository.findByContentItemIdWithMedia(itemId).stream()
                        .filter(itemQ -> itemQ.getStatus() == null || "ACTIVE".equalsIgnoreCase(itemQ.getStatus()))
                        .count();
                p.setQuestionCount(count);
                toeicTestPartRepository.save(p);
                break;
            }
        }
    }

    /**
     * Xóa đề thi nháp (DRAFT hoặc REJECTED)
     */
    @Transactional
    public void deleteDraftTest(String teacherId, String testId) {
        ToeicTest test = toeicTestRepository.findById(testId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đề thi: " + testId));

        if (!test.getAuthor().getId().equals(teacherId) && !courseAccessService.isAdmin(teacherId)) {
            throw new SecurityException("Bạn không có quyền xóa đề thi này");
        }

        if (!"DRAFT".equalsIgnoreCase(test.getStatus()) && !"REJECTED".equalsIgnoreCase(test.getStatus())) {
            throw new IllegalStateException("Chỉ có thể xóa đề thi ở trạng thái Bản nháp hoặc Bị từ chối");
        }

        List<ToeicTestPart> parts = toeicTestPartRepository.findByTestIdOrderByPartNoAsc(testId);
        List<ContentItem> itemsToDelete = parts.stream().map(ToeicTestPart::getContentItem).toList();

        // Xóa các câu hỏi & đoạn văn thuộc các part
        for (ContentItem item : itemsToDelete) {
            List<Question> questions = questionRepository.findByContentItemIdWithMedia(item.getId());
            for (Question q : questions) {
                questionService.delete(teacherId, q.getId());
            }
            List<Passage> passages = passageRepository.findByContentItemIdWithMedia(item.getId());
            passageRepository.deleteAll(passages);
        }

        toeicTestPartRepository.deleteByTestId(testId);
        toeicTestRepository.delete(test);
        contentItemRepository.deleteAll(itemsToDelete);
    }

    private void cloneAnswersForQuestion(Question sourceQ, Question clonedQ) {
        if ("MULTIPLE_CHOICE".equalsIgnoreCase(sourceQ.getQuestionKind())) {
            List<AnswerOption> origOptions = answerOptionRepository.findByQuestionIdOrderByLabelAsc(sourceQ.getId());
            for (AnswerOption o : origOptions) {
                answerOptionRepository.save(AnswerOption.builder()
                        .question(clonedQ)
                        .label(o.getLabel())
                        .content(o.getContent())
                        .isCorrect(o.getIsCorrect())
                        .build());
            }
        } else if ("FILL_BLANK".equalsIgnoreCase(sourceQ.getQuestionKind()) || "DICTATION".equalsIgnoreCase(sourceQ.getQuestionKind())) {
            textAnswerRepository.findByQuestionId(sourceQ.getId()).ifPresent(ta ->
                    textAnswerRepository.save(TextAnswer.builder()
                            .question(clonedQ)
                            .correctText(ta.getCorrectText())
                            .hint(ta.getHint())
                            .build())
            );
        } else if ("MATCHING".equalsIgnoreCase(sourceQ.getQuestionKind())) {
            List<MatchingPair> pairs = matchingPairRepository.findByQuestionId(sourceQ.getId());
            for (MatchingPair p : pairs) {
                matchingPairRepository.save(MatchingPair.builder()
                        .question(clonedQ)
                        .leftContent(p.getLeftContent())
                        .rightContent(p.getRightContent())
                        .build());
            }
        } else if ("WORD_CHOICE".equalsIgnoreCase(sourceQ.getQuestionKind()) || "SENTENCE_FILL".equalsIgnoreCase(sourceQ.getQuestionKind())) {
            List<WordChoicePair> wcp = wordChoicePairRepository.findByQuestionIdOrderByOrderIndex(sourceQ.getId());
            for (WordChoicePair pair : wcp) {
                wordChoicePairRepository.save(WordChoicePair.builder()
                        .question(clonedQ)
                        .optionA(pair.getOptionA())
                        .optionB(pair.getOptionB())
                        .correctOption(pair.getCorrectOption())
                        .orderIndex(pair.getOrderIndex())
                        .build());
            }
        } else if ("DRAG_DROP".equalsIgnoreCase(sourceQ.getQuestionKind())) {
            List<DragDropOption> ddo = dragDropOptionRepository.findByQuestionIdOrderByDisplayOrder(sourceQ.getId());
            for (DragDropOption d : ddo) {
                dragDropOptionRepository.save(DragDropOption.builder()
                        .question(clonedQ)
                        .text(d.getText())
                        .blankOrder(d.getBlankOrder())
                        .displayOrder(d.getDisplayOrder())
                        .build());
            }
        }
    }
}
