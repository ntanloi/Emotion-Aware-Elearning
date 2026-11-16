import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import * as teacherApi from '@teacher/api/teacher.js'
import {
  Users,
  DollarSign,
  BookOpen,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  ExternalLink,
  Brain,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  BarChart3,
  Folder,
  AlertTriangle,
  Eye,
  Check,
  Radio,
  Clock,
  FileText,
  Video,
  X,
} from 'lucide-react'
import * as alertsApi from '@teacher/api/alerts.js'
import * as teacherTestsApi from '@teacher/api/teacherTests.js'
import VideoEmotionTimelineModal from '@teacher/components/VideoEmotionTimelineModal.jsx'
import TeacherWalletRevenueView from '@teacher/components/TeacherWalletRevenueView.jsx'
import LiveClassPanel from '@teacher/components/LiveClassPanel.jsx'
import { useRealtimeEvent } from '@shared/realtime/index.js'

const COURSE_STATUS_CONFIG = {
  PUBLISHED: {
    label: 'Đang mở bán',
    color: 'var(--good)',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
  },
  PENDING_REVIEW: {
    label: 'Chờ duyệt',
    color: 'var(--warn)',
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  REJECTED: {
    label: 'Bị từ chối',
    color: 'var(--bad)',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
  },
  DRAFT: {
    label: 'Bản nháp',
    color: '#475569',
    background: 'rgba(100, 116, 139, 0.12)',
    border: '1px solid rgba(100, 116, 139, 0.25)',
  },
  HIDDEN: {
    label: 'Đã ẩn',
    color: '#7c3aed',
    background: 'rgba(139, 92, 246, 0.12)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
  },
}

export default function TeacherDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Tab đang chọn: 'transactions' | 'students' | 'courses' | 'emotions'
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const validTabs = ['transactions', 'students', 'courses', 'emotions']
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(tabFromUrl) ? tabFromUrl : 'transactions'
  )

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && validTabs.includes(tab) && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [searchParams])
  // Sub-tab bên trong tab Cảm xúc & Tập trung: 'video' (Bài giảng Video) | 'live' (Lớp học trực tiếp)
  const [emotionSubTab, setEmotionSubTab] = useState('video')
  const [searchTerm, setSearchTerm] = useState('')

  // Khóa học đang chọn để xem chi tiết cảm xúc (null = xem danh sách khóa học)
  const [selectedCourseForEmotion, setSelectedCourseForEmotion] = useState(null)

  // Giai đoạn 8: Modal biểu đồ mốc thời gian bài giảng
  const [timelineModalOpen, setTimelineModalOpen] = useState(false)
  const [selectedTimelineLesson, setSelectedTimelineLesson] = useState(null)

  // H2: Quản lý cảnh báo điểm nghẽn bài giảng (Segment Alerts)
  const [alerts, setAlerts] = useState([])
  const [timelineInitialSec, setTimelineInitialSec] = useState(null)
  const [seedingAlerts, setSeedingAlerts] = useState(false)
  const [testStats, setTestStats] = useState(null)

  const loadAlerts = async () => {
    try {
      const res = await alertsApi.getTeacherAlerts('OPEN')
      setAlerts(res || [])
    } catch (err) {
      console.warn('Lỗi tải cảnh báo bài giảng:', err)
    }
  }

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      await alertsApi.updateAlertStatus(alertId, 'ACKED')
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      loadDashboard()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái cảnh báo')
    }
  }

  const handleDismissAlert = async (alertId) => {
    try {
      await alertsApi.updateAlertStatus(alertId, 'DISMISSED')
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      loadDashboard()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi bỏ qua cảnh báo')
    }
  }

  const sortedAlerts = useMemo(() => {
    const sevOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
    return [...alerts]
      .sort((a, b) => {
        const sa = sevOrder[a.severity] || 1
        const sb = sevOrder[b.severity] || 1
        if (sb !== sa) return sb - sa
        return (b.negativeRatio || 0) - (a.negativeRatio || 0)
      })
      .slice(0, 5)
  }, [alerts])

  const handleOpenAlertSegment = (alert) => {
    setSelectedTimelineLesson({ id: alert.contentItemId, title: alert.lessonTitle })
    setTimelineInitialSec(alert.startSec)
    setTimelineModalOpen(true)
  }

  const handleSeedDemoAlerts = async (studentCount) => {
    try {
      setSeedingAlerts(true)
      const res = await alertsApi.seedDemoAlerts(null, studentCount)
      alert(res.message || 'Thao tác thành công!')
      loadAlerts()
      teacherTestsApi.getTeacherTestStats().then(setTestStats).catch(() => {})
      loadDashboard()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tạo dữ liệu demo')
    } finally {
      setSeedingAlerts(false)
    }
  }

  const handleOpenTimeline = (lessonId, lessonTitle) => {
    setSelectedTimelineLesson({ id: lessonId, title: lessonTitle })
    setTimelineModalOpen(true)
  }

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await teacherApi.getTeacherDashboard()
      setData(res)
      loadAlerts()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // Lắng nghe sự kiện trạng thái khóa học thay đổi hoặc phát sinh doanh thu mới
  useRealtimeEvent('course-status', () => {
    loadDashboard()
  })

  useRealtimeEvent('notification', (payload) => {
    if (payload?.notification?.type === 'FINANCE') {
      loadDashboard()
    }
  })

  // Ký tự viết tắt cho avatar
  const getInitials = (name) => {
    if (!name) return 'HV'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // 1. Lọc giao dịch
  const filteredEnrollments = (data?.recentEnrollments || []).filter((e) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (e.studentName && e.studentName.toLowerCase().includes(term)) ||
      (e.studentEmail && e.studentEmail.toLowerCase().includes(term)) ||
      (e.courseTitle && e.courseTitle.toLowerCase().includes(term)) ||
      (e.orderCode && e.orderCode.toLowerCase().includes(term))
    )
  })

  // 2. Lọc học viên
  const filteredStudents = (data?.students || []).filter((s) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (s.studentName && s.studentName.toLowerCase().includes(term)) ||
      (s.studentEmail && s.studentEmail.toLowerCase().includes(term)) ||
      (s.courseTitle && s.courseTitle.toLowerCase().includes(term))
    )
  })

  // 3. Lọc khóa học
  const filteredCourses = (data?.courses || []).filter((c) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      (c.title && c.title.toLowerCase().includes(term)) ||
      (c.level && c.level.toLowerCase().includes(term))
    )
  })

  const emotionStats = data?.emotionStats || {
    avgFocusScore: 0,
    totalSessions: 0,
    happyPercent: 0,
    neutralPercent: 0,
    confusedPercent: 0,
    boredPercent: 0,
    lessonStats: []
  }

  // Cấu hình 4 Tab Thống kê nguyên khối với màu sắc sống động & trực quan
  const metricTabs = [
    {
      id: 'transactions',
      label: 'Doanh thu thực nhận',
      value: `${Number(data?.netRevenue || 0).toLocaleString('vi-VN')} đ`,
      subtext: `Doanh số ${Number(data?.totalRevenue || 0).toLocaleString('vi-VN')} đ · ${data?.paidOrdersCount ?? 0} đơn`,
      icon: <DollarSign size={24} />,
      theme: {
        primary: 'var(--good)',
        secondary: 'var(--good)',
        light: 'rgba(16, 185, 129, 0.15)',
        lightBorder: 'rgba(16, 185, 129, 0.3)',
        activeBg: 'var(--surface)',
        activeShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.25)',
        iconActiveBg: 'var(--good)',
        iconInactiveBg: 'rgba(16, 185, 129, 0.12)',
        labelColor: 'var(--good)',
        valueColor: 'var(--good)',
      }
    },
    {
      id: 'students',
      label: 'Học viên',
      value: `${data?.totalStudents || 0}`,
      subtext: 'Học viên đang theo học',
      icon: <Users size={24} />,
      theme: {
        primary: 'var(--accent)',
        secondary: 'var(--accent-hover)',
        light: 'rgba(37, 99, 235, 0.15)',
        lightBorder: 'rgba(37, 99, 235, 0.3)',
        activeBg: 'var(--surface)',
        activeShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.25)',
        iconActiveBg: 'var(--accent)',
        iconInactiveBg: 'rgba(37, 99, 235, 0.12)',
        labelColor: 'var(--accent-hover)',
        valueColor: 'var(--accent-hover)',
      }
    },
    {
      id: 'courses',
      label: 'Khóa học của tôi',
      value: `${data?.totalCourses || 0}`,
      subtext: `${data?.publishedCourses || 0} khóa đang mở bán`,
      icon: <BookOpen size={24} />,
      theme: {
        primary: 'var(--warn)',
        secondary: 'var(--warn)',
        light: 'rgba(245, 158, 11, 0.15)',
        lightBorder: 'rgba(245, 158, 11, 0.3)',
        activeBg: 'var(--surface)',
        activeShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.25)',
        iconActiveBg: 'var(--warn)',
        iconInactiveBg: 'rgba(245, 158, 11, 0.12)',
        labelColor: 'var(--warn)',
        valueColor: 'var(--warn)',
      }
    },
    {
      id: 'emotions',
      label: 'Cảm xúc',
      value: emotionStats.avgFocusScore > 0 ? `${emotionStats.avgFocusScore}%` : 'AI',
      subtext: alerts.length > 0 ? (alerts.length + ' đoạn cần xem lại') : 'Video & Lớp học Live',
      icon: <Brain size={24} />,
      theme: {
        primary: 'var(--info)',
        secondary: 'var(--info)',
        light: 'rgba(2, 132, 199, 0.12)',
        lightBorder: 'rgba(2, 132, 199, 0.25)',
        activeBg: 'var(--surface)',
        activeShadow: '0 4px 12px -2px rgba(2, 132, 199, 0.2)',
        iconActiveBg: 'var(--info)',
        iconInactiveBg: 'rgba(2, 132, 199, 0.12)',
        labelColor: 'var(--info)',
        valueColor: 'var(--info)',
      }
    }
  ]

  return (
    <div className="teacher-dashboard-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* 1. Header tinh gọn */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Dashboard Giảng viên</h1>
        <p className="text-dim text-sm" style={{ margin: '4px 0 0 0' }}>
          Tổng quan doanh thu, học viên và phân tích mức độ tập trung học tập.
        </p>
      </div>

      {/* 2. BỘ 4 THẺ CHỈ SỐ GỌN GÀNG, SỐNG ĐỘNG (SaaS Card Layout) */}
      <div className="teacher-stats-kpi-grid">
        {metricTabs.map((tab) => {
          const isActive = activeTab === tab.id
          const t = tab.theme
          return (
            <div
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSearchParams({ tab: tab.id }, { replace: true })
                setSearchTerm('')
                if (tab.id === 'emotions') {
                  setSelectedCourseForEmotion(null)
                }
              }}
              style={{
                cursor: 'pointer',
                borderRadius: 14,
                padding: '16px 18px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isActive ? t.activeBg : 'var(--surface)',
                border: isActive
                  ? `2px solid ${t.primary}`
                  : `1.5px solid ${t.lightBorder}`,
                boxShadow: isActive
                  ? t.activeShadow
                  : '0 2px 6px rgba(0, 0, 0, 0.03)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                userSelect: 'none',
                overflow: 'hidden',
                transform: isActive ? 'translateY(-2px)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.borderColor = t.primary
                  e.currentTarget.style.boxShadow = `0 6px 18px -2px ${t.light}`
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.borderColor = t.lightBorder
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)'
                }
              }}
            >
              {/* Vạch màu chỉ báo Active trên đỉnh */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: t.primary
                  }}
                />
              )}

              {/* Icon khối bo góc có màu sắc nổi bật */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isActive ? t.iconActiveBg : t.iconInactiveBg,
                  color: isActive ? 'var(--surface)' : t.primary,
                  boxShadow: isActive ? `0 4px 12px ${t.light}` : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.icon}
              </div>

              {/* Chi tiết chỉ số */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? t.labelColor : 'var(--text-dim)',
                  marginBottom: 3,
                  transition: 'color 0.2s ease'
                }}>
                  {tab.label}
                </div>
                <div style={{
                  fontSize: 21,
                  fontWeight: 800,
                  color: t.valueColor,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em'
                }}>
                  {tab.value}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  marginTop: 3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {tab.subtext}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. KHUNG NỘI DUNG CHI TIẾT */}
      <div className="card teacher-dashboard-main-card" style={{
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border-subtle)'
      }}>

        {/* ==================== TAB 1: VÍ GIẢNG VIÊN & DOANH THU ==================== */}
        {activeTab === 'transactions' && (
          <TeacherWalletRevenueView />
        )}

        {/* ==================== TAB 2: HỌC VIÊN & TIẾN ĐỘ ==================== */}
        {activeTab === 'students' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} color='var(--secondary)' />
                  <span>Danh sách Học viên &amp; Tiến độ Học tập</span>
                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--secondary)', fontSize: 12 }}>
                    {filteredStudents.length} học viên
                  </span>
                </h3>
                <p className="text-dim text-xs" style={{ margin: '4px 0 0 0' }}>
                  Theo dõi tiến độ hoàn thành các bài học và mức độ chuyên cần của từng học viên.
                </p>
              </div>

              {/* Ô tìm kiếm */}
              <div className="teacher-search-box">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Tìm theo tên học viên, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="clear-btn"
                    title="Xóa tìm kiếm"
                    onClick={() => setSearchTerm('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <RefreshCw size={24} className="spinner text-dim" />
                <p className="text-dim text-sm mt-8">Đang tải danh sách học viên...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface-2)', borderRadius: 12 }}>
                <Users size={36} className="text-dim" style={{ marginBottom: 10, opacity: 0.6 }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Chưa có học viên nào ghi danh</h4>
                <p className="text-dim text-xs" style={{ maxWidth: 420, margin: '0 auto' }}>
                  Học viên khi tham gia hoặc thanh toán khóa học sẽ hiển thị đầy đủ tiến độ tại đây.
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Học viên</th>
                      <th style={{ padding: '12px 14px' }}>Khóa học tham gia</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Ngày bắt đầu học</th>
                      <th style={{ padding: '12px 14px', width: '220px', minWidth: '180px' }}>Tiến độ hoàn thành</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap', width: '140px' }}>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st) => {
                      const pct = Math.round(st.progressPercent || 0)
                      let barColor = 'var(--secondary)'
                      let statusText = 'Mới bắt đầu'
                      let badgeStyle = {
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--color-primary)',
                        border: '1px solid rgba(37, 99, 235, 0.2)'
                      }

                      if (pct >= 100) {
                        barColor = 'var(--good)'
                        statusText = 'Hoàn thành'
                        badgeStyle = {
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--good)',
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }
                      } else if (pct >= 50) {
                        barColor = 'var(--secondary)'
                        statusText = 'Học tích cực'
                        badgeStyle = {
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: 'var(--secondary)',
                          border: '1px solid rgba(59, 130, 246, 0.25)'
                        }
                      } else if (pct > 0) {
                        barColor = 'var(--warn)'
                        statusText = 'Đang tiến hành'
                        badgeStyle = {
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--warn)',
                          border: '1px solid rgba(245, 158, 11, 0.25)'
                        }
                      }

                      return (
                        <tr key={st.enrollmentId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: 'var(--color-primary)',
                                color: 'var(--surface)',
                                fontWeight: 700,
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {getInitials(st.studentName)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{st.studentName}</div>
                                <div className="text-dim text-xs">{st.studentEmail}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <Link
                              to={`/courses/${st.courseId}`}
                              style={{ fontWeight: 500, fontSize: 14, color: 'var(--accent)', textDecoration: 'none' }}
                            >
                              {st.courseTitle}
                            </Link>
                          </td>

                          <td style={{ padding: '12px 14px', fontSize: 12, whiteSpace: 'nowrap' }} className="text-dim">
                            {st.enrolledAt ? new Date(st.enrolledAt).toLocaleDateString('vi-VN') : '—'}
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                flex: 1,
                                height: 8,
                                background: 'var(--surface-2)',
                                borderRadius: 4,
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: barColor,
                                  borderRadius: 4,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>
                                {pct}%
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <span
                              className="badge"
                              style={{
                                ...badgeStyle,
                                fontWeight: 600,
                                fontSize: 12,
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 10px',
                                borderRadius: 16
                              }}
                            >
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: KHÓA HỌC CỦA TÔI ==================== */}
        {activeTab === 'courses' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={20} color='var(--warn)' />
                  <span>Hiệu suất &amp; Danh sách Khóa học</span>
                  <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warn)', fontSize: 12 }}>
                    {filteredCourses.length} khóa học
                  </span>
                </h3>
                <p className="text-dim text-xs" style={{ margin: '4px 0 0 0' }}>
                  Thống kê số lượng học viên và doanh thu thu được từ từng khóa học cụ thể.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {/* Ô tìm kiếm */}
                <div className="teacher-search-box">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm tên khóa học..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="clear-btn"
                      title="Xóa tìm kiếm"
                      onClick={() => setSearchTerm('')}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <RefreshCw size={24} className="spinner text-dim" />
                <p className="text-dim text-sm mt-8">Đang tải danh sách khóa học...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface-2)', borderRadius: 12 }}>
                <BookOpen size={36} className="text-dim" style={{ marginBottom: 10, opacity: 0.6 }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Chưa có khóa học nào</h4>
                <p className="text-dim text-xs" style={{ maxWidth: 420, margin: '0 auto' }}>
                  Bạn chưa tạo khóa học nào trên hệ thống.
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                      <th style={{ padding: '12px 14px' }}>Tên khóa học</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Cấp độ</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Giá niêm yết</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Số học viên</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Doanh số</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', width: 140, minWidth: 140 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c) => (
                      <tr key={c.courseId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</div>
                        </td>

                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span className="badge" style={{ background: 'var(--surface-2)', fontSize: 12 }}>
                            {c.level || 'Mọi cấp độ'}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--good)' }}>
                            {Number(c.price || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const statusInfo = COURSE_STATUS_CONFIG[c.status] || {
                              label: c.status || 'Bản nháp',
                              color: '#475569',
                              background: 'rgba(100, 116, 139, 0.12)',
                              border: '1px solid rgba(100, 116, 139, 0.25)',
                            }
                            return (
                              <span
                                className="badge"
                                style={{
                                  background: statusInfo.background,
                                  color: statusInfo.color,
                                  border: statusInfo.border,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: '4px 10px',
                                  borderRadius: 16,
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                {statusInfo.label}
                              </span>
                            )
                          })()}
                        </td>

                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                            <Users size={14} className="text-dim" />
                            <span>{c.studentCount} học viên</span>
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
                            {Number(c.totalRevenue || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <Link
                              to={`/teacher/courses/${c.courseId}/content?from=dashboard`}
                              className="btn sm secondary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                padding: '6px 12px',
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                                borderRadius: 8,
                              }}
                            >
                              <BookOpen size={13} />
                              <span>Bài giảng</span>
                            </Link>
                            <Link
                              to={`/courses/${c.courseId}`}
                              className="btn sm ghost"
                              style={{
                                padding: '6px 8px',
                                borderRadius: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Xem trang học viên"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: PHÂN TÍCH CẢM XÚC AI ==================== */}
        {activeTab === 'emotions' && (
          <div>
            {/* Thanh chuyển đổi 2 Sub-tab: Bài giảng Video vs Lớp học trực tiếp (Live) */}
            <div className="teacher-emotion-subtabs-wrap">
              <div className="teacher-emotion-subtabs-nav">
                <button
                  type="button"
                  onClick={() => setEmotionSubTab('video')}
                  className={`teacher-emotion-subtab-btn ${emotionSubTab === 'video' ? 'active-video' : ''}`}
                >
                  <Video size={16} />
                  <span>Bài giảng Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEmotionSubTab('live')}
                  className={`teacher-emotion-subtab-btn ${emotionSubTab === 'live' ? 'active-live' : ''}`}
                >
                  <Radio size={16} />
                  <span>Lớp học trực tiếp (Live)</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: emotionSubTab === 'live' ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-3)',
                    color: emotionSubTab === 'live' ? '#dc2626' : 'var(--text-dim)',
                    letterSpacing: '0.04em'
                  }}>
                    LIVE
                  </span>
                </button>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                {emotionSubTab === 'video'
                  ? 'Phân tích biểu cảm học viên qua webcam khi học bài giảng video'
                  : 'Theo dõi mức độ tập trung và biểu cảm học viên trong buổi học trực tiếp'}
              </div>
            </div>

            {/* Nội dung Sub-tab 1: Bài giảng Video */}
            {emotionSubTab === 'video' && (
              <div>
            {/* H2: KHỐI CẢNH BÁO ĐOẠN CẦN XEM LẠI TRONG BÀI GIẢNG */}
            <div
              style={{
                background: alerts.length > 0 ? 'rgba(239, 68, 68, 0.03)' : 'var(--surface-2)',
                border: alerts.length > 0 ? '1.5px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--border-subtle)',
                borderRadius: 14,
                padding: '16px 20px',
                marginBottom: 24,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Header của khối */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: alerts.length > 0 ? 14 : 0,
                  paddingBottom: alerts.length > 0 ? 12 : 0,
                  borderBottom: alerts.length > 0 ? '1px dashed rgba(239, 68, 68, 0.2)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: alerts.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: alerts.length > 0 ? 'var(--bad)' : 'var(--good)',
                      flexShrink: 0,
                    }}
                  >
                    {alerts.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                        Đoạn cần xem lại trong bài giảng (Segment Alerts)
                      </h4>
                      {alerts.length > 0 ? (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--bad)',
                            fontWeight: 700,
                            fontSize: 11.5,
                            padding: '2px 8px',
                            borderRadius: 6
                          }}
                        >
                          {alerts.length} đoạn cần cải thiện {alerts.length > 5 ? '(hiển thị top 5 ưu tiên)' : ''}
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--good)',
                            fontWeight: 600,
                            fontSize: 11.5,
                            padding: '2px 8px',
                            borderRadius: 6
                          }}
                        >
                          Tiếp thu ổn định (0 cảnh báo)
                        </span>
                      )}
                    </div>
                    <p className="text-dim text-xs" style={{ margin: '3px 0 0 0' }}>
                      {alerts.length > 0
                        ? `Hệ thống AI phát hiện ${alerts.length} đoạn video có học viên bối rối hoặc mất tập trung lặp lại, xếp theo mức độ nghiêm trọng.`
                        : 'Không có đoạn bài giảng nào bị học viên mất tập trung hoặc bối rối bất thường. Hệ thống tự động quét định kỳ.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn secondary sm flex-row"
                    onClick={loadAlerts}
                    title="Cập nhật cảnh báo mới nhất từ hệ thống AI"
                    style={{ gap: 5, fontSize: 12, padding: '5px 12px' }}
                  >
                    <RefreshCw size={12} />
                    <span>Quét lại</span>
                  </button>
                </div>
              </div>

              {/* Khung chứa danh sách các card cảnh báo có scrollbox chuyên dụng */}
              {sortedAlerts.length > 0 && (
                <div
                  style={{
                    maxHeight: 460,
                    overflowY: 'auto',
                    paddingRight: 6,
                    scrollbarWidth: 'thin',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                      gap: 14,
                    }}
                  >
                    {sortedAlerts.map((alt) => {
                      const sevColor = alt.severity === 'HIGH' ? 'var(--bad)' : alt.severity === 'MEDIUM' ? 'var(--warn)' : 'var(--info)'
                      const sevBg = alt.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : alt.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                      const sevBorder = alt.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.25)' : alt.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.25)'
                      const sevLabel = alt.severity === 'HIGH' ? 'Ưu tiên cao' : alt.severity === 'MEDIUM' ? 'Ưu tiên vừa' : 'Ưu tiên thấp'

                      const isBored = alt.dominantState === 'BORED'
                      const emotionLabel = isBored ? 'Mất tập trung' : 'Bối rối'
                      const isRecurring = (alt.recurringStudents || 0) > 0

                      return (
                        <div
                          key={alt.id}
                          style={{
                            background: 'var(--surface)',
                            border: `1px solid ${sevBorder}`,
                            borderLeft: `4px solid ${sevColor}`,
                            borderRadius: 10,
                            padding: '14px 16px',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div>
                            {/* Dòng 1: Mốc thời gian & Badge Mức ưu tiên */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  background: 'var(--surface-2)',
                                  color: 'var(--text)',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Clock size={11} /> Mốc: {alt.timeRangeLabel}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: sevBg,
                                  color: sevColor,
                                  border: `1px solid ${sevBorder}`,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                }}
                              >
                                {sevLabel}
                              </span>
                            </div>

                            {/* Tên bài giảng & khóa học */}
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-main)', marginBottom: 2 }}>
                              {alt.lessonTitle || 'Bài giảng Video'}
                            </div>
                            <div className="text-dim text-xs" style={{ marginBottom: 10 }}>
                              Khóa: {alt.courseTitle || 'TOEIC'}
                            </div>

                            {/* Tỷ lệ học sinh ảnh hưởng & Phân loại cảm xúc */}
                            <div
                              style={{
                                background: 'var(--surface-2)',
                                borderRadius: 8,
                                padding: '8px 10px',
                                fontSize: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                marginBottom: 10,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Users size={12} /> Bị ảnh hưởng:
                                </span>
                                <strong style={{ color: sevColor, fontWeight: 700 }}>
                                  {alt.affectedStudents != null ? alt.affectedStudents : alt.nStudents}/{alt.nStudents} học viên ({alt.affectedPercent != null ? alt.affectedPercent : alt.negativePercent}%)
                                </strong>
                              </div>

                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: isBored ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: isBored ? 'var(--warn)' : 'var(--bad)',
                                  }}
                                >
                                  {emotionLabel}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: isRecurring ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                    color: isRecurring ? '#a855f7' : 'var(--info)',
                                  }}
                                >
                                  {isRecurring ? `Tái phát (${alt.recurringStudents} em)` : `Kéo dài (${alt.sustainedStudents || alt.affectedStudents || 0} em)`}
                                </span>
                              </div>
                            </div>

                            {/* Khuyến nghị sư phạm */}
                            {alt.recommendation && (
                              <div
                                style={{
                                  background: 'rgba(37, 99, 235, 0.05)',
                                  borderLeft: '3px solid var(--accent)',
                                  borderRadius: '0 6px 6px 0',
                                  padding: '8px 10px',
                                  fontSize: 11.5,
                                  color: 'var(--text-main)',
                                  lineHeight: 1.45,
                                  display: 'flex',
                                  gap: 6,
                                  alignItems: 'flex-start',
                                }}
                              >
                                <Sparkles size={13} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                                <span>{alt.recommendation}</span>
                              </div>
                            )}
                          </div>

                          {/* Các nút hành động */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            <button
                              type="button"
                              className="btn primary sm flex-row"
                              onClick={() => handleOpenAlertSegment(alt)}
                              style={{ flex: 1, fontSize: 11.5, gap: 4, justifyContent: 'center', minWidth: 95 }}
                            >
                              <Eye size={12} />
                              <span>Xem đoạn</span>
                            </button>
                            <button
                              type="button"
                              className="btn secondary sm flex-row"
                              onClick={() => handleAcknowledgeAlert(alt.id)}
                              style={{ fontSize: 11.5, gap: 4 }}
                              title="Đánh dấu đã xem xét và ghi nhận điểm nghẽn"
                            >
                              <Check size={12} color='var(--good)' />
                              <span>Đã xem</span>
                            </button>
                            <button
                              type="button"
                              className="btn secondary sm flex-row"
                              onClick={() => handleDismissAlert(alt.id)}
                              style={{ fontSize: 11.5, gap: 4, color: 'var(--text-dim)' }}
                              title="Bỏ qua cảnh báo này nếu đây không phải vấn đề sư phạm"
                            >
                              <X size={12} />
                              <span>Bỏ qua</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {!selectedCourseForEmotion ? (
              /* --- LEVEL 1: DANH SÁCH KHÓA HỌC HIỆN CÓ CỦA GIÁO VIÊN --- */
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Brain size={20} color='var(--info)' />
                      <span>Phân tích Cảm xúc &amp; Mức độ Tập trung AI</span>
                    </h3>
                  </div>
                  <p className="text-dim text-xs" style={{ margin: '4px 0 0 0' }}>
                    Hệ thống AI nhận diện biểu cảm khuôn mặt (Webcam) trong lúc học viên học video lý thuyết để đo lường độ tập trung. Vui lòng chọn một khóa học bên dưới để xem chi tiết từng bài giảng.
                  </p>
                </div>

                {/* 4 Thống kê cảm xúc tổng quan của giáo viên */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                  gap: 16,
                  marginBottom: 28
                }}>
                  {/* Happy / Hứng thú (Đồng bộ với bên học viên: Xanh dương / Cyan #06b6d4) */}
                  <div style={{
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '4px solid #06b6d4',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0891b2', marginBottom: 6 }}>
                      <Smile size={18} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Hứng thú</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>
                      {emotionStats.totalSessions > 0 ? `${emotionStats.happyPercent}%` : 'Chờ dữ liệu'}
                    </div>
                    <div className="text-dim text-xs" style={{ marginTop: 4 }}>
                      Học viên tiếp thu tốt, thoải mái
                    </div>
                  </div>

                  {/* Neutral / Tập trung cao (Đồng bộ với bên học viên: Xanh lá cây var(--good) #10b981) */}
                  <div style={{
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '4px solid var(--good)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--good)', marginBottom: 6 }}>
                      <Meh size={18} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Tập trung</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>
                      {emotionStats.totalSessions > 0 ? `${emotionStats.neutralPercent}%` : 'Chờ dữ liệu'}
                    </div>
                    <div className="text-dim text-xs" style={{ marginTop: 4 }}>
                      Chú ý lắng nghe bài giảng
                    </div>
                  </div>

                  {/* Confused / Bối rối (Đồng bộ với bên học viên: Vàng hổ phách var(--warn) #f59e0b) */}
                  <div style={{
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '4px solid var(--warn)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)', marginBottom: 6 }}>
                      <AlertCircle size={18} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Bối rối / Khó hiểu</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>
                      {emotionStats.totalSessions > 0 ? `${emotionStats.confusedPercent}%` : '0%'}
                    </div>
                    <div className="text-dim text-xs" style={{ marginTop: 4 }}>
                      Cần bổ sung giải thích bài học
                    </div>
                  </div>

                  {/* Bored / Mất tập trung (Đồng bộ với bên học viên: Đỏ var(--bad) #ef4444) */}
                  <div style={{
                    background: 'var(--surface-2)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '4px solid var(--bad)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--bad)', marginBottom: 6 }}>
                      <Frown size={18} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>Mất tập trung</span>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>
                      {emotionStats.totalSessions > 0 ? `${emotionStats.boredPercent}%` : '0%'}
                    </div>
                    <div className="text-dim text-xs" style={{ marginTop: 4 }}>
                      Nên chia nhỏ thời lượng video
                    </div>
                  </div>
                </div>

                {/* Bảng Danh sách Khóa học để chọn */}
                <div>
                  <div className="teacher-section-header-wrap">
                    <h4 className="teacher-section-title">
                      <BookOpen size={17} color="var(--accent)" style={{ flexShrink: 0 }} />
                      <span>Chọn Khóa học để xem Hiệu quả Cảm xúc</span>
                      <span className="badge" style={{ background: 'var(--surface-2)', fontSize: 12, flexShrink: 0 }}>
                        {filteredCourses.length} khóa học
                      </span>
                    </h4>
                    <div className="teacher-search-box">
                      <Search size={15} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Tìm tên khóa học..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="clear-btn"
                          title="Xóa tìm kiếm"
                          onClick={() => setSearchTerm('')}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredCourses.length > 0 ? (
                    <div className="table-scroll">
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                            <th style={{ padding: '12px 14px' }}>Khóa học</th>
                            <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Cấp độ</th>
                            <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Số học viên</th>
                            <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Bài giảng Video</th>
                            <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Số lượt đo lường</th>
                            <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Độ tập trung TB</th>
                            <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Đánh giá</th>
                            <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', width: 150, minWidth: 150 }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCourses.map((c) => {
                            const cLessons = (emotionStats.lessonStats || []).filter((l) => l.courseId === c.courseId)
                            const measured = cLessons.filter((l) => l.sessionCount > 0)
                            const totalSessionsInCourse = cLessons.reduce((acc, l) => acc + (l.sessionCount || 0), 0)
                            const courseAvgFocus = measured.length > 0
                              ? Math.round((measured.reduce((acc, l) => acc + l.avgFocus, 0) / measured.length) * 10) / 10
                              : 0

                            return (
                              <tr
                                key={c.courseId}
                                style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedCourseForEmotion(c)
                                  setSearchTerm('')
                                }}
                              >
                                <td style={{ padding: '14px', fontWeight: 700, fontSize: 14 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BookOpen size={16} color="var(--accent)" />
                                    <span>{c.title}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '14px' }}>
                                  <span className="badge" style={{ fontSize: 12, background: 'var(--surface-2)' }}>
                                    {c.level || 'Beginner'}
                                  </span>
                                </td>
                                <td style={{ padding: '14px', fontSize: 14 }}>
                                  {c.studentCount} học viên
                                </td>
                                <td style={{ padding: '14px' }}>
                                  <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent)' }}>
                                    {cLessons.length} bài giảng
                                  </span>
                                </td>
                                <td style={{ padding: '14px', fontSize: 14 }}>
                                  {totalSessionsInCourse > 0 ? `${totalSessionsInCourse} phiên học` : 'Chưa đo lường'}
                                </td>
                                <td style={{ padding: '14px' }}>
                                  {totalSessionsInCourse > 0 ? (
                                    <span style={{
                                      fontWeight: 700,
                                      color: courseAvgFocus >= 70 ? 'var(--good)' : (courseAvgFocus >= 50 ? 'var(--warn)' : 'var(--bad)')
                                    }}>
                                      {courseAvgFocus}%
                                    </span>
                                  ) : (
                                    <span className="text-dim">—</span>
                                  )}
                                </td>
                                <td style={{ padding: '14px' }}>
                                  {totalSessionsInCourse > 0 ? (
                                    <span className="badge" style={{
                                      background: courseAvgFocus >= 70
                                        ? 'rgba(16, 185, 129, 0.12)'
                                        : (courseAvgFocus >= 50 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                                      color: courseAvgFocus >= 70
                                        ? 'var(--good, #10b981)'
                                        : (courseAvgFocus >= 50 ? 'var(--warn)' : 'var(--bad)'),
                                      border: `1px solid ${
                                        courseAvgFocus >= 70
                                          ? 'rgba(16, 185, 129, 0.3)'
                                          : (courseAvgFocus >= 50 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                                      }`,
                                      fontWeight: 600,
                                      fontSize: 12
                                    }}>
                                      {courseAvgFocus >= 70 ? 'Tập trung tốt' : (courseAvgFocus >= 50 ? 'Bình thường' : 'Cần cải thiện')}
                                    </span>
                                  ) : (
                                    <span className="text-dim text-xs">Chưa có dữ liệu</span>
                                  )}
                                </td>
                                <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    className="btn sm primary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedCourseForEmotion(c)
                                      setSearchTerm('')
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      fontSize: 12,
                                      padding: '6px 12px',
                                      whiteSpace: 'nowrap',
                                      fontWeight: 600,
                                      borderRadius: 8,
                                    }}
                                  >
                                    <span>Xem bài giảng</span>
                                    <ArrowRight size={13} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 12 }}>
                      <p className="text-dim" style={{ margin: 0 }}>Không tìm thấy khóa học nào phù hợp.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* --- LEVEL 2: CHI TIẾT BÀI GIẢNG VIDEO CỦA KHÓA HỌC ĐÃ CHỌN --- */
              <div>
                {/* Navigation Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  marginBottom: 20,
                  background: 'var(--surface-1, #fff)',
                  padding: '16px 20px',
                  borderRadius: 14,
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 500px', minWidth: 0 }}>
                    <button
                      type="button"
                      className="btn sm secondary"
                      onClick={() => {
                        setSelectedCourseForEmotion(null)
                        setSearchTerm('')
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 600,
                        fontSize: 13,
                        padding: '8px 14px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Danh sách khóa học</span>
                    </button>

                    <div style={{ height: 32, width: 1, background: 'var(--border-subtle)', flexShrink: 0 }} />

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'var(--text-dim)',
                        fontWeight: 600,
                        marginBottom: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <BookOpen size={13} color="var(--accent)" />
                        <span>Đang xem phân tích cảm xúc khóa học</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: 'var(--text)',
                            lineHeight: 1.3,
                          }}
                          title={selectedCourseForEmotion.title}
                        >
                          {selectedCourseForEmotion.title}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 10px',
                            borderRadius: 12,
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--accent)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {selectedCourseForEmotion.level || 'Beginner'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown đổi nhanh khóa học khác */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Chuyển khóa học:
                    </span>
                    <select
                      className="teacher-select"
                      style={{
                        height: 38,
                        minWidth: 240,
                        maxWidth: 340,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      value={selectedCourseForEmotion.courseId}
                      onChange={(e) => {
                        const found = data?.courses?.find((c) => c.courseId === e.target.value)
                        if (found) {
                          setSelectedCourseForEmotion(found)
                          setSearchTerm('')
                        }
                      }}
                    >
                      {data?.courses?.map((c) => (
                        <option key={c.courseId} value={c.courseId}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Danh sách bài giảng của khóa học này */}
                {(() => {
                  const courseLessons = (emotionStats.lessonStats || []).filter(
                    (l) => l.courseId === selectedCourseForEmotion.courseId
                  )
                  const filteredLessons = courseLessons.filter((l) => {
                    if (!searchTerm.trim()) return true
                    const term = searchTerm.toLowerCase()
                    return (
                      (l.lessonTitle && l.lessonTitle.toLowerCase().includes(term)) ||
                      (l.sectionName && l.sectionName.toLowerCase().includes(term)) ||
                      (l.groupTitle && l.groupTitle.toLowerCase().includes(term))
                    )
                  })

                  const totalSessionsInCourse = courseLessons.reduce((acc, l) => acc + (l.sessionCount || 0), 0)

                  return (
                    <div>
                      <div className="teacher-section-header-wrap">
                        <h4 className="teacher-section-title">
                          <Video size={17} color="var(--accent)" style={{ flexShrink: 0 }} />
                          <span>Hiệu quả Cảm xúc theo từng Bài giảng Video</span>
                          <span className="badge" style={{ background: 'var(--surface-2)', fontSize: 12, flexShrink: 0 }}>
                            {filteredLessons.length} bài giảng video ({totalSessionsInCourse} phiên học)
                          </span>
                        </h4>
                        <div className="teacher-search-box">
                          <Search size={15} className="search-icon" />
                          <input
                            type="text"
                            placeholder="Tìm bài giảng, Part, Nhóm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          {searchTerm && (
                            <button
                              type="button"
                              className="clear-btn"
                              title="Xóa tìm kiếm"
                              onClick={() => setSearchTerm('')}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredLessons.length > 0 ? (
                        <div className="table-scroll">
                          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
                                <th style={{ padding: '12px 14px' }}>Bài giảng Video</th>
                                <th style={{ padding: '12px 14px' }}>Vị trí (Part &amp; Nhóm)</th>
                                <th style={{ padding: '12px 14px' }}>Số lượt đo lường</th>
                                <th style={{ padding: '12px 14px' }}>Điểm tập trung TB</th>
                                <th style={{ padding: '12px 14px' }}>Khuyến nghị sư phạm</th>
                                <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap', width: 160, minWidth: 160 }}>Chi tiết mốc thời gian</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredLessons.map((l) => (
                                <tr key={l.lessonId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ fontSize: 14 }}>{l.lessonTitle}</div>
                                      {l.alertCount > 0 && (
                                        <span
                                          className="badge"
                                          style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: 'var(--bad)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4
                                          }}
                                          title={'Có ' + l.alertCount + ' đoạn học viên cần xem lại'}
                                        >
                                          <AlertCircle size={12} />
                                          {l.alertCount} đoạn cần xem lại
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <span className="badge" style={{
                                        background: 'rgba(99, 102, 241, 0.12)',
                                        color: 'var(--accent)',
                                        fontWeight: 600,
                                        width: 'fit-content',
                                        fontSize: 12
                                      }}>
                                        {l.sectionName || l.sectionCode || 'Mục chung'}
                                      </span>
                                      {l.groupTitle ? (
                                        <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Folder size={12} color="var(--accent)" />
                                          <span>Nhóm: <strong>{l.groupTitle}</strong></span>
                                        </span>
                                      ) : (
                                        <span className="text-dim" style={{ fontSize: 12 }}>
                                          <FileText size={11} style={{ marginRight: 3, verticalAlign: 'middle', display: 'inline' }} /> Trực thuộc mục
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                    <span className="badge" style={{ background: 'var(--surface-2)', fontSize: 12 }}>
                                      {l.sessionCount > 0 ? `${l.sessionCount} phiên học` : '0 phiên học'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                    {l.sessionCount > 0 ? (
                                      <span style={{
                                        fontWeight: 700,
                                        fontSize: 14,
                                        color: l.avgFocus >= 70 ? 'var(--good)' : (l.avgFocus >= 50 ? 'var(--warn)' : 'var(--bad)')
                                      }}>
                                        {l.avgFocus}%
                                      </span>
                                    ) : (
                                      <span className="text-dim">—</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                    <span className="badge" style={{
                                      background: l.sessionCount === 0
                                        ? 'var(--surface-2)'
                                        : (l.alertCount > 0 || l.avgFocus < 50
                                            ? 'rgba(239, 68, 68, 0.12)'
                                            : (l.avgFocus >= 70 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)')),
                                      color: l.sessionCount === 0
                                        ? 'var(--text-dim)'
                                        : (l.alertCount > 0 || l.avgFocus < 50
                                            ? 'var(--bad)'
                                            : (l.avgFocus >= 70 ? 'var(--good, #10b981)' : 'var(--warn)')),
                                      border: `1px solid ${
                                        l.sessionCount === 0
                                          ? 'transparent'
                                          : (l.alertCount > 0 || l.avgFocus < 50
                                              ? 'rgba(239, 68, 68, 0.3)'
                                              : (l.avgFocus >= 70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'))
                                      }`,
                                      fontWeight: 600,
                                      fontSize: 12
                                    }}>
                                      {l.statusLabel === 'Hứng thú tốt' ? 'Tập trung tốt' : l.statusLabel}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <button
                                      type="button"
                                      className="btn sm secondary"
                                      onClick={() => handleOpenTimeline(l.lessonId, `${l.lessonTitle} - ${l.sectionName || ''}`)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 12,
                                        padding: '6px 12px',
                                        whiteSpace: 'nowrap',
                                        fontWeight: 600,
                                        borderRadius: 8,
                                      }}
                                      title="Xem biểu đồ mốc thời gian từng giây của video"
                                    >
                                      <BarChart3 size={13} style={{ color: 'var(--accent)' }} />
                                      <span>Mốc thời gian</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{
                          padding: '30px',
                          background: 'var(--surface-2)',
                          borderRadius: 12,
                          textAlign: 'center'
                        }}>
                          <Brain size={36} color="var(--accent)" style={{ marginBottom: 10, opacity: 0.7 }} />
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                            {searchTerm ? 'Không tìm thấy bài giảng video nào phù hợp' : 'Khóa học này chưa có bài giảng video lý thuyết'}
                          </div>
                          <div className="text-dim text-xs" style={{ maxWidth: 460, margin: '0 auto' }}>
                            {searchTerm
                              ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm.'
                              : 'Giảng viên có thể vào phần Quản lý khóa học > Nội dung để tạo thêm Bài giảng Video.'}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
              </div>
            )}

            {/* Nội dung Sub-tab 2: Lớp học trực tiếp (Live) */}
            {emotionSubTab === 'live' && (
              <LiveClassPanel />
            )}
          </div>
        )}
      </div>


      {/* Giai đoạn 8: Modal biểu đồ mốc thời gian bài giảng video cho Giảng viên */}
      <VideoEmotionTimelineModal
        isOpen={timelineModalOpen}
        onClose={() => {
          setTimelineModalOpen(false)
          setTimelineInitialSec(null)
        }}
        contentItemId={selectedTimelineLesson?.id}
        lessonTitle={selectedTimelineLesson?.title}
        initialStartSec={timelineInitialSec}
      />
    </div>
  )
}
