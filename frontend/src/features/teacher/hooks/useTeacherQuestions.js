import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as questionsApi from "@shared/api/questions.js";

export function useTeacherQuestions(contentItemId) {
  return useQuery({
    queryKey: ["questions", "teacher-view", contentItemId],
    queryFn: () => questionsApi.listQuestionsForTeacher(contentItemId),
    enabled: !!contentItemId,
  });
}

/** Danh sách tag đã từng dùng trong content item — cho dropdown chọn khi tạo câu hỏi mới */
export function useQuestionTags(contentItemId, scope = "current") {
  return useQuery({
    queryKey: ["questions", "tags", contentItemId, scope],
    queryFn: () => questionsApi.listQuestionTags(contentItemId, scope),
    enabled: !!contentItemId,
  });
}

export function useCreateQuestion(contentItemId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      questionsApi.createQuestion({ contentItemId, ...payload }),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["questions", "teacher-view", contentItemId],
      }),
  });
}

export function useUpdateQuestion(contentItemId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => questionsApi.updateQuestion(id, payload),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["questions", "teacher-view", contentItemId],
      }),
  });
}

export function useDeleteQuestion(contentItemId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => questionsApi.deleteQuestion(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["questions", "teacher-view", contentItemId],
      }),
  });
}
