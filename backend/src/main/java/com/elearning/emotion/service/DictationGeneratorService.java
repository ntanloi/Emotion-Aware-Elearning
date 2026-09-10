package com.elearning.emotion.service;

import com.elearning.emotion.dto.DictationGenerateResultDto;
import com.elearning.emotion.dto.DictationSourceRequest;
import com.elearning.emotion.dto.QuestionDto;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Question;
import com.elearning.emotion.entity.TextAnswer;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.QuestionRepository;
import com.elearning.emotion.repository.TextAnswerRepository;
import com.elearning.emotion.repository.VocabSetItemRepository;
import com.elearning.emotion.repository.VocabWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * FR-TCH: "Luyện nghe chép chính tả" TỰ SINH từ thư viện từ vựng (Phương án A trong lộ trình
 * A-Z: VẬT CHẤT HOÁ câu hỏi). Mỗi từ có audio US -> tạo đúng 1 Question(questionKind=DICTATION,
 * audio=word.audioUs) + TextAnswer(correctText=word.word) - tái dùng 100% hạ tầng chấm điểm
 * (QuestionService.checkAnswer) đã có, KHÔNG cần sửa gì phía học viên.
 */
@Service
@RequiredArgsConstructor
public class DictationGeneratorService {

    private final QuestionRepository questionRepository;
    private final TextAnswerRepository textAnswerRepository;
    private final VocabWordRepository vocabWordRepository;
    private final VocabSetItemRepository vocabSetItemRepository;
    private final ContentItemRepository contentItemRepository;
    private final ContentItemService contentItemService;
    private final ContentGroupService contentGroupService;

    @Transactional
    public DictationGenerateResultDto generate(String teacherId, String dictationContentItemId,
                                               DictationSourceRequest req) {
        ContentItem dictationItem = contentItemService.getOwnedOrThrow(teacherId, dictationContentItemId);
        if (!"DICTATION_SET".equals(dictationItem.getType())) {
            throw new IllegalArgumentException("Hoạt động này không phải Bộ chính tả (DICTATION_SET)");
        }

        // Gop nguon 1 (chon tung tu) + nguon 2 (chon nguyen Nhom hoat dong) -> loai trung theo wordId
        Set<String> wordIds = new LinkedHashSet<>();
        if (req.vocabWordIds() != null) wordIds.addAll(req.vocabWordIds());
        if (req.sourceGroupIds() != null) {
            for (String groupId : req.sourceGroupIds()) {
                contentGroupService.getOwnedOrThrow(teacherId, groupId); // xac nhan Nhom thuoc dung giao vien
                wordIds.addAll(collectWordIdsFromGroup(groupId));
            }
        }
        if (wordIds.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất 1 từ hoặc 1 Nhóm hoạt động làm nguồn");
        }

        // Chi lay tu THUOC DUNG giao vien nay - tranh dung nham tu cua giao vien khac
        List<VocabWord> words = vocabWordRepository.findByIdInAndTeacherId(new ArrayList<>(wordIds), teacherId);

        // "Sinh lai": xoa het cau DICTATION tu sinh CU cua Bo nay truoc khi tao lai (idempotent)
        questionRepository.deleteAll(
                questionRepository.findByContentItemIdAndSourceVocabWordIsNotNull(dictationContentItemId));

        List<String> skippedWords = new ArrayList<>();
        List<Question> created = new ArrayList<>();
        int order = 0;
        for (VocabWord word : words) {
            if (word.getAudioUs() == null) {
                skippedWords.add(word.getWord()); // chua co audio US -> khong sinh duoc, bao lai cho giao vien
                continue;
            }
            Question q = Question.builder()
                    .contentItem(dictationItem)
                    .questionKind("DICTATION")
                    .promptText("Nghe và gõ lại từ bạn nghe được")
                    .audio(word.getAudioUs())
                    .sourceVocabWord(word)
                    .orderIndex(order++)
                    .build();
            q = questionRepository.save(q);
            textAnswerRepository.save(TextAnswer.builder()
                    .question(q)
                    .correctText(word.getWord())
                    .build());
            created.add(q);
        }

        List<QuestionDto> dtos = created.stream()
                .map(q -> QuestionDto.build(q, List.of(), null, q.getSourceVocabWord().getWord(), List.of(), List.of(), null))
                .toList();
        return new DictationGenerateResultDto(dtos, skippedWords);
    }

    private List<String> collectWordIdsFromGroup(String groupId) {
        List<String> ids = new ArrayList<>();
        contentItemRepository.findByGroupIdOrderByOrderIndex(groupId).stream()
                .filter(ci -> "VOCAB_SET".equals(ci.getType()))
                .forEach(ci -> vocabSetItemRepository.findByContentItemIdOrderByOrderIndex(ci.getId())
                        .forEach(vsi -> ids.add(vsi.getWord().getId())));
        return ids;
    }
}
