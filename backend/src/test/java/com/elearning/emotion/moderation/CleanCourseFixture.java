package com.elearning.emotion.moderation;

import com.elearning.emotion.entity.*;
import com.elearning.emotion.enums.ToeicPart;
import com.elearning.emotion.moderation.model.ModerationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

public class CleanCourseFixture {

    public static ModerationContext createCleanCourseContext() {
        Course course = Course.builder()
                .id("clean-c1")
                .title("Khóa học luyện thi TOEIC Đột phá 750+")
                .description("Khóa học tổng hợp rèn luyện đầy đủ các kỹ năng TOEIC với nội dung phong phú và bài tập chuẩn khảo thí.")
                .profile("FULL")
                .level("INTERMEDIATE")
                .status("PENDING_REVIEW")
                .price(java.math.BigDecimal.valueOf(499000))
                .build();

        List<ContentGroup> groups = new ArrayList<>();
        List<ContentItem> items = new ArrayList<>();
        List<Question> questions = new ArrayList<>();
        List<Passage> passages = new ArrayList<>();
        List<VocabWord> vocabWords = new ArrayList<>();
        Map<String, List<AnswerOption>> optionsByQuestion = new HashMap<>();
        Map<String, List<Question>> questionsByPassage = new HashMap<>();
        Map<String, MediaAsset> mediaByItem = new HashMap<>();
        Map<String, MediaAsset> audioByPassage = new HashMap<>();
        Map<String, MediaAsset> imageByQuestion = new HashMap<>();
        Map<String, List<VocabExample>> examplesByWord = new HashMap<>();

        // 1. Nhóm & Bài tập Part 1
        ContentGroup g1 = ContentGroup.builder().id("g-p1").course(course).title("Part 1 - Photographs").sectionCode("PART1").kind("PRACTICE").build();
        ContentItem itemP1 = ContentItem.builder().id("item-p1").group(g1).title("Bài luyện Part 1").type("PRACTICE_TEST").build();
        groups.add(g1);
        items.add(itemP1);

        Question qP1 = Question.builder().id("q-p1-1").contentItem(itemP1).toeicPart(ToeicPart.PART_1).content("Where are the people standing?").orderIndex(1).build();
        MediaAsset imgP1 = MediaAsset.builder().id("img-p1-1").mediaType("IMAGE").url("https://example.com/p1-photo.jpg").build();
        imageByQuestion.put(qP1.getId(), imgP1);
        questions.add(qP1);
        optionsByQuestion.put(qP1.getId(), createOptions(qP1, List.of("They are standing in a meeting room.", "They are walking outside.", "They are sitting on chairs.", "They are boarding a bus."), 0));

        // 2. Nhóm & Bài tập Part 2 (3 lựa chọn A, B, C)
        ContentGroup g2 = ContentGroup.builder().id("g-p2").course(course).title("Part 2 - Question & Response").sectionCode("PART2").kind("PRACTICE").build();
        ContentItem itemP2 = ContentItem.builder().id("item-p2").group(g2).title("Bài luyện Part 2").type("PRACTICE_TEST").build();
        groups.add(g2);
        items.add(itemP2);

        Question qP2 = Question.builder().id("q-p2-1").contentItem(itemP2).toeicPart(ToeicPart.PART_2).content("When will the marketing report be ready?").orderIndex(1).build();
        questions.add(qP2);
        optionsByQuestion.put(qP2.getId(), createOptions(qP2, List.of("By tomorrow afternoon.", "Yes, I read it.", "At the second floor office."), 0));

        // 3. Nhóm & Bài tập Part 3 (Hội thoại có Audio, 3 câu hỏi)
        ContentGroup g3 = ContentGroup.builder().id("g-p3").course(course).title("Part 3 - Conversations").sectionCode("PART3").kind("PRACTICE").build();
        ContentItem itemP3 = ContentItem.builder().id("item-p3").group(g3).title("Bài luyện Part 3").type("PRACTICE_TEST").build();
        groups.add(g3);
        items.add(itemP3);

        Passage passP3 = Passage.builder().id("pass-p3-1").contentItem(itemP3).title("Conversation 1").content("Man: Did you receive the revised schedule? Woman: Yes, I did.").build();
        passages.add(passP3);
        MediaAsset audioP3 = MediaAsset.builder().id("aud-p3-1").mediaType("AUDIO").url("https://example.com/p3-audio.mp3").build();
        audioByPassage.put(passP3.getId(), audioP3);

        List<Question> passP3Questions = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            Question q = Question.builder().id("q-p3-" + i).contentItem(itemP3).passage(passP3).toeicPart(ToeicPart.PART_3).content("What are the speakers discussing in question " + i + "?").orderIndex(i).build();
            questions.add(q);
            passP3Questions.add(q);
            optionsByQuestion.put(q.getId(), createOptions(q, List.of("A project schedule update", "A vacation request", "A budget report", "An office relocation"), (i - 1) % 4));
        }
        questionsByPassage.put(passP3.getId(), passP3Questions);

