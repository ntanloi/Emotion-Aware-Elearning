package com.elearning.emotion.dto;

import java.util.List;

public record AttemptStartResponse(
        String attemptId,
        Integer timeLimitMinutes,
        List<QuestionDto> questions,              // dung khi content_item co cau hoi that (Part1-7/Grammar/Dictation)
        List<VocabPracticeQuestionDto> vocabQuestions // dung khi content_item la VOCAB_SET
) {}
