import { useState, useEffect, useCallback } from 'react'
import * as adminApi from '@admin/api/admin.js'
import { useRealtimeStatus, useRealtimeEvent } from '@shared/realtime/index.js'

/**
 * useAdminStats — Hook dùng chung tải dữ liệu thống kê tổng quan và số việc chờ xử lý (Phase A1).
 * Khi Realtime LIVE: tự động đồng bộ theo tín hiệu push và giãn polling lên 300 giây (5 phút) làm dự phòng.
 * Khi mất Realtime: polling mỗi 60 giây như cũ.
 */
export function useAdminStats(autoPollIntervalMs = 60000) {
  const { isLive } = useRealtimeStatus()
  const [stats, setStats] = useState(null)
  const [unresolvedReportsCount, setUnresolvedReportsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const s = await adminApi.getOverviewStats()
      setStats(s)
      setError(null)
    } catch (e) {
      console.warn('Lỗi tải overview stats:', e)
      setError(e)
    }

    try {
      const r = await adminApi.getAdminReviewReports({ status: 'PENDING', size: 1 })
      setUnresolvedReportsCount(r.totalElements || 0)
    } catch (e) {
      console.warn('Lỗi tải pending reports count:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Lắng nghe tín hiệu push từ hệ thống Realtime
  useRealtimeEvent('admin-stats', () => {
    fetchAll()
  })

  useRealtimeEvent('moderation-run', () => {
    fetchAll()
  })

  useEffect(() => {
    fetchAll()
    const interval = isLive ? 300000 : (autoPollIntervalMs > 0 ? autoPollIntervalMs : 60000)
    const timer = setInterval(fetchAll, interval)
    return () => clearInterval(timer)
  }, [fetchAll, isLive, autoPollIntervalMs])

  return {
    stats,
    pendingCourses: stats?.pendingCourses || 0,
    pendingReports: unresolvedReportsCount || stats?.pendingReviewReports || 0,
    pendingTeachers: stats?.pendingTeachers || 0,
    modifiedCourses: stats?.modifiedCourses || 0,
    loading,
    error,
    refetch: fetchAll,
  }
}
