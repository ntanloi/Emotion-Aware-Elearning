package com.elearning.emotion.service;

import com.elearning.emotion.dto.PassageDto;
import com.elearning.emotion.dto.QuestionDto;
import com.elearning.emotion.dto.test.BankImportRequest;
import com.elearning.emotion.dto.test.TeacherBankPartDto;
import com.elearning.emotion.dto.test.TeacherBankSummaryDto;
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
public class TeacherQuestionBankService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final ContentItemRepository contentItemRepository;
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
     * Tìm hoặc khởi tạo kho ngân hàng câu hỏi ẩn của Giảng viên (profile = 'BANK')
     */
    @Transactional
    public Course getOrCreateBankCourse(User teacher) {
        return courseRepository.findFirstByTeacherIdAndProfile(teacher.getId(), "BANK")
                .orElseGet(() -> {
                    Course c = Course.builder()
                            .teacher(teacher)
                            .title("Ngân hàng câu hỏi - " + teacher.getFullName())
                            .description("Kho lưu trữ câu hỏi cá nhân của giảng viên")
                            .profile("BANK")
                            .status("DRAFT")
                            .build();
                    return courseRepository.save(c);
                });
    }

    /**
     * Tìm hoặc khởi tạo ContentItem cho Part cụ thể trong ngân hàng câu hỏi
     */
    @Transactional
    public ContentItem getOrCreateBankItemForPart(Course bankCourse, int partNo) {
        String sectionCode = "PART" + partNo;
        List<ContentItem> items = contentItemRepository.findByCourseIdAndSectionCodeOrderByOrderIndex(bankCourse.getId(), sectionCode);
        if (!items.isEmpty()) {
            return items.get(0);
        }

        ContentItem newItem = ContentItem.builder()
                .course(bankCourse)
                .sectionCode(sectionCode)
                .title("Ngân hàng Part " + partNo)
                .type("PRACTICE_TEST")
                .orderIndex(partNo)
                .timeLimitMinutes(0)
                .build();
        return contentItemRepository.save(newItem);
    }

    /**
     * Lấy danh sách câu hỏi và bài đọc của 1 Part trong ngân hàng của giảng viên
     */
    @Transactional
    public TeacherBankPartDto getBankPart(String teacherId, int partNo) {
        if (partNo < 1 || partNo > 7) {
            throw new IllegalArgumentException("Phần thi không hợp lệ: Part " + partNo);
        }

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + teacherId));

        Course bankCourse = getOrCreateBankCourse(teacher);
        ContentItem bankItem = getOrCreateBankItemForPart(bankCourse, partNo);

        List<Question> questions = questionRepository.findByContentItemIdWithMedia(bankItem.getId()).stream()
                .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                .toList();

        List<Passage> passages = passageRepository.findByContentItemIdWithMedia(bankItem.getId()).stream()
                .filter(p -> p.getStatus() == null || "ACTIVE".equalsIgnoreCase(p.getStatus()))
                .toList();

        List<QuestionDto> questionDtos = questionService.toTeacherDtos(questions);
        List<PassageDto> passageDtos = passages.stream().map(PassageDto::from).toList();

        return new TeacherBankPartDto(
                partNo,
                bankItem.getId(),
                questions.size(),
                passageDtos,
                questionDtos
        );
    }

    /**
     * Thống kê tổng quan số lượng câu hỏi từng Part trong ngân hàng của giảng viên
     */
    @Transactional
    public TeacherBankSummaryDto getBankSummary(String teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + teacherId));

        Course bankCourse = getOrCreateBankCourse(teacher);
        Map<Integer, Integer> countByPart = new HashMap<>();
        int total = 0;

        for (int partNo = 1; partNo <= 7; partNo++) {
            ContentItem bankItem = getOrCreateBankItemForPart(bankCourse, partNo);
            int count = (int) questionRepository.findByContentItemIdWithMedia(bankItem.getId()).stream()
                    .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                    .count();
            countByPart.put(partNo, count);
            total += count;
        }

        return new TeacherBankSummaryDto(countByPart, total);
    }

    /**
     * Xóa 1 câu hỏi khỏi ngân hàng của giảng viên
     */
    @Transactional
    public void deleteQuestionFromBank(String teacherId, String questionId) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + questionId));

        Course course = q.getContentItem().getCourse();
        boolean isOwner = course.getTeacher() != null && course.getTeacher().getId().equals(teacherId);
        boolean isAdmin = courseAccessService.isAdmin(teacherId);

        if (!isOwner && !isAdmin) {
            throw new SecurityException("Bạn không có quyền xóa câu hỏi này");
        }

        if (!"BANK".equalsIgnoreCase(course.getProfile())) {
            throw new IllegalArgumentException("Câu hỏi này không thuộc ngân hàng câu hỏi");
        }

        questionService.delete(teacherId, questionId);
    }

    /**
     * Lấy danh sách câu hỏi của một khóa học thuộc Part chỉ định để giáo viên chọn thêm vào ngân hàng
     */
    @Transactional(readOnly = true)
    public List<QuestionDto> getCandidateQuestionsFromCourse(String teacherId, int partNo, String courseId) {
        if (partNo < 1 || partNo > 7) {
            throw new IllegalArgumentException("Phần thi không hợp lệ: Part " + partNo);
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học: " + courseId));

        boolean isOwner = course.getTeacher() != null && course.getTeacher().getId().equals(teacherId);
        boolean isAdmin = courseAccessService.isAdmin(teacherId);

        if (!isOwner && !isAdmin) {
            throw new SecurityException("Bạn không có quyền truy cập khóa học này");
        }

        String sectionCode = "PART" + partNo;
        List<ContentItem> items = contentItemRepository.findByCourseId(courseId).stream()
                .filter(ci -> sectionCode.equalsIgnoreCase(ci.getSectionCode())
                        || ("PRACTICE_TEST".equalsIgnoreCase(ci.getType()) && ci.getSectionCode() != null && ci.getSectionCode().toUpperCase().contains(sectionCode)))
                .toList();

        if (items.isEmpty()) {
            return List.of();
        }

        List<String> itemIds = items.stream().map(ContentItem::getId).toList();
        List<Question> questions = questionRepository.findByContentItemIdInWithMedia(itemIds).stream()
                .filter(q -> q.getStatus() == null || "ACTIVE".equalsIgnoreCase(q.getStatus()))
                .toList();

        return questionService.toTeacherDtos(questions);
    }

    /**
     * Thêm (sao chép) câu hỏi từ khóa học của giáo viên vào Ngân hàng câu hỏi
     */
    @Transactional
    public TeacherBankPartDto importQuestionsFromCourse(String teacherId, int partNo, BankImportRequest req) {
        if (partNo < 1 || partNo > 7) {
            throw new IllegalArgumentException("Phần thi không hợp lệ: Part " + partNo);
        }

        if (req.questionIds() == null || req.questionIds().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất một câu hỏi để thêm vào ngân hàng");
        }

        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + teacherId));

        Course bankCourse = getOrCreateBankCourse(teacher);
        ContentItem bankItem = getOrCreateBankItemForPart(bankCourse, partNo);

        // Tải các passages đã có trong bankItem để tái sử dụng nếu câu hỏi trỏ vào cùng một đoạn văn
        List<Passage> existingPassages = new ArrayList<>(passageRepository.findByContentItemIdWithMedia(bankItem.getId()));
        Map<String, Passage> passageMapBySourceId = new HashMap<>();

        for (String qId : req.questionIds()) {
            Question sourceQ = questionRepository.findById(qId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy câu hỏi: " + qId));

            // Kiểm tra quyền sở hữu
            Course sourceCourse = sourceQ.getContentItem().getCourse();
            boolean isOwner = sourceCourse.getTeacher() != null && sourceCourse.getTeacher().getId().equals(teacherId);
            boolean isAdmin = courseAccessService.isAdmin(teacherId);

            if (!isOwner && !isAdmin) {
                throw new SecurityException("Bạn không có quyền sao chép câu hỏi này");
            }

            // Xử lý bài đọc nếu có
            Passage destPassage = null;
            if (sourceQ.getPassage() != null) {
                Passage sourceP = sourceQ.getPassage();
                if (passageMapBySourceId.containsKey(sourceP.getId())) {
                    destPassage = passageMapBySourceId.get(sourceP.getId());
                } else {
                    Optional<Passage> matched = existingPassages.stream()
                            .filter(ep -> Objects.equals(ep.getTranscriptHtml(), sourceP.getTranscriptHtml())
                                    && Objects.equals(ep.getPassageHtml(), sourceP.getPassageHtml()))
                            .findFirst();

                    if (matched.isPresent()) {
                        destPassage = matched.get();
                    } else {
                        Passage clonedP = Passage.builder()
                                .contentItem(bankItem)
                                .transcriptHtml(sourceP.getTranscriptHtml())
                                .passageHtml(sourceP.getPassageHtml())
                                .audio(sourceP.getAudio()) // Tái sử dụng MediaAsset
                                .image(sourceP.getImage()) // Tái sử dụng MediaAsset
                                .orderIndex(sourceP.getOrderIndex())
                                .status("ACTIVE")
                                .build();
                        destPassage = passageRepository.save(clonedP);
                        existingPassages.add(destPassage);
                    }
                    passageMapBySourceId.put(sourceP.getId(), destPassage);
                }
            }

            // Sao chép câu hỏi vào bankItem
            Question clonedQ = Question.builder()
                    .contentItem(bankItem)
                    .passage(destPassage)
                    .promptText(sourceQ.getPromptText())
                    .questionKind(sourceQ.getQuestionKind())
                    .explanation(sourceQ.getExplanation())
                    .orderIndex(sourceQ.getOrderIndex())
                    .tag(sourceQ.getTag())
                    .audio(sourceQ.getAudio()) // Tái sử dụng MediaAsset
                    .image(sourceQ.getImage()) // Tái sử dụng MediaAsset
                    .status("ACTIVE")
                    .build();
            clonedQ = questionRepository.save(clonedQ);

            // Sao chép các đáp án tương ứng
            cloneAnswersForQuestion(sourceQ, clonedQ);
        }

        return getBankPart(teacherId, partNo);
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