        // 4. Nhóm & Bài tập Part 5 (Câu có khoảng trống ___)
        ContentGroup g5 = ContentGroup.builder().id("g-p5").course(course).title("Part 5 - Incomplete Sentences").sectionCode("PART5").kind("PRACTICE").build();
        ContentItem itemP5 = ContentItem.builder().id("item-p5").group(g5).title("Bài luyện Part 5").type("PRACTICE_TEST").build();
        groups.add(g5);
        items.add(itemP5);

        Question qP5 = Question.builder().id("q-p5-1").contentItem(itemP5).toeicPart(ToeicPart.PART_5).content("Ms. Gomez submitted her travel expenses ___ she returned from Seoul.").orderIndex(1).build();
        questions.add(qP5);
        optionsByQuestion.put(qP5.getId(), createOptions(qP5, List.of("promptly after", "soon", "during", "while"), 0));

        // 5. Nhóm Từ vựng (Vocabulary)
        ContentGroup gVoc = ContentGroup.builder().id("g-voc").course(course).title("Từ vựng trọng tâm").sectionCode("VOCAB").kind("LESSON").build();
        ContentItem itemVoc = ContentItem.builder().id("item-voc").group(gVoc).title("Chủ đề Hợp đồng").type("VOCAB_SET").build();
        groups.add(gVoc);
        items.add(itemVoc);

        VocabWord vw1 = VocabWord.builder().id("vw-1").contentItem(itemVoc).word("contract").partOfSpeech("noun").meaning("hợp đồng, giao kèo").build();
        vocabWords.add(vw1);
        VocabExample ex1 = VocabExample.builder().id("ex-1").vocabWord(vw1).sentence("The company decided to renew the contract with their primary supplier.").meaning("Công ty đã quyết định gia hạn hợp đồng với nhà cung cấp chính.").build();
        examplesByWord.put(vw1.getId(), List.of(ex1));

        // 6. Nhóm Ngữ pháp (Grammar)
        ContentGroup gGrm = ContentGroup.builder().id("g-grm").course(course).title("Ngữ pháp TOEIC").sectionCode("GRAMMAR").kind("LESSON").build();
        ContentItem itemGrm = ContentItem.builder().id("item-grm").group(gGrm).title("Thì Hiện tại hoàn thành").type("GRAMMAR_ARTICLE")
                .bodyHtml("<p>Thì hiện tại hoàn thành được dùng để diễn tả một hành động đã xảy ra trong quá khứ nhưng kết quả vẫn còn liên quan tới hiện tại.</p><p>Công thức cơ bản: S + have/has + V3/ed + O. Dấu hiệu nhận biết thường gặp trong TOEIC: since, for, already, yet, recently, so far.</p><p>Ví dụ đúng: They have finished the project recently. Ví dụ minh họa lỗi sai thường gặp: ✗ She has went to Tokyo yesterday.</p>")
                .build();
        groups.add(gGrm);
        items.add(itemGrm);

        // Policy mặc định
        JsonNode policyNode = null;
        try {
            ObjectMapper mapper = new ObjectMapper();
            policyNode = mapper.readTree("{\"risk\":{\"highScore\":40,\"mediumScore\":15},\"duplicate\":{\"simThreshold\":0.85},\"text\":{\"minBodyLength\":30}}");
        } catch (Exception e) {}

        return ModerationContext.builder()
                .course(course)
                .contentGroups(groups)
                .contentItems(items)
                .questions(questions)
                .passages(passages)
                .vocabWords(vocabWords)
                .optionsByQuestion(optionsByQuestion)
                .questionsByPassage(questionsByPassage)
                .mediaByItem(mediaByItem)
                .audioByPassage(audioByPassage)
                .imageByQuestion(imageByQuestion)
                .examplesByWord(examplesByWord)
                .policy(policyNode)
                .contentHash("clean-hash-1234567890abcdef")
                .build();
    }

    private static List<AnswerOption> createOptions(Question q, List<String> texts, int correctIdx) {
        List<AnswerOption> opts = new ArrayList<>();
        String[] labels = {"A", "B", "C", "D"};
        for (int i = 0; i < texts.size(); i++) {
            opts.add(AnswerOption.builder()
                    .id("opt-" + q.getId() + "-" + labels[i])
                    .question(q)
                    .label(labels[i])
                    .content(texts.get(i))
                    .correct(i == correctIdx)
                    .orderIndex(i + 1)
                    .build());
        }
        return opts;
    }
}
