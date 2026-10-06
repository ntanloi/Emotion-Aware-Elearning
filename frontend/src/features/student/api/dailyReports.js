import apiClient from '@shared/api/client.js'

/**
 * FR-REP-01/04: Báo cáo ngày của học viên.
 * LƯU Ý: backend hiện CHƯA có endpoint /api/daily-reports/mine — xem
 * docs/giai-doan-5-6-ghi-chu-doi-chieu.md. DailyReportPage tự xử lý lỗi 404
 * bằng empty-state, không chặn luồng chính.
 */
export const myDailyReports = () => apiClient.get('/daily-reports/mine').then((r) => r.data)
