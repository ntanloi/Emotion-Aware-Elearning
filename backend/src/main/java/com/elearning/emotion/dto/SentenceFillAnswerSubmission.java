package com.elearning.emotion.dto;

/** 1 câu trả lời của học viên cho 1 ô trống trong câu hỏi SENTENCE_FILL. */
public record SentenceFillAnswerSubmission(String blankId, String submittedText) {}
