package com.elearning.emotion.moderation.engine;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.moderation.model.*;
import com.elearning.emotion.moderation.rule.ModerationRule;
import com.elearning.emotion.repository.CourseRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CourseReadinessService {

    private final CourseRepository courseRepository;
    private final ModerationContextBuilder contextBuilder;
    private final RuleRegistry ruleRegistry;
    private final ModerationRunner moderationRunner;

    private static final Map<String, String> SECTION_LABELS = Map.of(
            "VOCAB", "Từ vựng (Vocabulary)",
            "GRAMMAR", "Ngữ pháp (Grammar)",
            "PART1", "Part 1 - Mô tả tranh (Photographs)",
            "PART2", "Part 2 - Hỏi đáp (Question & Response)",
            "PART3", "Part 3 - Đoạn hội thoại (Conversations)",
            "PART4", "Part 4 - Bài nói ngắn (Short Talks)",
            "PART5", "Part 5 - Hoàn thành câu (Incomplete Sentences)",
            "PART6", "Part 6 - Hoàn thành đoạn văn (Text Completion)",
            "PART7", "Part 7 - Đọc hiểu (Reading Comprehension)",
            "DICTATION", "Luyện nghe chép chính tả"
    );

    private static final List<String> SECTION_ORDER = List.of(
            "VOCAB", "GRAMMAR", "PART1", "PART2", "PART3", "PART4", "PART5", "PART6", "PART7", "DICTATION"
    );

    @Transactional(readOnly = true)
    public ReadinessReportDto checkReadiness(String courseId, String teacherId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        if (teacherId != null && course.getTeacher() != null && !course.getTeacher().getId().equals(teacherId)) {
            throw new SecurityException("Bạn không có quyền xem thông tin kiểm duyệt của khóa học này");
        }

        ModerationContext ctx = contextBuilder.buildContext(course);

        // Chạy nhóm luật STRUCTURE (STR-01 đến STR-17)
        List<ModerationRule> strRules = ruleRegistry.getRulesByCategory("STRUCTURE");
        ModerationRunner.RunResult result = moderationRunner.runRules(strRules, ctx);

        List<RuleIssue> blockers = result.getIssues().stream()
                .filter(i -> i.getSeverity() == Severity.BLOCKER)
                .map(i -> maskSensitiveForTeacher(i, teacherId))
                .toList();

        List<RuleIssue> warnings = result.getIssues().stream()
                .filter(i -> i.getSeverity() == Severity.WARNING)
                .map(i -> maskSensitiveForTeacher(i, teacherId))
                .toList();

        JsonNode policy = ctx.getPolicy();
        JsonNode sectionsNode = policy != null ? policy.path("sections") : null;

        List<ReadinessReportDto.SectionReadinessDto> sectionReports = new ArrayList<>();

        for (String secCode : SECTION_ORDER) {
            String label = SECTION_LABELS.getOrDefault(secCode, secCode);
            boolean isOpened = ctx.isSectionOpened(secCode);

            if (!isOpened) {
                sectionReports.add(ReadinessReportDto.SectionReadinessDto.builder()
                        .code(secCode)
                        .label(label)
                        .status("NOT_OPEN")
                        .requirements(Collections.emptyList())
                        .build());
                continue;
            }

            List<ReadinessReportDto.RequirementDto> reqs = new ArrayList<>();
            List<ContentItem> items = ctx.getSectionItems(secCode);

            if (secCode.startsWith("PART")) {
                // Yêu cầu video
                int videoCount = (int) items.stream().filter(ContentItem::isVideoLecture).count();
                reqs.add(ReadinessReportDto.RequirementDto.builder()
                        .key("video")
                        .label("Video bài giảng")
                        .required(1)
                        .actual(videoCount)
                        .met(videoCount >= 1)
                        .severity("BLOCKER")
                        .jumpTo("/teacher/courses/" + courseId + "/content?section=" + secCode)
                        .build());

                // Yêu cầu số câu hỏi tối thiểu
                int minQ = sectionsNode != null && sectionsNode.has(secCode) ? sectionsNode.path(secCode).path("minQuestions").asInt(6) : 6;
                int actualQ = 0;
                for (ContentItem it : items) {
                    for (Question q : ctx.getItemQuestions(it.getId())) {
                        if (q.getStatus() == null || !"DISABLED".equalsIgnoreCase(q.getStatus())) {
                            actualQ++;
                        }
                    }
                }
                reqs.add(ReadinessReportDto.RequirementDto.builder()
                        .key("minQuestions")
                        .label("Số câu hỏi tối thiểu")
                        .required(minQ)
                        .actual(actualQ)
                        .met(actualQ >= minQ)
                        .severity("BLOCKER")
                        .jumpTo("/teacher/courses/" + courseId + "/content?section=" + secCode)
                        .build());

            } else if ("VOCAB".equals(secCode)) {
                int minWords = sectionsNode != null && sectionsNode.has("VOCAB") ? sectionsNode.path("VOCAB").path("minWords").asInt(50) : 50;
                Set<String> uniqueWords = new HashSet<>();
                for (ContentItem it : items) {
                    for (VocabWord w : ctx.getItemVocabWords(it.getId())) {
                        if (w.getWord() != null) uniqueWords.add(w.getWord().trim().toLowerCase());
                    }
                }
                reqs.add(ReadinessReportDto.RequirementDto.builder()
                        .key("minWords")
                        .label("Số từ vựng không trùng")
                        .required(minWords)
                        .actual(uniqueWords.size())
                        .met(uniqueWords.size() >= minWords)
                        .severity("BLOCKER")
                        .jumpTo("/teacher/courses/" + courseId + "/content?section=VOCAB")
                        .build());

            } else if ("GRAMMAR".equals(secCode)) {
                int minTopics = sectionsNode != null && sectionsNode.has("GRAMMAR") ? sectionsNode.path("GRAMMAR").path("minTopics").asInt(8) : 8;
                Set<String> topics = new HashSet<>();
                for (ContentItem it : items) {
                    if ("GRAMMAR_ARTICLE".equals(it.getType()) && it.getTopicCode() != null && !it.getTopicCode().isBlank()) {
                        topics.add(it.getTopicCode());
                    }
                }
                reqs.add(ReadinessReportDto.RequirementDto.builder()
                        .key("minTopics")
                        .label("Số chủ điểm ngữ pháp")
                        .required(minTopics)
                        .actual(topics.size())
                        .met(topics.size() >= minTopics)
                        .severity("BLOCKER")
                        .jumpTo("/teacher/courses/" + courseId + "/content?section=GRAMMAR")
                        .build());

            } else if ("DICTATION".equals(secCode)) {
                int minSentences = sectionsNode != null && sectionsNode.has("DICTATION") ? sectionsNode.path("DICTATION").path("minSentences").asInt(10) : 10;
                int audioCount = 0;
                for (ContentItem it : items) {
                    if ("DICTATION_SET".equals(it.getType())) {
                        for (Question q : ctx.getItemQuestions(it.getId())) {
                            if (q.getAudio() != null) audioCount++;
                        }
                    }
                }
                reqs.add(ReadinessReportDto.RequirementDto.builder()
                        .key("minSentences")
                        .label("Số câu chính tả có âm thanh")
                        .required(minSentences)
                        .actual(audioCount)
                        .met(audioCount >= minSentences)
                        .severity("BLOCKER")
                        .jumpTo("/teacher/courses/" + courseId + "/content?section=DICTATION")
                        .build());
            }

            boolean hasSectionBlocker = blockers.stream().anyMatch(b -> secCode.equalsIgnoreCase(b.getTargetId()));
            String secStatus = hasSectionBlocker ? "BLOCKED" : "PASSED";

            sectionReports.add(ReadinessReportDto.SectionReadinessDto.builder()
                    .code(secCode)
                    .label(label)
                    .status(secStatus)
                    .requirements(reqs)
                    .build());
        }

        boolean canSubmit = blockers.isEmpty() && ctx.getOpenedSections() != null && !ctx.getOpenedSections().isEmpty();

        return ReadinessReportDto.builder()
                .canSubmit(canSubmit)
                .policyVersion(ctx.getPolicyVersion())
                .blockerCount(blockers.size())
                .warningCount(warnings.size())
                .sections(sectionReports)
                .blockers(blockers)
                .warnings(warnings)
                .build();
    }

    private RuleIssue maskSensitiveForTeacher(RuleIssue issue, String teacherId) {
        if (teacherId != null && "DUP-02".equalsIgnoreCase(issue.getRuleId())) {
            return RuleIssue.builder()
                    .ruleId(issue.getRuleId())
                    .category(issue.getCategory())
                    .severity(issue.getSeverity())
                    .targetType(issue.getTargetType())
                    .targetId(issue.getTargetId())
                    .message("Phát hiện câu hỏi hoặc đoạn văn có độ tương đồng cao với nội dung đã có trên hệ thống. Vui lòng kiểm tra và biên soạn lại.")
                    .suggestion(issue.getSuggestion())
                    .confidence(issue.getConfidence())
                    .jumpTo(issue.getJumpTo())
                    .build();
        }
        return issue;
    }
}
