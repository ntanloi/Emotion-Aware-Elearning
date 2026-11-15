package com.elearning.emotion.moderation.engine;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.repository.*;
import com.elearning.emotion.service.PolicyService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModerationContextBuilder {

    private final CourseRepository courseRepository;
    private final ContentGroupRepository contentGroupRepository;
    private final ContentItemRepository contentItemRepository;
    private final QuestionRepository questionRepository;
    private final AnswerOptionRepository answerOptionRepository;
    private final PassageRepository passageRepository;
    private final VocabSetItemRepository vocabSetItemRepository;
    private final VocabExampleRepository vocabExampleRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final GrammarTopicRepository grammarTopicRepository;
    private final PolicyService policyService;

    @Transactional(readOnly = true)
    public ModerationContext buildContext(Course course) {
        String courseId = course.getId();
        JsonNode policy = policyService.getActivePolicy();
        int policyVersion = policyService.getActivePolicyVersion();

        // 0. Nạp Course đầy đủ với Teacher và CoverMedia để Phase 2 chạy ngoài transaction không gặp LazyInitializationException
        Course fullCourse = courseRepository.findByIdWithTeacherAndCover(courseId).orElse(course);
        if (fullCourse.getTeacher() != null) {
            fullCourse.getTeacher().getId();
            fullCourse.getTeacher().getFullName();
        }
        if (fullCourse.getCoverMedia() != null) {
            fullCourse.getCoverMedia().getId();
            fullCourse.getCoverMedia().getUrl();
        }

        String profile = fullCourse.getProfile() != null ? fullCourse.getProfile().toUpperCase() : "TOPIC";

        // 1. Nạp Groups & Items (với videoMedia)
        List<ContentGroup> groups = contentGroupRepository.findByCourseId(courseId);
        List<ContentItem> items = contentItemRepository.findByCourseIdWithMedia(courseId);

        List<String> itemIds = items.stream().map(ContentItem::getId).toList();

        // 2. Nạp Questions & Passages với JOIN FETCH đầy đủ (passage, audio, image)
        List<Question> questions = itemIds.isEmpty() ? Collections.emptyList()
                : questionRepository.findByContentItemIdInWithDetails(itemIds);

        List<Passage> passages = itemIds.isEmpty() ? Collections.emptyList()
                : passageRepository.findByContentItemIdInWithMedia(itemIds);

        // 3. Nạp AnswerOptions
        List<String> questionIds = questions.stream().map(Question::getId).toList();
        List<AnswerOption> options = questionIds.isEmpty() ? Collections.emptyList()
                : answerOptionRepository.findByQuestionIdInOrderByLabelAsc(questionIds);

        // 4. Nạp VocabSetItems & VocabWords (đã kèm audio và image qua JOIN FETCH)
        List<VocabSetItem> vocabSetItems = vocabSetItemRepository.findAllWithWordAndCourse(courseId);
        List<VocabWord> vocabWords = vocabSetItems.stream()
                .map(VocabSetItem::getWord)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // 5. Nạp VocabExamples kèm audio
        List<String> wordIds = vocabWords.stream().map(VocabWord::getId).toList();
        List<VocabExample> vocabExamples = wordIds.isEmpty() ? Collections.emptyList()
                : vocabExampleRepository.findByWordIdInWithAudio(wordIds);

        // 6. Nạp Media Assets liên quan vào cache map
        Set<String> mediaIds = new HashSet<>();
        if (fullCourse.getCoverMedia() != null) mediaIds.add(fullCourse.getCoverMedia().getId());
        for (ContentItem it : items) {
            if (it.getVideoMedia() != null) mediaIds.add(it.getVideoMedia().getId());
        }
        for (Question q : questions) {
            if (q.getImage() != null) mediaIds.add(q.getImage().getId());
            if (q.getAudio() != null) mediaIds.add(q.getAudio().getId());
        }
        for (Passage p : passages) {
            if (p.getAudio() != null) mediaIds.add(p.getAudio().getId());
            if (p.getImage() != null) mediaIds.add(p.getImage().getId());
        }
        for (VocabWord w : vocabWords) {
            if (w.getImage() != null) mediaIds.add(w.getImage().getId());
            if (w.getAudioUk() != null) mediaIds.add(w.getAudioUk().getId());
            if (w.getAudioUs() != null) mediaIds.add(w.getAudioUs().getId());
        }
        for (VocabExample ve : vocabExamples) {
            if (ve.getAudio() != null) mediaIds.add(ve.getAudio().getId());
        }

        Map<String, MediaAsset> mediaMap = new HashMap<>();
        if (!mediaIds.isEmpty()) {
            mediaAssetRepository.findAllById(mediaIds).forEach(m -> mediaMap.put(m.getId(), m));
        }

        // 7. Xây dựng bộ chỉ mục (In-memory Indexes)
        Set<String> openedSections = new HashSet<>();
        Map<String, List<ContentItem>> itemsBySection = new HashMap<>();
        Map<String, List<ContentGroup>> groupsBySection = new HashMap<>();
        Map<String, List<ContentItem>> itemsByGroup = new HashMap<>();

        for (ContentItem it : items) {
            String sec = it.getSectionCode() != null ? it.getSectionCode().toUpperCase() : "";
            openedSections.add(sec);
            itemsBySection.computeIfAbsent(sec, k -> new ArrayList<>()).add(it);
            if (it.getGroup() != null && it.getGroup().getId() != null) {
                itemsByGroup.computeIfAbsent(it.getGroup().getId(), k -> new ArrayList<>()).add(it);
            }
        }

        for (ContentGroup gr : groups) {
            String sec = gr.getSectionCode() != null ? gr.getSectionCode().toUpperCase() : "";
            groupsBySection.computeIfAbsent(sec, k -> new ArrayList<>()).add(gr);
        }

        // Tự động điều chỉnh profile nếu khóa học đang mang giá trị "FULL" mặc định nhưng chưa soạn đủ 9 phần
        Set<String> allFullSections = Set.of(
                "PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7", "VOCAB", "GRAMMAR"
        );
        if (profile == null || "FULL".equalsIgnoreCase(profile)) {
            if (!openedSections.containsAll(allFullSections)) {
                profile = "TOPIC";
            }
        }

        Map<String, List<Question>> questionsByItem = questions.stream()
                .filter(q -> q.getContentItem() != null && q.getContentItem().getId() != null)
                .collect(Collectors.groupingBy(q -> q.getContentItem().getId()));

        Map<String, List<AnswerOption>> optionsByQuestion = options.stream()
                .filter(o -> o.getQuestion() != null && o.getQuestion().getId() != null)
                .collect(Collectors.groupingBy(o -> o.getQuestion().getId()));

        Map<String, List<Passage>> passagesByItem = passages.stream()
                .filter(p -> p.getContentItem() != null && p.getContentItem().getId() != null)
                .collect(Collectors.groupingBy(p -> p.getContentItem().getId()));

        Map<String, List<VocabWord>> vocabWordsByItem = new HashMap<>();
        for (VocabSetItem vsi : vocabSetItems) {
            if (vsi.getContentItem() != null && vsi.getWord() != null) {
                vocabWordsByItem.computeIfAbsent(vsi.getContentItem().getId(), k -> new ArrayList<>()).add(vsi.getWord());
            }
        }

        Map<String, List<VocabExample>> examplesByWord = vocabExamples.stream()
                .filter(e -> e.getWord() != null && e.getWord().getId() != null)
                .collect(Collectors.groupingBy(e -> e.getWord().getId()));

        Map<String, GrammarTopic> grammarTopicMap = new HashMap<>();
        grammarTopicRepository.findAll().forEach(gt -> {
            if (gt.getCode() != null) {
                grammarTopicMap.put(gt.getCode().toUpperCase(), gt);
            }
        });

        // 8. Tính contentHash (SHA-256)
        String contentHash = computeHash(fullCourse, items.size(), questions.size(), vocabWords.size(), passages.size());

        return ModerationContext.builder()
                .course(fullCourse)
                .profile(profile)
                .policy(policy)
                .policyVersion(policyVersion)
                .contentHash(contentHash)
                .groups(groups)
                .items(items)
                .questions(questions)
                .options(options)
                .passages(passages)
                .vocabSetItems(vocabSetItems)
                .vocabWords(vocabWords)
                .vocabExamples(vocabExamples)
                .examplesByWord(examplesByWord)
                .grammarTopicMap(grammarTopicMap)
                .mediaMap(mediaMap)
                .openedSections(openedSections)
                .groupsBySection(groupsBySection)
                .itemsBySection(itemsBySection)
                .itemsByGroup(itemsByGroup)
                .questionsByItem(questionsByItem)
                .optionsByQuestion(optionsByQuestion)
                .passagesByItem(passagesByItem)
                .vocabWordsByItem(vocabWordsByItem)
                .build();
    }

    private String computeHash(Course c, int items, int questions, int words, int passages) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String raw = (c.getTitle() != null ? c.getTitle() : "") + "|"
                    + (c.getDescription() != null ? c.getDescription() : "") + "|"
                    + (c.getPrice() != null ? c.getPrice().toString() : "0") + "|"
                    + items + "|" + questions + "|" + words + "|" + passages;
            byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }
}
