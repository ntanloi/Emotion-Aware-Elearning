import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyEnrollments } from '@student/hooks/useEnroll.js'
import { useCourses } from '@shared/hooks/useCourses.js'
import { useFlashcards } from '@student/hooks/useFlashcards.js'
import { getStudentReportOverview, getMyDailyReports } from '@student/api/reports.js'
import { resolveMediaUrl } from '@config/media.js'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import {
  BookOpen,
  Play,
  User,
  FileText,
  Layers,
  Sparkles,
  Flame,
  Compass,
  ArrowRight,
} from 'lucide-react'

export default function HomeMyCoursesSection({ onExploreCourses }) {
  const navigate = useNavigate()
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments()
  const { data: allCourses, isLoading: coursesLoading } = useCourses()
  const { data: flashcardsList } = useFlashcards()

  // Dữ liệu chỉ số KPI (Streak ngày học) và Lời khuyên sư phạm từ AI
  const [kpiData, setKpiData] = useState(null)
  const [aiAdviceText, setAiAdviceText] = useState('')

  useEffect(() => {
    Promise.all([
      getStudentReportOverview({ days: 30 }).catch(() => null),
      getMyDailyReports().catch(() => []),
    ]).then(([resOv, resReps]) => {
      if (resOv?.kpi) setKpiData(resOv.kpi)
      if (Array.isArray(resReps) && resReps.length > 0) {
        // Tìm báo cáo gần nhất có lời khuyên sư phạm từ AI
        const latestWithAdvice = resReps.find(
          (r) => r.aiAdviceText && r.aiAdviceText.trim() !== '',
        ) || resReps[0]
        if (latestWithAdvice?.aiAdviceText) {
          setAiAdviceText(latestWithAdvice.aiAdviceText)
        }
      }
    })
  }, [])

  const isLoading = enrollLoading || coursesLoading
  const vocabDueCount = (flashcardsList || []).length

  // Ghép danh sách ghi danh với dữ liệu chi tiết của khóa học
  const myEnrolledCourses = useMemo(() => {
    if (!enrollments || !allCourses) return []
    const courseMap = new Map(allCourses.map((c) => [c.id, c]))

    return enrollments.map((enr) => {
      const course = courseMap.get(enr.courseId) || {}
      return {
        ...course,
        id: enr.courseId,
        title: course.title || enr.courseTitle || 'Khóa học TOEIC',
        description: course.description || '',
        level: course.level || 'TOEIC',
        coverUrl: course.coverUrl || null,
        teacherName: course.teacherName || 'Giảng viên chuyên môn',
        enrollmentId: enr.id,
        progressPercent: Math.round(enr.progressPercent || 0),
      }
    })
  }, [enrollments, allCourses])

  // Khóa học đang học dở để tiếp tục
  const activeCourse = useMemo(() => {
    if (myEnrolledCourses.length === 0) return null
    const inProgress = myEnrolledCourses.find(
      (c) => c.progressPercent > 0 && c.progressPercent < 100,
    )
    return inProgress || myEnrolledCourses[0]
  }, [myEnrolledCourses])

  // Lời khuyên sư phạm cá nhân hóa từ AI
  const displayAiAdvice = useMemo(() => {
    if (aiAdviceText && aiAdviceText.trim() !== '') {
      return aiAdviceText
    }
    if (activeCourse?.progressPercent > 0) {
      return `Bạn đang hoàn thành ${activeCourse.progressPercent}% khóa học. Hãy dành 15–20 phút mỗi ngày để củng cố kiến thức vững chắc!`
    }
    return 'Hãy xem bài giảng hôm nay! AI sẽ theo dõi mức độ tập trung để đưa ra gợi ý giải lao và ôn tập phù hợp.'
  }, [aiAdviceText, activeCourse])

  // Các khóa học còn lại (nếu có nhiều hơn 1 khóa)
  const otherCourses = useMemo(() => {
    if (!activeCourse || myEnrolledCourses.length <= 1) return []
    return myEnrolledCourses.filter((c) => c.id !== activeCourse.id)
  }, [myEnrolledCourses, activeCourse])

  // Nếu đang tải thì hiện skeleton nhẹ
  if (isLoading) {
    return (
      <section className="home-command-hub-skeleton">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Skeleton width={200} height={26} borderRadius={8} />
          <Skeleton width={70} height={22} borderRadius={12} />
        </div>
        <Skeleton height={140} borderRadius={14} />
      </section>
    )
  }

  // Nếu người dùng chưa đăng ký khóa học nào: Hiển thị Welcome Hub tạo động lực
  if (myEnrolledCourses.length === 0) {
    return (
      <section className="home-welcome-hub">
        <div className="home-welcome-hub-content">
          <div className="home-welcome-icon-box">
            <Sparkles size={28} className="sparkle-icon" />
          </div>
          <div className="home-welcome-text-wrap">
            <h2 className="home-welcome-title">Bắt đầu hành trình bứt phá TOEIC cùng E-Learning AI</h2>
            <p className="home-welcome-desc">
              Hệ thống theo dõi độ tập trung qua AI theo thời gian thực và tự động tối ưu hóa lịch ôn Flashcards giúp bạn tiết kiệm 50% thời gian học.
            </p>
          </div>
        </div>
        <div className="home-welcome-actions">
          <button
            type="button"
            className="btn hero-btn-primary"
            onClick={() => {
              if (onExploreCourses) {
                onExploreCourses()
              } else {
                document.getElementById('course-list-section')?.scrollIntoView({ behavior: 'smooth' })
              }
            }}
          >
            <Compass size={16} />
            <span>Khám phá khóa học ngay</span>
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate('/tests')}
          >
            <FileText size={15} />
            <span>Kiểm tra trình độ đầu vào</span>
          </button>
        </div>
      </section>
    )
  }

  const streakDays = kpiData?.learningStreakDays || 0

  return (
    <section id="my-courses-section" className="home-command-hub-section">
      {/* Tiêu đề mục Trạm học tập của tôi */}
      <div className="home-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="home-section-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} style={{ color: 'var(--color-primary, #2563eb)' }} />
            <span>Trạm học tập của tôi</span>
          </h2>
          <span className="home-course-counter-pill">
            {myEnrolledCourses.length} khóa học
          </span>
        </div>
      </div>

      {/* Hero Resume Card 2 cột: Bên trái là Khóa học trọng tâm, Bên phải là Cụm chỉ số */}
      {activeCourse && (
        <div className="home-hero-resume-card">
          {/* CỘT TRÁI: KHÓA HỌC TRỌNG TÂM */}
          <div className="resume-card-main">
            <div className="resume-card-cover-wrap" onClick={() => navigate(`/courses/${activeCourse.id}/learn`)}>
              {activeCourse.coverUrl ? (
                <img
                  src={resolveMediaUrl(activeCourse.coverUrl, { width: 400 })}
                  alt={activeCourse.title}
                  className="resume-card-cover"
                />
              ) : (
                <div className="resume-card-cover-placeholder">
                  <BookOpen size={28} />
                </div>
              )}
              <span className="resume-level-tag">{activeCourse.level || 'TOEIC'}</span>
            </div>

            <div className="resume-card-info">
              <div className="resume-badge-row">
                <span className="resume-status-pill">
                  <Play size={11} fill="currentColor" />
                  <span>Đang học dở</span>
                </span>
                <span className="resume-progress-text">
                  {activeCourse.progressPercent}% hoàn thành
                </span>
              </div>

              <h3
                className="resume-course-title"
                onClick={() => navigate(`/courses/${activeCourse.id}/learn`)}
                title={activeCourse.title}
              >
                {activeCourse.title}
              </h3>

              <div className="resume-teacher-row">
                <User size={13} className="text-dim" />
                <span className="text-dim text-xs">
                  {activeCourse.teacherName || 'Giảng viên chuyên môn'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="resume-progress-track">
                <div
                  className="resume-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(0, activeCourse.progressPercent))}%` }}
                />
              </div>

              {/* Action buttons */}
              <div className="resume-actions-row">
                <button
                  type="button"
                  className="btn hero-btn-primary resume-play-btn"
                  onClick={() => navigate(`/courses/${activeCourse.id}/learn`)}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Tiếp tục học ngay</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm resume-outline-btn"
                  onClick={() => navigate(`/courses/${activeCourse.id}`)}
                  title="Xem chi tiết & đề cương khóa học"
                >
                  <FileText size={14} />
                  <span>Đề cương</span>
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: CỤM CHỈ SỐ HỌC TẬP & THÓI QUEN */}
          <div className="resume-card-stats-sidebar">
            {/* Widget 1: Streak */}
            <div className="resume-stat-box streak-stat">
              <div className="stat-icon-circle flame">
                <Flame size={18} />
              </div>
              <div className="stat-text-wrap">
                <span className="stat-label">Chuỗi học tập</span>
                <strong className="stat-value">
                  {streakDays > 0 ? `${streakDays} ngày liên tiếp` : 'Duy trì học hôm nay'}
                </strong>
              </div>
            </div>

            {/* Widget 2: Lời khuyên sư phạm cá nhân hóa từ AI */}
            <div
              className="resume-stat-box ai-advice-stat"
              onClick={() => navigate('/reports?tab=overview')}
              role="button"
              tabIndex={0}
              title="Nhấn để xem chi tiết Nhật ký học tập & Lời khuyên AI"
            >
              <div className="stat-icon-circle sparkles">
                <Sparkles size={17} />
              </div>
              <div className="stat-text-wrap">
                <div className="stat-label-row">
                  <span className="stat-label">Lời khuyên sư phạm từ AI</span>
                  <span className="ai-advice-badge">Cá nhân hóa</span>
                </div>
                <p className="ai-advice-content" title={displayAiAdvice}>
                  "{displayAiAdvice}"
                </p>
              </div>
              <ArrowRight size={13} className="stat-arrow-icon" />
            </div>

            {/* Widget 3: Ôn tập Flashcards */}
            <div
              className="resume-stat-box vocab-stat"
              onClick={() => navigate('/flashcards/review')}
              role="button"
              tabIndex={0}
              title="Nhấn để ôn tập Flashcards ngay"
            >
              <div className="stat-icon-circle vocab">
                <Layers size={18} />
              </div>
              <div className="stat-text-wrap">
                <div className="stat-label-row">
                  <span className="stat-label">Từ vựng Flashcards</span>
                  {vocabDueCount > 0 && (
                    <span className="vocab-due-badge">{vocabDueCount} từ cần ôn</span>
                  )}
                </div>
                <div className="vocab-status-row">
                  <strong className="stat-value text-accent">
                    Ôn tập từ vựng
                  </strong>
                </div>
              </div>
              <ArrowRight size={13} className="stat-arrow-icon" />
            </div>
          </div>
        </div>
      )}

      {/* CÁC KHÓA HỌC KHÁC ĐÃ GHI DANH (NẾU CÓ NHIỀU HƠN 1 KHÓA) */}
      {otherCourses.length > 0 && (
        <div className="home-other-enrolled-section">
          <div className="other-enrolled-heading">
            <span>Khóa học khác của bạn ({otherCourses.length})</span>
          </div>
          <div className="other-enrolled-grid">
            {otherCourses.map((c) => (
              <div
                key={c.id}
                className="other-enrolled-card"
                onClick={() => navigate(`/courses/${c.id}/learn`)}
              >
                <div className="other-enrolled-cover-wrap">
                  {c.coverUrl ? (
                    <img
                      src={resolveMediaUrl(c.coverUrl, { width: 300 })}
                      alt={c.title}
                      className="other-enrolled-cover"
                    />
                  ) : (
                    <div className="other-enrolled-placeholder">
                      <BookOpen size={20} />
                    </div>
                  )}
                  <span className="other-enrolled-level">{c.level || 'TOEIC'}</span>
                </div>
                <div className="other-enrolled-body">
                  <h4 className="other-enrolled-title" title={c.title}>
                    {c.title}
                  </h4>
                  <div className="other-enrolled-progress-row">
                    <span className="text-dim text-xs">Tiến độ:</span>
                    <strong className="text-xs" style={{ color: 'var(--color-primary, #2563eb)' }}>
                      {c.progressPercent}%
                    </strong>
                  </div>
                  <div className="resume-progress-track" style={{ height: 4, marginTop: 4 }}>
                    <div
                      className="resume-progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, c.progressPercent))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
