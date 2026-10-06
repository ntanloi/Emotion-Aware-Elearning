import { useQuery } from '@tanstack/react-query'
import * as dailyReportsApi from '@student/api/dailyReports.js'

/**
 * FR-REP-01/04. Backend chưa có endpoint này (xem docs ghi chú đối chiếu) —
 * query sẽ lỗi 404, UI hiển thị empty-state thay vì crash.
 */
export function useDailyReport() {
  return useQuery({
    queryKey: ['daily-reports', 'mine'],
    queryFn: dailyReportsApi.myDailyReports,
    retry: false,
  })
}
