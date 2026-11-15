import apiClient from '@shared/api/client.js'

/**
 * Student Reports API (Phase R1)
 */
export const getStudentReportOverview = (params = {}) =>
  apiClient.get('/me/reports/overview', { params }).then((r) => r.data)

export const getStudentLessonEmotions = (params = {}) =>
  apiClient.get('/me/reports/emotions/lessons', { params }).then((r) => r.data)

export const getStudentLessonEmotionDetail = (contentItemId) =>
  apiClient.get(`/me/reports/emotions/lessons/${contentItemId}`).then((r) => r.data)

export const getMyDailyReports = () =>
  apiClient.get('/daily-reports/mine').then((r) => r.data)

export const getStudentPracticeReport = (params = {}) =>
  apiClient.get('/me/reports/practice', { params }).then((r) => r.data)

export const getWrongQuestions = (params = {}) =>
  apiClient.get('/me/reports/wrong-questions', { params }).then((r) => r.data)

export const getStudentVocabReport = (params = {}) =>
  apiClient.get('/me/reports/vocab', { params }).then((r) => r.data)

export const generateTodayDailyReport = () =>
  apiClient.post('/daily-reports/generate-today').then((r) => r.data)

export const markDailyReportAsRead = (id) =>
  apiClient.post(`/daily-reports/${id}/read`).then((r) => r.data)

/**
 * Quyền riêng tư dữ liệu cảm xúc (Phase R5)
 */
export const getEmotionPrivacyOverview = () =>
  apiClient.get('/me/privacy/emotion-data').then((r) => r.data)

export const deleteMyEmotionData = () =>
  apiClient.delete('/me/privacy/emotion-data').then((r) => r.data)

/**
 * Xuất báo cáo CSV chuẩn UTF-8 (Phase R5)
 */
function triggerCsvDownload(blobData, filename) {
  const url = window.URL.createObjectURL(new Blob([blobData], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const downloadActivityCsv = async (params = {}) => {
  const response = await apiClient.get('/me/reports/export/activity.csv', {
    params,
    responseType: 'blob',
  })
  triggerCsvDownload(response.data, 'nhat-ky-hoc-tap.csv')
}

export const downloadWrongQuestionsCsv = async (params = {}) => {
  const response = await apiClient.get('/me/reports/export/wrong-questions.csv', {
    params,
    responseType: 'blob',
  })
  triggerCsvDownload(response.data, 'so-cau-sai.csv')
}

export const downloadDailyReportsCsv = async () => {
  const response = await apiClient.get('/me/reports/export/daily-reports.csv', {
    responseType: 'blob',
  })
  triggerCsvDownload(response.data, 'nhat-ky-bao-cao-ngay.csv')
}

