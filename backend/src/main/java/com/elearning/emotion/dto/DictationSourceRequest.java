package com.elearning.emotion.dto;

import java.util.List;

/**
 * Nguon tu vung de tu sinh cau hoi DICTATION - giao vien co the chon 1 trong 2 hoac ca 2 cach,
 * ket qua se GOP LAI va loai trung theo wordId (xem DictationGeneratorService).
 */
public record DictationSourceRequest(
        List<String> vocabWordIds,  // chon tung tu rieng le tu thu vien
        List<String> sourceGroupIds // chon nguyen 1/nhieu Nhom hoat dong -> lay het tu trong cac Bo tu vung cua Nhom do
) {}
