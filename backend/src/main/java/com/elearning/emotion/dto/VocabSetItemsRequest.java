package com.elearning.emotion.dto;

import java.util.List;

/** Danh sach wordId theo dung thu tu muon hien thi trong Bo tu vung cua 1 content_item VOCAB_SET */
public record VocabSetItemsRequest(List<String> wordIds) {}
