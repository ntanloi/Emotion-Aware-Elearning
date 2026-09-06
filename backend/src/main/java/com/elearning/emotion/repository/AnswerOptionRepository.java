package com.elearning.emotion.repository;

import com.elearning.emotion.entity.AnswerOption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnswerOptionRepository extends JpaRepository<AnswerOption, String> {
    List<AnswerOption> findByQuestionId(String questionId);

    /** Sắp xếp theo label (A,B,C,D...) để đảm bảo đúng thứ tự hiển thị như lúc tạo/sửa câu hỏi. */
    List<AnswerOption> findByQuestionIdOrderByLabelAsc(String questionId);
}
