import apiClient from '@shared/api/client.js'

/** Tạo đề thi tùy chỉnh mới */
export const createCustomTest = (data) =>
  apiClient.post('/teacher/tests/custom', data).then((r) => r.data)

/** Lấy chi tiết đề thi phục vụ trang soạn đề (Builder) */
export const getTestBuilderDetail = (id) =>
  apiClient.get(`/teacher/tests/${id}/builder`).then((r) => r.data)

/** Thêm câu hỏi từ ngân hàng vào một Part của đề thi */
export const importQuestionsFromBank = (testId, partNo, questionIds) =>
  apiClient
    .post(`/teacher/tests/${testId}/parts/${partNo}/import-from-bank`, { questionIds })
    .then((r) => r.data)

/** Xóa câu hỏi khỏi đề thi */
export const removeQuestionFromTest = (testId, questionId) =>
  apiClient.delete(`/teacher/tests/${testId}/questions/${questionId}`).then((r) => r.data)

/** Xóa đề thi nháp */
export const deleteDraftTest = (testId) =>
  apiClient.delete(`/teacher/tests/${testId}`).then((r) => r.data)

/** Lấy câu hỏi và đoạn văn của 1 Part trong ngân hàng câu hỏi của GV */
export const getBankPart = (partNo) =>
  apiClient.get(`/teacher/question-bank/parts/${partNo}`).then((r) => r.data)

/** Thống kê tổng số câu hỏi theo từng Part trong ngân hàng */
export const getBankSummary = () =>
  apiClient.get('/teacher/question-bank/summary').then((r) => r.data)

/** Xóa câu hỏi khỏi ngân hàng */
export const deleteBankQuestion = (id) =>
  apiClient.delete(`/teacher/question-bank/questions/${id}`).then((r) => r.data)

/** Lấy danh sách câu hỏi của một khóa học theo Part để xem trước khi nhập vào ngân hàng */
export const getCandidateQuestionsFromCourse = (courseId, partNo) =>
  apiClient
    .get('/teacher/question-bank/candidate-questions', {
      params: { courseId, partNo },
    })
    .then((r) => r.data)

/** Nhập (sao chép) câu hỏi từ khóa học vào một Part của ngân hàng câu hỏi */
export const importQuestionsFromCourse = (partNo, questionIds) =>
  apiClient
    .post(`/teacher/question-bank/parts/${partNo}/import-from-course`, { questionIds })
    .then((r) => r.data)

/** Sao chép đề thi từ khóa học vào thư viện đề thi (DRAFT) */
export const snapshotTest = (data) =>
  apiClient.post('/teacher/tests/snapshot', data).then((r) => r.data)

/** Gửi duyệt đề thi lên thư viện */
export const submitTestForReview = (id) =>
  apiClient.post(`/teacher/tests/${id}/submit-review`).then((r) => r.data)

/** Rút yêu cầu duyệt hoặc Ẩn/Hiện đề thi */
export const toggleTestStatus = (id) =>
  apiClient.post(`/teacher/tests/${id}/toggle-status`).then((r) => r.data)

/** Lấy danh sách đề thi do giảng viên đóng góp */
export const listTeacherTests = (params) =>
  apiClient.get('/teacher/tests', { params }).then((r) => r.data)

/** Lấy thống kê lượt làm bài và điểm số đề thi của giảng viên */
export const getTeacherTestStats = () =>
  apiClient.get('/teacher/tests/stats').then((r) => r.data)
