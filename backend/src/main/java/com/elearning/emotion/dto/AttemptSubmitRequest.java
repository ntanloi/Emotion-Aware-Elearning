package com.elearning.emotion.dto;

import java.util.List;

/** practiceType chi dung khi content_item la VOCAB_SET - phai khop voi practiceType da dung luc start() */
public record AttemptSubmitRequest(String practiceType, List<AnswerSubmission> answers) {}
