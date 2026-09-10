package com.elearning.emotion.service;

import com.elearning.emotion.dto.VocabExampleDto;
import com.elearning.emotion.dto.VocabWordCreateRequest;
import com.elearning.emotion.dto.VocabWordDto;
import com.elearning.emotion.dto.VocabWordUpdateRequest;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.entity.VocabExample;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.VocabExampleRepository;
import com.elearning.emotion.repository.VocabSetItemRepository;
import com.elearning.emotion.repository.VocabWordRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VocabWordService {

    private final VocabWordRepository vocabWordRepository;
    private final VocabExampleRepository vocabExampleRepository;
    private final VocabSetItemRepository vocabSetItemRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final UserRepository userRepository;

    @Transactional
    public VocabWord create(String teacherId, VocabWordCreateRequest req) {
        var teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay giang vien"));

        VocabWord word = VocabWord.builder()
                .teacher(teacher)
                .word(req.word())
                .ipa(req.ipa())
                .partOfSpeech(req.partOfSpeech())
                .meaningVi(req.meaningVi())
                .image(resolveMedia(req.imageMediaId()))
                .audioUk(resolveMedia(req.audioUkMediaId()))
                .audioUs(resolveMedia(req.audioUsMediaId()))
                .build();
        word = vocabWordRepository.save(word);

        if (req.examples() != null) {
            for (var ex : req.examples()) {
                vocabExampleRepository.save(VocabExample.builder()
                        .word(word)
                        .sentenceEn(ex.sentenceEn())
                        .sentenceVi(ex.sentenceVi())
                        .audio(resolveMedia(ex.audioMediaId()))
                        .build());
            }
        }
        return word;
    }

    public void delete(String teacherId, String wordId) {
        VocabWord word = getOwnedOrThrow(teacherId, wordId);
        // Chan xoa neu tu con dang duoc dung trong it nhat 1 Bo tu vung - tranh loi 500 do
        // rang buoc khoa ngoai vocab_set_items.word_id (BE khong set ON DELETE CASCADE cho bang nay)
        if (vocabSetItemRepository.existsByWordId(wordId)) {
            throw new IllegalStateException(
                    "Từ này đang được dùng trong ít nhất 1 Bộ từ vựng — hãy gỡ khỏi các Bộ đó trước khi xoá khỏi thư viện");
        }
        vocabWordRepository.delete(word);
    }

    /** Field null = giu nguyen. examples gui len (ke ca []) se ghi de toan bo vi du cu. */
    @Transactional
    public VocabWord update(String teacherId, String wordId, VocabWordUpdateRequest req) {
        VocabWord word = getOwnedOrThrow(teacherId, wordId);
        if (req.word() != null) word.setWord(req.word());
        if (req.ipa() != null) word.setIpa(req.ipa());
        if (req.partOfSpeech() != null) word.setPartOfSpeech(req.partOfSpeech());
        if (req.meaningVi() != null) word.setMeaningVi(req.meaningVi());
        if (req.imageMediaId() != null) word.setImage(resolveMedia(req.imageMediaId()));
        if (req.audioUkMediaId() != null) word.setAudioUk(resolveMedia(req.audioUkMediaId()));
        if (req.audioUsMediaId() != null) word.setAudioUs(resolveMedia(req.audioUsMediaId()));
        word = vocabWordRepository.save(word);

        if (req.examples() != null) {
            vocabExampleRepository.deleteAll(vocabExampleRepository.findByWordId(wordId));
            for (var ex : req.examples()) {
                vocabExampleRepository.save(VocabExample.builder()
                        .word(word)
                        .sentenceEn(ex.sentenceEn())
                        .sentenceVi(ex.sentenceVi())
                        .audio(resolveMedia(ex.audioMediaId()))
                        .build());
            }
        }
        return word;
    }

    public VocabWord getOwnedOrThrow(String teacherId, String wordId) {
        VocabWord word = vocabWordRepository.findById(wordId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay tu vung"));
        if (!word.getTeacher().getId().equals(teacherId)) {
            throw new SecurityException("Ban khong co quyen chinh sua tu vung nay");
        }
        return word;
    }

    public VocabWordDto toDto(VocabWord word) {
        List<VocabExampleDto> examples = vocabExampleRepository.findByWordId(word.getId())
                .stream().map(VocabExampleDto::from).toList();
        return VocabWordDto.from(word, examples);
    }

    private MediaAsset resolveMedia(String mediaId) {
        if (mediaId == null) return null;
        return mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay media: " + mediaId));
    }
}
