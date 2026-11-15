package com.elearning.emotion.service;

import com.elearning.emotion.dto.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service tính toán và cập nhật tiến độ học tập phân cấp toàn diện:
 * Level 0: ContentItem (Video xem >= 80%, Luyện tập 1/N mỗi câu duy nhất theo question_id, Từ vựng xem hết flashcard)
 * Level 1: ContentGroup (Trung bình cộng các hoạt động con trong nhóm)
 * Level 2: Section / Part (Trung bình cộng các nhóm trong Part, loại trừ các Section trống)
 * Level 3: Course / Enrollment (Trung bình cộng các Section có nội dung trong khóa học)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProgressService {

    private final EnrollmentRepository enrollmentRepository;
    private final ContentItemRepository contentItemRepository;
    private final ContentGroupRepository contentGroupRepository;
    private final CourseRepository courseRepository;
    private final CourseCustomSectionRepository courseCustomSectionRepository;
    private final ContentItemProgressRepository contentItemProgressRepository;
    private final AttemptAnswerRepository attemptAnswerRepository;
    private final QuestionRepository questionRepository;
    private final CourseAccessService courseAccessService;
    private final UserRepository userRepository;
    private final AttemptRepository attemptRepository;
    private final AnswerOptionRepository answerOptionRepository;

    private static final List<String> FIXED_SECTION_CODES = List.of(
            "VOCAB", "GRAMMAR", "PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7", "DICTATION"
    );

    @Transactional
    public CourseProgressDto getCourseProgressTree(String userId, String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học: " + courseId));
        courseAccessService.validateCanLearn(userId, course);

        List<ContentItem> allItems = contentItemRepository.findByCourseId(courseId);
        List<ContentGroup> allGroups = contentGroupRepository.findByCourseIdOrderBySectionCodeAscOrderIndexAsc(courseId);
        List<CourseCustomSection> customSections = courseCustomSectionRepository.findByCourseIdOrderByOrderIndex(courseId);

        Set<String> itemIds = allItems.stream().map(ContentItem::getId).collect(Collectors.toSet());

        // Tải trước dữ liệu tiến độ để tối ưu hóa truy vấn
        Map<String, ContentItemProgress> progressMap = new HashMap<>();
        Map<String, Integer> answeredQuestionsMap = new HashMap<>();
        Map<String, Integer> totalQuestionsMap = new HashMap<>();

        if (!itemIds.isEmpty()) {
            List<ContentItemProgress> progressList = contentItemProgressRepository.findByUserIdAndContentItemIdIn(userId, itemIds);
            for (ContentItemProgress p : progressList) {
                progressMap.put(p.getContentItem().getId() + "#" + p.getPracticeType(), p);
            }

            List<Object[]> answeredCounts = attemptAnswerRepository.countDistinctQuestionsAnsweredByUserAndItemIds(userId, itemIds);
            for (Object[] row : answeredCounts) {
                if (row.length >= 2 && row[0] != null && row[1] != null) {
                    answeredQuestionsMap.put((String) row[0], ((Number) row[1]).intValue());
                }
            }

            List<Object[]> activeCounts = questionRepository.countActiveQuestionsByItemIds(itemIds);
            for (Object[] row : activeCounts) {
                if (row.length >= 2 && row[0] != null && row[1] != null) {
                    totalQuestionsMap.put((String) row[0], ((Number) row[1]).intValue());
                }
            }
        }

        // 1. Tính Level 0: ItemProgressDto
        Map<String, ItemProgressDto> itemProgressDtos = new HashMap<>();
        for (ContentItem item : allItems) {
            ItemProgressDto dto = computeItemProgress(item, progressMap, answeredQuestionsMap, totalQuestionsMap);
            itemProgressDtos.put(item.getId(), dto);
        }

        // Nhóm các items theo groupId
        Map<String, List<ContentItem>> itemsByGroupId = allItems.stream()
                .filter(it -> it.getGroup() != null)
                .collect(Collectors.groupingBy(it -> it.getGroup().getId()));

        // 2. Tính Level 1: GroupProgressDto
        Map<String, GroupProgressDto> groupProgressDtos = new HashMap<>();
        for (ContentGroup group : allGroups) {
            List<ContentItem> childItems = itemsByGroupId.getOrDefault(group.getId(), Collections.emptyList());
            int totalChildItems = childItems.size();
            if (totalChildItems == 0) {
                groupProgressDtos.put(group.getId(), new GroupProgressDto(group.getId(), 0.0f, false, 0, 0));
            } else {
                float sum = 0f;
                int completedCount = 0;
                for (ContentItem ci : childItems) {
                    ItemProgressDto ip = itemProgressDtos.get(ci.getId());
                    if (ip != null) {
                        sum += ip.progressPercent();
                        if (ip.isCompleted()) completedCount++;
                    }
                }
                float groupPct = Math.round((sum / totalChildItems) * 10f) / 10f;
                boolean isCompleted = completedCount == totalChildItems || groupPct >= 99.99f;
                groupProgressDtos.put(group.getId(), new GroupProgressDto(
                        group.getId(), groupPct, isCompleted, totalChildItems, completedCount
                ));
            }
        }

        // Phân loại nhóm và item ungrouped theo sectionCode
        Map<String, List<ContentGroup>> groupsBySection = allGroups.stream()
                .collect(Collectors.groupingBy(ContentGroup::getSectionCode));

        Map<String, List<ContentItem>> ungroupedBySection = allItems.stream()
                .filter(it -> it.getGroup() == null)
                .collect(Collectors.groupingBy(ContentItem::getSectionCode));

        // Gom danh sách toàn bộ sectionCodes của khóa học (10 mục cố định + mục tùy chỉnh)
        List<String> allSectionCodes = new ArrayList<>(FIXED_SECTION_CODES);
        for (CourseCustomSection cs : customSections) {
            String code = cs.getSectionCode() != null ? cs.getSectionCode() : ("CUSTOM_" + cs.getId());
            if (!allSectionCodes.contains(code)) {
                allSectionCodes.add(code);
            }
        }

        // 3. Tính Level 2: SectionProgressDto
        Map<String, SectionProgressDto> sectionProgressDtos = new HashMap<>();
        List<SectionProgressDto> nonEmptySections = new ArrayList<>();

        for (String secCode : allSectionCodes) {
            List<ContentGroup> secGroups = groupsBySection.getOrDefault(secCode, Collections.emptyList());
            List<ContentItem> secUngrouped = ungroupedBySection.getOrDefault(secCode, Collections.emptyList());

            int totalGroups = secGroups.size();
            int totalUngrouped = secUngrouped.size();
            boolean isEmpty = (totalGroups == 0 && totalUngrouped == 0);

            if (isEmpty) {
                SectionProgressDto secDto = new SectionProgressDto(
                        secCode, 0.0f, false, true, 0, 0, 0, 0
                );
                sectionProgressDtos.put(secCode, secDto);
            } else {
                float sumUnit = 0f;
                int totalUnits = totalGroups + totalUngrouped;
                int completedUnits = 0;
                int totalItemsInSec = 0;
                int completedItemsInSec = 0;

                for (ContentGroup g : secGroups) {
                    GroupProgressDto gp = groupProgressDtos.get(g.getId());
                    if (gp != null) {
                        sumUnit += gp.progressPercent();
                        if (gp.isCompleted()) completedUnits++;
                        totalItemsInSec += gp.totalItems();
                        completedItemsInSec += gp.completedItems();
                    }
                }

                for (ContentItem ci : secUngrouped) {
                    ItemProgressDto ip = itemProgressDtos.get(ci.getId());
                    if (ip != null) {
                        sumUnit += ip.progressPercent();
                        if (ip.isCompleted()) completedUnits++;
                        totalItemsInSec++;
                        if (ip.isCompleted()) completedItemsInSec++;
                    }
                }

                float secPct = Math.round((sumUnit / totalUnits) * 10f) / 10f;
                boolean isCompleted = (completedUnits == totalUnits || secPct >= 99.99f);

                SectionProgressDto secDto = new SectionProgressDto(
                        secCode, secPct, isCompleted, false,
                        totalGroups,
                        (int) secGroups.stream().filter(g -> {
                            GroupProgressDto gp = groupProgressDtos.get(g.getId());
                            return gp != null && gp.isCompleted();
                        }).count(),
                        totalItemsInSec,
                        completedItemsInSec
                );
                sectionProgressDtos.put(secCode, secDto);
                nonEmptySections.add(secDto);
            }
        }

        // 4. Tính Level 3: Course Progress (chỉ tính trung bình các Section có nội dung)
        float courseProgress = 0.0f;
        if (!nonEmptySections.isEmpty()) {
            float sumSec = 0f;
            for (SectionProgressDto s : nonEmptySections) {
                sumSec += s.progressPercent();
            }
            courseProgress = Math.round((sumSec / nonEmptySections.size()) * 10f) / 10f;
        }

        // Cập nhật Enrollment.progressPercent
        persistCourseProgress(userId, courseId, courseProgress);

        return new CourseProgressDto(
                courseId,
                courseProgress,
                sectionProgressDtos,
                groupProgressDtos,
                itemProgressDtos
        );
    }

    private ItemProgressDto computeItemProgress(
            ContentItem item,
            Map<String, ContentItemProgress> progressMap,
            Map<String, Integer> answeredQuestionsMap,
            Map<String, Integer> totalQuestionsMap
    ) {
        String type = item.getType();

        // VIDEO_LECTURE: Xem >= 80% (8/10 video) -> 100%
        if ("VIDEO_LECTURE".equals(type)) {
            ContentItemProgress p = progressMap.get(item.getId() + "#DEFAULT");
            if (p != null) {
                if (p.isCompleted()) {
                    return new ItemProgressDto(item.getId(), 100.0f, true, null, null);
                }
                if (p.getBestScore() != null) {
                    float s = p.getBestScore().floatValue();
                    if (s >= 80.0f) {
                        return new ItemProgressDto(item.getId(), 100.0f, true, null, null);
                    }
                    return new ItemProgressDto(item.getId(), Math.round(s * 10f) / 10f, false, null, null);
                }
            }
            return new ItemProgressDto(item.getId(), 0.0f, false, null, null);
        }

        // VOCAB_SET: Xem hết toàn bộ Flashcard trong list -> 100%
        if ("VOCAB_SET".equals(type)) {
            ContentItemProgress p = progressMap.get(item.getId() + "#FLASHCARD");
            if (p != null && p.isCompleted()) {
                return new ItemProgressDto(item.getId(), 100.0f, true, null, null);
            }
            // Fallback nếu có tick DEFAULT hoàn thành
            ContentItemProgress def = progressMap.get(item.getId() + "#DEFAULT");
            if (def != null && def.isCompleted()) {
                return new ItemProgressDto(item.getId(), 100.0f, true, null, null);
            }
            return new ItemProgressDto(item.getId(), 0.0f, false, null, null);
        }

        // GRAMMAR_ARTICLE: Có thể chỉ là bài đọc lý thuyết hoặc có câu hỏi điền từ
        if ("GRAMMAR_ARTICLE".equals(type)) {
            int totalQ = totalQuestionsMap.getOrDefault(item.getId(), 0);
            if (totalQ == 0) {
                ContentItemProgress p = progressMap.get(item.getId() + "#DEFAULT");
                boolean read = p != null && p.isCompleted();
                return new ItemProgressDto(item.getId(), read ? 100.0f : 0.0f, read, 0, 0);
            }
            int answered = answeredQuestionsMap.getOrDefault(item.getId(), 0);
            float pct = Math.min(100.0f, Math.round(((answered * 100.0f) / totalQ) * 10f) / 10f);
            boolean completed = answered >= totalQ;
            return new ItemProgressDto(item.getId(), pct, completed, totalQ, answered);
        }

        // PRACTICE_TEST, DICTATION_SET hoặc các dạng bài tập câu hỏi khác
        int totalQ = totalQuestionsMap.getOrDefault(item.getId(), 0);
        if (totalQ == 0) {
            return new ItemProgressDto(item.getId(), 0.0f, false, 0, 0);
        }

        int answered = answeredQuestionsMap.getOrDefault(item.getId(), 0);
        float pct = Math.min(100.0f, Math.round(((answered * 100.0f) / totalQ) * 10f) / 10f);
        boolean completed = answered >= totalQ;
        return new ItemProgressDto(item.getId(), pct, completed, totalQ, answered);
    }

    /**
     * Ghi nhận tiến độ xem video. Xem >= 80% thời lượng video -> Đánh dấu hoàn thành 100%.
     */
    @Transactional
    public ItemProgressDto recordVideoProgress(String userId, String contentItemId, VideoProgressRequest req) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nội dung: " + contentItemId));
        courseAccessService.validateCanLearn(userId, item.getCourse());
        if (!"VIDEO_LECTURE".equals(item.getType())) {
            throw new IllegalArgumentException("Nội dung không phải bài giảng video");
        }

        double watched = req.watchedSeconds() != null ? req.watchedSeconds() : 0.0;
        double duration = req.durationSeconds() != null ? req.durationSeconds() : 0.0;

        float ratio = 0.0f;
        if (duration > 0) {
            ratio = (float) (watched / duration);
        } else if (watched > 0) {
            ratio = 1.0f;
        }

        boolean isCompleted = (ratio >= 0.80f);
        float scorePercent = Math.min(100.0f, (isCompleted ? 100.0f : (ratio * 100.0f)));

        ContentItemProgress progress = contentItemProgressRepository
                .findByUserIdAndContentItemIdAndPracticeType(userId, item.getId(), "DEFAULT")
                .orElseGet(() -> ContentItemProgress.builder()
                        .user(userRepository.getReferenceById(userId))
                        .contentItem(item)
                        .practiceType("DEFAULT")
                        .build());

        BigDecimal newScore = BigDecimal.valueOf(Math.round(scorePercent * 10.0) / 10.0);
        if (progress.getBestScore() == null || newScore.compareTo(progress.getBestScore()) > 0) {
            progress.setBestScore(newScore);
        }

        if (isCompleted || progress.isCompleted()) {
            progress.setCompleted(true);
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(LocalDateTime.now());
            }
        }

        contentItemProgressRepository.save(progress);

        // Kích hoạt cập nhật lại tiến độ khóa học
        updateCourseEnrollmentProgress(userId, item.getCourse().getId());

        float finalPct = progress.isCompleted() ? 100.0f : (progress.getBestScore() != null ? progress.getBestScore().floatValue() : scorePercent);
        return new ItemProgressDto(item.getId(), finalPct, progress.isCompleted(), null, null);
    }

    /**
     * Ghi nhận hoàn thành xem Flashcards cho VOCAB_SET (Level 0 đạt 100%).
     */
    @Transactional
    public ItemProgressDto recordVocabCompleted(String userId, String contentItemId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nội dung: " + contentItemId));
        courseAccessService.validateCanLearn(userId, item.getCourse());
        if (!"VOCAB_SET".equals(item.getType())) {
            throw new IllegalArgumentException("Nội dung không phải bộ từ vựng");
        }

        ContentItemProgress progress = contentItemProgressRepository
                .findByUserIdAndContentItemIdAndPracticeType(userId, item.getId(), "FLASHCARD")
                .orElseGet(() -> ContentItemProgress.builder()
                        .user(userRepository.getReferenceById(userId))
                        .contentItem(item)
                        .practiceType("FLASHCARD")
                        .build());

        progress.setCompleted(true);
        progress.setBestScore(BigDecimal.valueOf(100.0));
        progress.setCompletedAt(LocalDateTime.now());
        contentItemProgressRepository.save(progress);

        updateCourseEnrollmentProgress(userId, item.getCourse().getId());
        return new ItemProgressDto(item.getId(), 100.0f, true, null, null);
    }

    /**
     * Ghi nhận đã đọc bài viết lý thuyết ngữ pháp không có câu hỏi bài tập.
     */
    @Transactional
    public ItemProgressDto recordGrammarRead(String userId, String contentItemId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nội dung: " + contentItemId));
        courseAccessService.validateCanLearn(userId, item.getCourse());

        ContentItemProgress progress = contentItemProgressRepository
                .findByUserIdAndContentItemIdAndPracticeType(userId, item.getId(), "DEFAULT")
                .orElseGet(() -> ContentItemProgress.builder()
                        .user(userRepository.getReferenceById(userId))
                        .contentItem(item)
                        .practiceType("DEFAULT")
                        .build());

        progress.setCompleted(true);
        progress.setBestScore(BigDecimal.valueOf(100.0));
        progress.setCompletedAt(LocalDateTime.now());
        contentItemProgressRepository.save(progress);

        updateCourseEnrollmentProgress(userId, item.getCourse().getId());
        return new ItemProgressDto(item.getId(), 100.0f, true, 0, 0);
    }

    /**
     * Lưu tiến độ câu hỏi đang làm dang dở (chưa cần bấm nộp bài)
     */
    @Transactional
    public ItemProgressDto savePartialAnswers(String userId, String contentItemId, String attemptId, List<AnswerSubmission> answers) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nội dung: " + contentItemId));
        courseAccessService.validateCanLearn(userId, item.getCourse());

        Attempt attempt = null;
        if (attemptId != null && !attemptId.isBlank()) {
            attempt = attemptRepository.findById(attemptId).orElse(null);
        }
        if (attempt == null) {
            // Lấy lượt thi gần nhất hoặc tạo mới nếu chưa có
            attempt = attemptRepository.save(Attempt.builder()
                    .user(userRepository.getReferenceById(userId))
                    .contentItem(item)
                    .startedAt(LocalDateTime.now())
                    .build());
        }

        if (answers != null && !answers.isEmpty()) {
            List<AttemptAnswer> answersToSave = new ArrayList<>();
            for (AnswerSubmission ans : answers) {
                if (ans.questionId() != null && isAnswerProvided(ans)) {
                    AttemptAnswer aa = AttemptAnswer.builder()
                            .attempt(attempt)
                            .question(questionRepository.getReferenceById(ans.questionId()))
                            .selectedOption(ans.selectedOptionId() != null
                                    ? answerOptionRepository.findById(ans.selectedOptionId()).orElse(null)
                                    : null)
                            .submittedText(extractSubmittedText(ans))
                            .build();
                    answersToSave.add(aa);
                }
            }
            if (!answersToSave.isEmpty()) {
                attemptAnswerRepository.saveAll(answersToSave);
            }
        }

        updateCourseEnrollmentProgress(userId, item.getCourse().getId());

        long activeCount = questionRepository.countActiveQuestionsByItemIds(List.of(item.getId()))
                .stream().map(r -> ((Number) r[1]).intValue()).findFirst().orElse(0);
        long answeredCount = attemptAnswerRepository.countDistinctQuestionsAnsweredByUserAndItem(userId, item.getId());

        float pct = activeCount > 0 ? Math.min(100.0f, Math.round(((answeredCount * 100.0f) / activeCount) * 10f) / 10f) : 0f;
        boolean completed = activeCount > 0 && answeredCount >= activeCount;

        if (completed) {
            ContentItemProgress p = contentItemProgressRepository
                    .findByUserIdAndContentItemIdAndPracticeType(userId, item.getId(), "DEFAULT")
                    .orElseGet(() -> ContentItemProgress.builder()
                            .user(userRepository.getReferenceById(userId))
                            .contentItem(item)
                            .practiceType("DEFAULT")
                            .build());
            p.setCompleted(true);
            p.setCompletedAt(LocalDateTime.now());
            contentItemProgressRepository.save(p);
        }

        return new ItemProgressDto(item.getId(), pct, completed, (int) activeCount, (int) answeredCount);
    }

    /**
     * Tính toán lại và lưu progress_percent vào bảng enrollments.
     */
    @Transactional
    public void updateCourseEnrollmentProgress(String userId, String courseId) {
        try {
            getCourseProgressTree(userId, courseId);
        } catch (Exception e) {
            log.warn("Lỗi khi cập nhật tiến độ khóa học [courseId={}, userId={}]: {}", courseId, userId, e.getMessage());
        }
    }

    private void persistCourseProgress(String userId, String courseId, float progressPercent) {
        enrollmentRepository.findByUserIdAndCourseId(userId, courseId).ifPresent(enrollment -> {
            enrollment.setProgressPercent(progressPercent);
            enrollmentRepository.save(enrollment);
        });
    }

    public static boolean isAnswerProvided(AnswerSubmission ans) {
        if (ans.selectedOptionId() != null && !ans.selectedOptionId().isBlank()) return true;
        if (ans.submittedText() != null && !ans.submittedText().isBlank()) return true;
        if (ans.matchedPairs() != null && !ans.matchedPairs().isEmpty()) return true;
        if (ans.wordChoiceSelections() != null && !ans.wordChoiceSelections().isEmpty()) return true;
        if (ans.sentenceFillAnswers() != null && !ans.sentenceFillAnswers().isEmpty()) return true;
        if (ans.dragDropSelections() != null && !ans.dragDropSelections().isEmpty()) return true;
        return false;
    }

    public static String extractSubmittedText(AnswerSubmission ans) {
        if (ans.submittedText() != null && !ans.submittedText().isBlank()) {
            String s = ans.submittedText().trim();
            return s.length() > 500 ? s.substring(0, 500) : s;
        }
        if (ans.wordChoiceSelections() != null && !ans.wordChoiceSelections().isEmpty()) {
            return "WORD_CHOICE:" + ans.wordChoiceSelections().size();
        }
        if (ans.sentenceFillAnswers() != null && !ans.sentenceFillAnswers().isEmpty()) {
            return "SENTENCE_FILL:" + ans.sentenceFillAnswers().size();
        }
        if (ans.dragDropSelections() != null && !ans.dragDropSelections().isEmpty()) {
            return "DRAG_DROP:" + ans.dragDropSelections().size();
        }
        if (ans.matchedPairs() != null && !ans.matchedPairs().isEmpty()) {
            return "MATCHED:" + ans.matchedPairs().size();
        }
        return null;
    }
}
