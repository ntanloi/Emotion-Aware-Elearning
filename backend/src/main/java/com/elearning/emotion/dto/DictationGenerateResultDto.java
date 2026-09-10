package com.elearning.emotion.dto;

import java.util.List;

public record DictationGenerateResultDto(
        List<QuestionDto> questions,
        List<String> skippedWords // cac tu bi BO QUA vi chua co audio US, tra ve de FE bao cho giao vien biet
) {}
