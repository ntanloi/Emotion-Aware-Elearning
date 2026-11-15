package com.elearning.emotion.dto.test;

import com.elearning.emotion.dto.PassageDto;
import com.elearning.emotion.dto.QuestionDto;
import java.util.List;

public record TeacherBankPartDto(
        Integer partNo,
        String contentItemId,
        int questionCount,
        List<PassageDto> passages,
        List<QuestionDto> questions
) {}
