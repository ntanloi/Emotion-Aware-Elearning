import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Flame,
  Smile,
  Target,
  RefreshCw,
  MoreVertical,
  Download,
  ShieldCheck,
  AlertCircle,
  BookOpen,
} from 'lucide-react'
import {
  getStudentReportOverview,
  getStudentLessonEmotions,
  getMyDailyReports,
  getStudentPracticeReport,
  generateTodayDailyReport,
  markDailyReportAsRead,
} from '@student/api/reports.js'
import { myEnrollments } from '@student/api/enrollments.js'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import LessonEmotionDetailModal from '@student/components/LessonEmotionDetailModal.jsx'
import EmotionPrivacyModal from '@student/components/EmotionPrivacyModal.jsx'
import ReportExportModal from '@student/components/ReportExportModal.jsx'
import anhBaoCaoImg from '@/assets/banners/anhBaoCao.png'

// Sub-components theo tab
import ReportOverviewTab from '@student/components/reports/ReportOverviewTab.jsx'
import ReportEmotionsTab from '@student/components/reports/ReportEmotionsTab.jsx'
import ReportPracticeTab from '@student/components/reports/ReportPracticeTab.jsx'

import { formatVnDate } from '@shared/utils/dateTime.js'
export default function StudentReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // 3 Tabs chuẩn hóa (tab 'diary' hoặc 'vocab' cũ tự động ánh xạ vào 'overview')
  const rawTab = searchParams.get('tab') || 'overview'
  const activeTab = rawTab === 'diary' || rawTab === 'vocab' ? 'overview' : rawTab

  // Filters state
  const [days, setDays] = useState(30)
  const [courseId, setCourseId] = useState('')
  const [enrolledCourses, setEnrolledCourses] = useState([])

  // Data states per tab
  const [overviewData, setOverviewData] = useState(null)
  const [dailyReports, setDailyReports] = useState([])
  const [lessonsData, setLessonsData] = useState([])
  const [practiceData, setPracticeData] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  // Modals & Menu dropdown
  const [selectedLessonId, setSelectedLessonId] = useState(null)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  // 1. Tải danh sách khóa học đã đăng ký
  useEffect(() => {
    myEnrollments()
      .then((res) => {
        const courses = (res || []).map((e) => e.course).filter(Boolean)
        setEnrolledCourses(courses)
      })
      .catch((err) => console.error('Lỗi tải danh sách khoá học:', err))
  }, [])

  // 2. Tải dữ liệu tương ứng theo tab (On-demand Lazy Load)
  const fetchData = async () => {
    setLoading(true)
    try {
      // Tab "Sổ câu sai cá nhân" luôn hiển thị toàn bộ câu sai nên không áp dụng bộ lọc số ngày
      const params = {
        ...(activeTab === 'practice' ? {} : { days }),
        ...(courseId ? { courseId } : {}),
      }

      if (activeTab === 'overview') {
        const [ov, reps] = await Promise.all([
          getStudentReportOverview(params).catch(() => null),
          getMyDailyReports().catch(() => []),
        ])
        setOverviewData(ov)
        setDailyReports(reps || [])
      } else if (activeTab === 'emotions') {
        const les = await getStudentLessonEmotions(params)
        setLessonsData(les || [])
      } else if (activeTab === 'practice') {
        const pr = await getStudentPracticeReport(params)
        setPracticeData(pr)
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu báo cáo:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab, days, courseId])

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey })
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleGenerateTodayReport = async () => {
    setGeneratingReport(true)
    try {
      const res = await generateTodayDailyReport()
      if (res && res.id) {
        const updated = await getMyDailyReports()
        setDailyReports(updated || [])
      }
    } catch (err) {
      console.error('Lỗi tạo báo cáo ngày:', err)
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleMarkAsRead = async (reportId) => {
    try {
      await markDailyReportAsRead(reportId)
      setDailyReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'DA_XEM' } : r))
      )
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err)
    }
  }

  const tabList = [
    { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
    { id: 'emotions', label: 'Cảm xúc', icon: Smile },
    { id: 'practice', label: 'Sổ câu sai cá nhân', icon: BookOpen },
  ]

  return (
    <div className="student-reports-page-clean" style={{ paddingBottom: 60 }}>
      {/* Header chỉ hiển thị khi in hoặc lưu PDF */}
      <div className="print-only" style={{ display: 'none', marginBottom: 20 }}>
        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
            HỆ THỐNG E-LEARNING NHẬN DIỆN CẢM XÚC & THÍCH ỨNG
          </h2>
          <h3 style={{ margin: '4px 0 0', fontSize: 15, color: '#334155' }}>
            BÁO CÁO TIẾN ĐỘ VÀ KẾT QUẢ HỌC TẬP
          </h3>
          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', display: 'flex', gap: 20 }}>
            <span>Ngày in: {formatVnDate(new Date())}</span>
            {activeTab !== 'practice' && <span>Khung thời gian: {days} ngày gần nhất</span>}
          </div>
        </div>
      </div>

      {/* Header chuẩn hoá & Thanh điều khiển */}
      <div className="no-print">
        {/* Banner Báo cáo học tập */}
        <div className="reports-header-banner">
          <img
            src={anhBaoCaoImg}
            alt="Banner Báo cáo học tập"
            className="reports-banner-bg-img"
          />
          <div className="reports-banner-content">
            <h1 className="reports-banner-title">Báo cáo học tập</h1>
            <p className="reports-banner-desc">
              Theo dõi toàn diện tiến độ rèn luyện, phân tích mức độ tập trung cảm xúc AI qua Webcam và sổ câu sai TOEIC theo thời gian thực.
            </p>
          </div>
        </div>

        {/* Thanh Tabs & Bộ lọc điều khiển */}
        <div className="reports-filter-bar">
          {/* Tabs Navigation */}
          <div className="reports-tabs-group">
            {tabList.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    marginBottom: -1,
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {tab.id === 'overview' && overviewData?.kpi?.learningStreakDays > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: 'rgba(234, 88, 12, 0.12)',
                        color: '#ea580c',
                        marginLeft: 4,
                      }}
                      title={`Chuỗi học tập: ${overviewData.kpi.learningStreakDays} ngày liên tiếp`}
                    >
                      <Flame size={11} fill="#ea580c" />
                      <span>{overviewData.kpi.learningStreakDays}d</span>
                    </span>
                  )}
                  {tab.id === 'practice' && practiceData?.wrongQuestions?.length > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: '#ef4444',
                        color: '#ffffff',
                        marginLeft: 4,
                      }}
                    >
                      {practiceData.wrongQuestions.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Bộ lọc ngày, khóa học và tùy chọn */}
          <div className="reports-actions-group">
            {/* Pills chọn ngày (ẩn ở tab Sổ câu sai cá nhân) */}
            {activeTab !== 'practice' && (
            <div
              style={{
                display: 'flex',
                background: 'var(--surface-hover, #f1f5f9)',
                padding: 3,
                borderRadius: 8,
                border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
              }}
            >
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  style={{
                    padding: '5px 12px',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: days === d ? 600 : 500,
                    background: days === d ? 'var(--surface, #ffffff)' : 'transparent',
                    color: days === d ? 'var(--accent)' : 'var(--text-dim)',
                    cursor: 'pointer',
                    boxShadow: days === d ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {d} ngày
                </button>
              ))}
            </div>
            )}

            {/* Dropdown Khóa học */}
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border, #e2e8f0)',
                background: 'var(--surface, #ffffff)',
                color: 'var(--text, #0f172a)',
                fontSize: 13,
                fontWeight: 500,
                minWidth: 160,
                cursor: 'pointer',
              }}
            >
              <option value="">Tất cả (Khóa học & Đề thi)</option>
              {enrolledCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Menu Tùy chọn khác (Xuất báo cáo, Quyền riêng tư) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: '7px 10px', borderRadius: 8 }}
                onClick={() => setShowActionsMenu((prev) => !prev)}
                title="Tùy chọn khác"
              >
                <MoreVertical size={14} />
              </button>

              {showActionsMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    background: 'var(--surface, #ffffff)',
                    border: '1px solid var(--border, #e2e8f0)',
                    borderRadius: 8,
                    boxShadow: 'var(--shadow-lg)',
                    padding: 4,
                    minWidth: 170,
                    zIndex: 50,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: 'none',
                      background: 'none',
                      fontSize: 13,
                      color: 'var(--text, #0f172a)',
                      cursor: 'pointer',
                      borderRadius: 6,
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      setShowActionsMenu(false)
                      setShowExportModal(true)
                    }}
                  >
                    <Download size={14} color="#059669" />
                    <span>Xuất dữ liệu & In</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: 'none',
                      background: 'none',
                      fontSize: 13,
                      color: 'var(--text, #0f172a)',
                      cursor: 'pointer',
                      borderRadius: 6,
                      textAlign: 'left',
                    }}
                    onClick={() => {
                      setShowActionsMenu(false)
                      setShowPrivacyModal(true)
                    }}
                  >
                    <ShieldCheck size={14} color="var(--accent)" />
                    <span>Quyền riêng tư</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading state theo cấu trúc phù hợp từng Tab */}
      {loading && !refreshing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeTab === 'overview' && (
            <>
              <div className="report-overview-kpi-grid">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} height={104} borderRadius={12} />
                ))}
              </div>
              <Skeleton height={320} borderRadius={12} />
            </>
          )}

          {activeTab === 'emotions' && (
            <>
              <Skeleton height={46} borderRadius={10} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height={116} borderRadius={12} />
                ))}
              </div>
            </>
          )}

          {activeTab === 'practice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton height={52} borderRadius={12} />
              <Skeleton height={68} borderRadius={10} />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={140} borderRadius={12} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* NỘI DUNG TỪNG TAB */}
      {!loading && activeTab === 'overview' && (
        overviewData ? (
          <ReportOverviewTab
            overviewData={overviewData}
            days={days}
            dailyReports={dailyReports}
            generatingReport={generatingReport}
            onGenerateTodayReport={handleGenerateTodayReport}
            onMarkAsRead={handleMarkAsRead}
          />
        ) : (
          <div
            className="card"
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              borderRadius: 'var(--radius-lg, 12px)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <AlertCircle size={32} style={{ color: 'var(--bad)' }} />
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Không thể tải dữ liệu tổng quan</h4>
              <p className="text-dim text-xs" style={{ margin: 0 }}>Đã xảy ra lỗi khi tải dữ liệu báo cáo. Vui lòng thử lại.</p>
            </div>
            <button
              type="button"
              className="btn primary sm flex-row"
              style={{ gap: 6, minHeight: 38 }}
              onClick={fetchData}
            >
              <RefreshCw size={14} />
              <span>Thử lại</span>
            </button>
          </div>
        )
      )}

      {!loading && activeTab === 'emotions' && (
        <ReportEmotionsTab
          lessonsData={lessonsData}
          onSelectLessonId={(id) => setSelectedLessonId(id)}
          onNavigateCourses={() => navigate('/courses')}
        />
      )}

      {!loading && activeTab === 'practice' && (
        practiceData ? (
          <ReportPracticeTab
            practiceData={practiceData}
            courseId={courseId}
            enrolledCourses={enrolledCourses}
            onRefresh={fetchData}
            onNavigateItem={(id) => navigate(`/content-items/${id}`)}
            onNavigateCourses={() => navigate('/courses')}
            onNavigateTests={() => navigate('/tests')}
          />
        ) : (
          <div
            className="card"
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              borderRadius: 'var(--radius-lg, 12px)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <AlertCircle size={32} style={{ color: 'var(--bad)' }} />
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Không thể tải sổ câu sai</h4>
              <p className="text-dim text-xs" style={{ margin: 0 }}>Đã xảy ra lỗi khi tải dữ liệu sổ câu sai. Vui lòng thử lại.</p>
            </div>
            <button
              type="button"
              className="btn primary sm flex-row"
              style={{ gap: 6, minHeight: 38 }}
              onClick={fetchData}
            >
              <RefreshCw size={14} />
              <span>Thử lại</span>
            </button>
          </div>
        )
      )}

      {/* Modal chi tiết timeline cảm xúc 10s */}
      {selectedLessonId && (
        <LessonEmotionDetailModal
          contentItemId={selectedLessonId}
          lessonSummary={(lessonsData || []).find((l) => l.contentItemId === selectedLessonId)}
          onClose={() => setSelectedLessonId(null)}
        />
      )}

      {/* Modal Quyền riêng tư & Xóa dữ liệu */}
      {showPrivacyModal && (
        <EmotionPrivacyModal
          onClose={() => setShowPrivacyModal(false)}
          onDataDeleted={handleRefresh}
        />
      )}

      {/* Modal Xuất dữ liệu báo cáo */}
      {showExportModal && (
        <ReportExportModal
          days={days}
          courseId={courseId}
          overviewData={overviewData}
          practiceData={practiceData}
          lessonsData={lessonsData}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}