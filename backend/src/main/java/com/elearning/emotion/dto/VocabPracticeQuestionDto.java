package com.elearning.emotion.dto;

import java.util.List;

/**
 * 1 cau hoi "ao" sinh tu Bo tu vung, KHONG luu DB. wordId dung de FE gui lai khi nop bai
 * (xem AttemptService.gradeVocabPractice) - regenerate lai dung 1 bo cau hoi nho seed
 * co dinh theo wordId, dam bao cham diem nhat quan ma khong can luu trang thai o server.
 *
 * Cac field tu ipa..examples CHI duoc dien cho PracticeType.FLASHCARD (giao dien the tu dien
 * day du: anh, 2 audio UK/US, vi du) - cac dang luyen tap khac (MC/MATCHING/LISTENING/FILL_BLANK)
 * de null, khong anh huong logic cham diem hien co.
 */
public record VocabPracticeQuestionDto(
        String wordId,
        String prompt,        // tu tieng Anh (FLASHCARD/LISTENING) hoac nghia tieng Viet (FILL_BLANK dich nguoc)
        String audioUrl,      // dung cho LISTENING
        List<String> choices, // dung cho MULTIPLE_CHOICE/MATCHING (4 lua chon, xao deu)
        Integer correctChoiceIndex, // CHI tra ve khi la GIANG VIEN preview; hoc vien nhan null
        String word,
        String ipa,
        String partOfSpeech,
        String meaningVi,
        String imageUrl,
        String audioUkUrl,
        String audioUsUrl,
        List<VocabExampleDto> examples
) {}