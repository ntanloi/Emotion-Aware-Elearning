import apiClient from "./client.js";

/** FR-LES-04/05/06: câu hỏi Part 1-7/ngữ pháp/chính tả — học viên xem (ẩn đáp án đúng) */
export const listQuestions = (contentItemId) =>
  apiClient
    .get("/questions", { params: { contentItemId } })
    .then((r) => r.data);

/**
 * FR-LES-05/06: kiểm tra đáp án cho MỘT câu ngay khi làm bài (chưa nộp cả bài).
 * payload: { selectedOptionId } cho MULTIPLE_CHOICE, hoặc { submittedText } cho FILL_BLANK/DICTATION.
 * Trả về { questionId, correct, correctOptionId, correctText } để FE tô màu xanh/đỏ.
 */
export const checkAnswer = (questionId, payload) =>
  apiClient.post(`/questions/${questionId}/check`, payload).then((r) => r.data);

// ---------- FR-TCH-06: giáo viên soạn câu hỏi Part 1-7 / ngữ pháp ----------
/** FR-TCH-07: giáo viên xem lại — CÓ đáp án đúng, dùng để soạn/preview */
export const listQuestionsForTeacher = (contentItemId) =>
  apiClient
    .get("/questions/teacher-view", { params: { contentItemId } })
    .then((r) => r.data);

/** FR-TCH-06 mở rộng: danh sách tag đã từng dùng trong content item — cho FE hiện dropdown chọn */
/** scope: 'current' (mặc định, chỉ Part đang mở) | 'all' (mọi Part/nhóm trong khoá học — dùng khi soạn đề thi tổng hợp) */
export const listQuestionTags = (contentItemId, scope = "current") =>
  apiClient
    .get("/questions/tags", { params: { contentItemId, scope } })
    .then((r) => r.data);

/** payload: { contentItemId, passageId?, questionKind, promptText?, tag?, imageMediaId?, audioMediaId?, options?, textAnswer?, matchingPairs?, wordChoicePairs? } */
export const createQuestion = (payload) =>
  apiClient.post("/questions", payload).then((r) => r.data);

/** payload cung cau truc Create (tru contentItemId) - BE xoa het dap an cu, tao lai theo noi dung moi */
export const updateQuestion = (id, payload) =>
  apiClient.put(`/questions/${id}`, payload).then((r) => r.data);

export const deleteQuestion = (id) =>
  apiClient.delete(`/questions/${id}`).then((r) => r.data);
