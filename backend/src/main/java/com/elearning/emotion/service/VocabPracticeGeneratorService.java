package com.elearning.emotion.service;

import com.elearning.emotion.dto.VocabExampleDto;
import com.elearning.emotion.dto.VocabPracticeQuestionDto;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.repository.VocabExampleRepository;
import com.elearning.emotion.repository.VocabSetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * BR-18: he thong TU SINH 5 dang luyen tap tu 1 Bo tu vung (content_item type=VOCAB_SET),
 * khong luu cau hoi vao DB - sinh lai moi lan hoc vien vao hoc.
 *
 * QUAN TRONG - vi sao deterministic (co seed):
 * Cau hoi trac nghiem/ghep cap can 3 "moi nhu" (dap an sai) chon ngau nhien tu cac tu khac
 * trong CUNG bo. Neu random hoan toan moi lan goi, luc /start sinh ra 1 bo dap an, luc /submit
 * cham diem lai se sinh ra bo KHAC -> cham sai. Giai phap: seed Random bang hashCode cua
 * word.id (co dinh), nen goi lai ham nay bao nhieu lan cung ra DUNG 1 ket qua - khong can luu
 * trang thai "cau hoi da sinh" o server hay session gi ca (stateless, don gian, de test).
 */
@Service
@RequiredArgsConstructor
public class VocabPracticeGeneratorService {

    public enum PracticeType { FLASHCARD, MULTIPLE_CHOICE, MATCHING, LISTENING, FILL_BLANK }

    private final VocabSetItemRepository vocabSetItemRepository;
    private final VocabExampleRepository vocabExampleRepository;

    public List<VocabPracticeQuestionDto> generate(String contentItemId, PracticeType type, boolean revealAnswer) {
        List<VocabWord> words = vocabSetItemRepository.findByContentItemIdOrderByOrderIndex(contentItemId)
                .stream().map(item -> item.getWord()).toList();
        if (words.size() < 4 && (type == PracticeType.MULTIPLE_CHOICE || type == PracticeType.LISTENING)) {
            throw new IllegalArgumentException("Can toi thieu 4 tu trong Bo tu vung de sinh trac nghiem/nghe");
        }

        return switch (type) {
            case FLASHCARD -> generateFlashcards(words);
            case MULTIPLE_CHOICE -> generateMultipleChoice(words, revealAnswer, false);
            case LISTENING -> generateMultipleChoice(words, revealAnswer, true);
            case MATCHING -> generateMatching(words);
            case FILL_BLANK -> generateFillBlank(words);
        };
    }

    /**
     * Xem nghia truoc/sau, khong cham diem dung/sai - chi danh dau da xem (completed).
     * Day du thong tin nhu the tu dien: anh minh hoa, 2 audio UK/US, vi du - dung cho
     * giao dien FlashcardCard kieu "the tu dien" (dinh nghia + anh + vi du).
     */
    private List<VocabPracticeQuestionDto> generateFlashcards(List<VocabWord> words) {
        return words.stream().map(w -> {
            List<VocabExampleDto> examples = vocabExampleRepository.findByWordId(w.getId())
                    .stream().map(VocabExampleDto::from).toList();
            return new VocabPracticeQuestionDto(
                    w.getId(),
                    w.getWord() + (w.getIpa() != null ? " /" + w.getIpa() + "/" : ""),
                    w.getAudioUk() != null ? w.getAudioUk().getUrl() : null,
                    List.of(w.getMeaningVi()), null,
                    w.getWord(), w.getIpa(), w.getPartOfSpeech(), w.getMeaningVi(),
                    w.getImage() != null ? w.getImage().getUrl() : null,
                    w.getAudioUk() != null ? w.getAudioUk().getUrl() : null,
                    w.getAudioUs() != null ? w.getAudioUs().getUrl() : null,
                    examples
            );
        }).toList();
    }

    /** Trac nghiem nghia (hoac Nghe -> chon nghia dung, chi khac audioUrl duoc dien) */
    private List<VocabPracticeQuestionDto> generateMultipleChoice(List<VocabWord> words, boolean reveal, boolean listening) {
        List<VocabPracticeQuestionDto> result = new ArrayList<>();
        for (VocabWord w : words) {
            Random seeded = new Random(w.getId().hashCode());
            List<String> distractors = words.stream()
                    .filter(other -> !other.getId().equals(w.getId()))
                    .map(VocabWord::getMeaningVi)
                    .collect(Collectors.collectingAndThen(Collectors.toList(), list -> {
                        Collections.shuffle(list, seeded);
                        return list.subList(0, Math.min(3, list.size()));
                    }));
            List<String> choices = new ArrayList<>(distractors);
            int correctIndex = seeded.nextInt(choices.size() + 1);
            choices.add(correctIndex, w.getMeaningVi());

            result.add(new VocabPracticeQuestionDto(
                    w.getId(),
                    listening ? null : w.getWord(),
                    listening ? (w.getAudioUk() != null ? w.getAudioUk().getUrl() : null) : null,
                    choices,
                    reveal ? correctIndex : null,
                    null, null, null, null, null, null, null, null
            ));
        }
        return result;
    }

    /** Ghep cap: moi tu 1 dong, "choices" chi chua dung 1 phan tu = nghia dung (FE tu xao vi tri 2 cot) */
    private List<VocabPracticeQuestionDto> generateMatching(List<VocabWord> words) {
        return words.stream().map(w -> new VocabPracticeQuestionDto(
                w.getId(), w.getWord(), null, List.of(w.getMeaningVi()), null,
                null, null, null, null, null, null, null, null
        )).toList();
    }

    /** Dich nghia/Dien tu: cho nghia tieng Viet, hoc vien go lai tu tieng Anh - cham bang so khop chuoi */
    private List<VocabPracticeQuestionDto> generateFillBlank(List<VocabWord> words) {
        return words.stream().map(w -> new VocabPracticeQuestionDto(
                w.getId(), w.getMeaningVi(), null, List.of(w.getWord()), null,
                null, null, null, null, null, null, null, null
        )).toList();
    }

    /** Dung lai o AttemptService khi cham diem MULTIPLE_CHOICE/LISTENING: tra ve dung index dap an */
    public int correctIndexFor(VocabWord target, List<VocabWord> allWordsInSet) {
        var generated = generateMultipleChoice(allWordsInSet, true, false);
        return generated.stream()
                .filter(q -> q.wordId().equals(target.getId()))
                .findFirst()
                .map(VocabPracticeQuestionDto::correctChoiceIndex)
                .orElseThrow();
    }
}