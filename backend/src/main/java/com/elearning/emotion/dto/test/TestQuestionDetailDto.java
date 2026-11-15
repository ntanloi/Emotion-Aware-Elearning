package com.elearning.emotion.dto.test;

import com.elearning.emotion.dto.AnswerOptionDto;
import java.util.List;

public record TestQuestionDetailDto(
        String questionId,
        Integer partNo,
        String promptText,
        String selectedOptionId,
        String submittedText,
        String correctOptionId,
        String correctText,
        Boolean isCorrect,
        String explanation,
        List<AnswerOptionDto> options
) {}
