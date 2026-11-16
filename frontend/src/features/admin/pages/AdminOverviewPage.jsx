import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminStats } from '@admin/hooks/useAdminStats.js'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import RiskBadge from '@admin/components/ui/RiskBadge.jsx'
import { formatWaitingTime } from '@admin/utils/adminFormatters.js'
import {
  Clock,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Users,
  GraduationCap,
  ArrowRight,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react'

function getLongestWaitText(items, dateField) {
  if (!items || items.length === 0) return 'Hàng đợi trống'
  let oldestTime = Date.now()
  let hasValidDate = false
  for (const item of items) {
    if (item[dateField]) {
      const t = new Date(item[dateField]).getTime()
      if (t < oldestTime) {
        oldestTime = t
        hasValidDate = true
      }
    }
  }
  if (!hasValidDate) return 'Vừa tiếp nhận'
  const diffHours = Math.floor((Date.now() - oldestTime) / (1000 * 60 * 60))
  if (diffHours < 1) return 'Chờ dưới 1 giờ'
  if (diffHours < 24) return `Chờ lâu nhất ${diffHours} giờ`
  const diffDays = Math.floor(diffHours / 24)
  return `Chờ lâu nhất ${diffDays} ngày`
}

export default function AdminOverviewPage() {
  const navigate = useNavigate()
  const { stats, pendingCourses, pendingReports, modifiedCourses, loading } = useAdminStats(60000)

  const urgentPendingCourses = stats?.urgentPendingCourses || []
  const urgentReports = stats?.urgentReviewReports || []
  const recentModifiedCourses = stats?.recentModifiedCourses || []

  // Tính thời gian chờ lâu nhất cho 2 ô hành động khẩn
  const longestCourseWait = getLongestWaitText(urgentPendingCourses, 'submittedAt')
  const longestReportWait = getLongestWaitText(urgentReports, 'createdAt')

  // Gộp 3 khối thành danh sách "Việc cần xử lý" thống nhất, sắp xếp theo thời gian chờ lâu nhất (FIFO)
  const unifiedQueue = useMemo(() => {
    const list = []

    for (const c of urgentPendingCourses) {
      list.push({
        id: `course-pending-${c.id}`,
        type: 'COURSE_PENDING',
        typeLabel: 'Khóa học mới',
        typeBadgeColor: '#d97706',
        typeBadgeBg: 'rgba(245, 158, 11, 0.12)',
        title: c.title,
        coverUrl: c.coverUrl,
        author: c.teacherName || 'Giảng viên',
        timestamp: c.submittedAt,
        actionUrl: `/admin/moderation/${c.id}`,
        actionLabel: 'Thẩm định',
        riskLevel: c.riskLevel || null,
      })
    }

    for (const c of recentModifiedCourses) {
      list.push({
        id: `course-mod-${c.id}`,
        type: 'COURSE_MODIFIED',
        typeLabel: 'Khóa đã sửa',
        typeBadgeColor: '#2563eb',
        typeBadgeBg: 'rgba(37, 99, 235, 0.12)',
        title: c.title,
        coverUrl: c.coverUrl,
        author: c.teacherName || 'Giảng viên',
        timestamp: c.updatedAt || c.submittedAt,
        actionUrl: `/admin/moderation/${c.id}`,
        actionLabel: 'Thẩm định lại',
        riskLevel: c.riskLevel || null,
      })
    }

    for (const r of urgentReports) {
      list.push({
        id: `report-${r.id}`,
        type: 'REPORT',
        typeLabel: 'Báo cáo đánh giá',
        typeBadgeColor: '#dc2626',
        typeBadgeBg: 'rgba(239, 68, 68, 0.12)',
        title: r.reviewComment ? `"${r.reviewComment}"` : `Báo cáo đánh giá: ${r.courseTitle}`,
        coverUrl: null,
        author: r.reporterName ? `Báo bởi: ${r.reporterName}` : r.courseTitle,
        timestamp: r.createdAt,
        actionUrl: '/admin/reviews?tab=reports',
        actionLabel: 'Xử lý',
        riskLevel: null,
      })
    }

    // Sắp xếp thời gian chờ lâu nhất (timestamp nhỏ nhất) lên trước
    list.sort((a, b) => {
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tA - tB
    })

    return list.slice(0, 8)
  }, [urgentPendingCourses, recentModifiedCourses, urgentReports])

  return (
    <div className="admin-overview-clean" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* 1. Tiêu đề duy nhất chuẩn hóa (không lặp, không văn phong quảng cáo) */}
      <AdminPageHeader title="Tổng quan" />

      {/* 2. Ba thẻ số cần hành động chính (Clickable Action Cards) */}
      <div className="admin-action-card-grid">
        {/* Thẻ 1: Khóa chờ duyệt */}
        <div
          onClick={() => navigate('/admin/courses?tab=PENDING_REVIEW')}
          className={`admin-action-card ${pendingCourses > 0 ? 'has-urgent-warning' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--admin-c-warning-bg)',
                color: 'var(--admin-c-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim, #64748b)' }}>
                Khóa chờ duyệt
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--admin-c-warning)', lineHeight: 1.2, marginTop: 2 }}>
                {loading ? '—' : pendingCourses}
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  className="admin-urgency-chip"
                  style={{
                    backgroundColor: pendingCourses > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    color: pendingCourses > 0 ? '#b45309' : '#059669',
                  }}
                >
                  {longestCourseWait}
                </span>
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="#d97706" style={{ opacity: 0.7 }} />
        </div>

        {/* Thẻ 2: Báo cáo chờ xử lý */}
        <div
          onClick={() => navigate('/admin/reviews?tab=reports')}
          className={`admin-action-card ${pendingReports > 0 ? 'has-urgent-danger' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--admin-c-danger-bg)',
                color: 'var(--admin-c-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Flag size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim, #64748b)' }}>
                Báo cáo chờ xử lý
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--admin-c-danger)', lineHeight: 1.2, marginTop: 2 }}>
                {loading ? '—' : pendingReports}
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  className="admin-urgency-chip"
                  style={{
                    backgroundColor: pendingReports > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    color: pendingReports > 0 ? '#b91c1c' : '#059669',
                  }}
                >
                  {longestReportWait}
                </span>
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="#dc2626" style={{ opacity: 0.7 }} />
        </div>

        {/* Thẻ 3: Đã sửa sau duyệt */}
        <div
          onClick={() => navigate('/admin/courses?tab=FLAGGED')}
          className={`admin-action-card ${modifiedCourses > 0 ? 'has-urgent-info' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--admin-c-info-bg)',
                color: 'var(--admin-c-info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim, #64748b)' }}>
                Đã sửa sau duyệt
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--admin-c-info)', lineHeight: 1.2, marginTop: 2 }}>
                {loading ? '—' : modifiedCourses}
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  className="admin-urgency-chip"
                  style={{
                    backgroundColor: modifiedCourses > 0 ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    color: modifiedCourses > 0 ? '#1d4ed8' : '#059669',
                  }}
                >
                  {modifiedCourses > 0 ? 'Cần thẩm định lại nội dung' : 'Không có sửa đổi mới'}
                </span>
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="#2563eb" style={{ opacity: 0.7 }} />
        </div>
      </div>

      {/* 3. Dải thông tin quy mô hệ thống (3 chỉ số phụ thu gọn) */}
      <div className="admin-stat-strip">
        <div className="admin-stat-item">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <span style={{ color: 'var(--text-dim, #64748b)' }}>Đã xuất bản:</span>
          <strong style={{ color: '#0f172a' }}>{stats?.publishedCourses || 0} khóa học</strong>
        </div>

        <div className="admin-stat-divider" />

        <div className="admin-stat-item">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} color="#2563eb" />
          </div>
          <span style={{ color: 'var(--text-dim, #64748b)' }}>Tổng học viên:</span>
          <strong style={{ color: '#0f172a' }}>{stats?.totalStudents || 0}</strong>
        </div>

        <div className="admin-stat-divider" />

        <div className="admin-stat-item">
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(13, 148, 136, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={16} color="#0d9488" />
          </div>
          <span style={{ color: 'var(--text-dim, #64748b)' }}>Giảng viên:</span>
          <strong style={{ color: '#0f172a' }}>{stats?.totalTeachers || 0}</strong>
        </div>
      </div>

      {/* 4. Danh sách hợp nhất "Việc cần xử lý" (Tối đa 8 dòng, sắp xếp theo thời gian chờ lâu nhất) */}
      <div
        className="card"
        style={{
          borderRadius: '12px',
          padding: '22px 24px',
          background: '#ffffff',
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text, #0f172a)' }}>
            Việc cần xử lý ({unifiedQueue.length})
          </h3>
          {unifiedQueue.length > 0 && (
            <Link
              to="/admin/courses?tab=PENDING_REVIEW"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--accent, #2563eb)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span>Xem hàng đợi đầy đủ</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {unifiedQueue.length === 0 ? (
          <div style={{ padding: '44px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              Hàng đợi công việc sạch sẽ
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Hiện tại không có khóa học hoặc báo cáo vi phạm nào cần quản trị viên phê duyệt.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border, #e2e8f0)',
                    textAlign: 'left',
                    color: 'var(--text-dim, #64748b)',
                    fontSize: 12,
                  }}
                >
                  <th style={{ padding: '10px 12px', width: 140 }}>Phân loại</th>
                  <th style={{ padding: '10px 12px' }}>Đối tượng / Nội dung</th>
                  <th style={{ padding: '10px 12px' }}>Người gửi / Liên quan</th>
                  <th style={{ padding: '10px 12px' }}>Thời gian chờ</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {unifiedQueue.map((item) => {
                  const waitText = formatWaitingTime(item.timestamp)
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Phân loại */}
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm, 6px)',
                            background: item.typeBadgeBg,
                            color: item.typeBadgeColor,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.typeLabel}
                        </span>
                      </td>

                      {/* Tiêu đề / Nội dung */}
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {item.coverUrl && (
                            <img
                              src={item.coverUrl}
                              alt=""
                              style={{
                                width: 44,
                                height: 28,
                                borderRadius: 4,
                                objectFit: 'cover',
                                border: '1px solid var(--border, #e2e8f0)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text, #0f172a)' }}>
                              {item.title}
                            </span>
                            {item.riskLevel && (
                              <div style={{ marginTop: 4 }}>
                                <RiskBadge riskLevel={item.riskLevel} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Người gửi */}
                      <td style={{ padding: '12px', color: 'var(--text-dim, #475569)' }}>
                        {item.author}
                      </td>

                      {/* Thời gian chờ */}
                      <td style={{ padding: '12px', color: 'var(--text-dim, #64748b)', fontSize: 12 }}>
                        {waitText || '—'}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <Link
                          to={item.actionUrl}
                          className="btn primary sm"
                          style={{
                            fontSize: 12,
                            padding: '4px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>{item.actionLabel}</span>
                          <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
