package com.elearning.emotion.moderation.rule.str;

import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.elearning.emotion.moderation.model.RuleIssue;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ExamProfileModerationTest {

    @Test
    @DisplayName("Nghiệm thu Giai đoạn 1: Khóa có profile EXAM được bỏ qua toàn bộ các rule cấu trúc khóa học thật")
    void testExamProfileSkipsCourseStructureRules() {
        // Khóa học chứa đề thi với profile=EXAM (không có section thông thường, không video)
        Course examCourse = Course.builder()
                .id("exam-course-id")
                .title("Đề thi TOEIC Full Test 2026")
                .profile("EXAM")
                .teacher(User.builder().id("gv1").fullName("Giảng Viên").build())
                .build();

        ModerationContext examCtx = ModerationContext.builder()
                .course(examCourse)
                .profile("EXAM")
                .openedSections(Set.of())
                .items(List.of())
                .questions(List.of())
                .questionsByItem(Map.of())
                .build();

        // 1. STR-05: Cần ít nhất 1 section -> Với EXAM phải bỏ qua
        Str05_AtLeastOneSectionRule str05 = new Str05_AtLeastOneSectionRule();
        List<RuleIssue> issues05 = str05.evaluate(examCtx);
        assertTrue(issues05.isEmpty(), "STR-05 phải bỏ qua khi profile là EXAM");

        // 2. STR-06: Cần video bài giảng trong Part -> Với EXAM phải bỏ qua
        Str06_PartVideoRequiredRule str06 = new Str06_PartVideoRequiredRule();
        List<RuleIssue> issues06 = str06.evaluate(examCtx);
        assertTrue(issues06.isEmpty(), "STR-06 phải bỏ qua khi profile là EXAM");

        // 3. STR-07: Số câu tối thiểu từng Part -> Với EXAM phải bỏ qua
        Str07_PartMinQuestionsRule str07 = new Str07_PartMinQuestionsRule();
        List<RuleIssue> issues07 = str07.evaluate(examCtx);
        assertTrue(issues07.isEmpty(), "STR-07 phải bỏ qua khi profile là EXAM");

        // 4. STR-13: Bài luyện tập tối thiểu câu hỏi -> Với EXAM phải bỏ qua
        Str13_PracticeTestMinQuestionsRule str13 = new Str13_PracticeTestMinQuestionsRule();
        List<RuleIssue> issues13 = str13.evaluate(examCtx);
        assertTrue(issues13.isEmpty(), "STR-13 phải bỏ qua khi profile là EXAM");

        // 5. STR-15: Độ phủ section theo profile -> Với EXAM phải bỏ qua
        Str15_ProfileCoverageRule str15 = new Str15_ProfileCoverageRule();
        List<RuleIssue> issues15 = str15.evaluate(examCtx);
        assertTrue(issues15.isEmpty(), "STR-15 phải bỏ qua khi profile là EXAM");

        // 6. STR-17: Số lượng khuyến nghị -> Với EXAM phải bỏ qua
        Str17_RecommendedQuantitiesRule str17 = new Str17_RecommendedQuantitiesRule();
        List<RuleIssue> issues17 = str17.evaluate(examCtx);
        assertTrue(issues17.isEmpty(), "STR-17 phải bỏ qua khi profile là EXAM");
    }

    @Test
    @DisplayName("Khóa học thông thường (TOPIC/FULL) vẫn kiểm tra chặt chẽ các rule cấu trúc")
    void testNormalCourseStillEnforcesStructureRules() {
        Course normalCourse = Course.builder()
                .id("normal-course-id")
                .title("Khóa TOEIC Cơ Bản")
                .profile("TOPIC")
                .teacher(User.builder().id("gv1").fullName("Giảng Viên").build())
                .build();

        ModerationContext normalCtx = ModerationContext.builder()
                .course(normalCourse)
                .profile("TOPIC")
                .openedSections(Set.of())
                .items(List.of())
                .questions(List.of())
                .questionsByItem(Map.of())
                .build();

        // Với khóa thường chưa có section, STR-05 phải báo lỗi BLOCKER
        Str05_AtLeastOneSectionRule str05 = new Str05_AtLeastOneSectionRule();
        List<RuleIssue> issues05 = str05.evaluate(normalCtx);
        assertFalse(issues05.isEmpty(), "STR-05 phải chặn khóa học thường chưa có nội dung");
        assertEquals("STR-05", issues05.get(0).getRuleId());
    }
}
