package com.elearning.emotion.dto;

import java.util.List;
import java.util.Map;

public record AttemptStartResponse(
        String attemptId,
        Integer timeLimitMinutes,
        List<QuestionDto> questions,              // dung khi content_item co cau hoi that (Part1-7/Grammar/Dictation)
        List<VocabPracticeQuestionDto> vocabQuestions, // dung khi content_item la VOCAB_SET
        List<String> previouslyAnsweredQuestionIds,
        Map<String, String> initialAnswers
) {
    public AttemptStartResponse(String attemptId, Integer timeLimitMinutes, List<QuestionDto> questions, List<VocabPracticeQuestionDto> vocabQuestions) {
        this(attemptId, timeLimitMinutes, questions, vocabQuestions, List.of(), Map.of());
    }
}
