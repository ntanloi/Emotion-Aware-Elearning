import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMyEnrollments } from '@student/hooks/useEnroll.js'
import { useCourses } from '@shared/hooks/useCourses.js'
import { useFlashcards } from '@student/hooks/useFlashcards.js'
import { resolveMediaUrl } from '@config/media.js'
import PageHeader from '@shared/components/ui/PageHeader.jsx'
import EmptyState from '@shared/components/ui/EmptyState.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import {
  BookOpen,
  Play,
  Search,
  Sparkles,
  ArrowRight,
  User,
  CheckCircle2,
  TrendingUp,
  Layers,
  Compass,
  FileText,
} from 'lucide-react'

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim()
}

/**
 * MyCoursesPage — Trang chủ học tập của Học viên (Student Hub)
 * Thiết kế tinh gọn: Dải "Hôm nay" + Nút chính "Tiếp tục học" + Lưới khóa học tối giản
 */
export default function MyCoursesPage() {
  const navigate = useNavigate()
  const { data: enrollments, isLoading: enrollLoading } = useMyEnrollments()
  const { data: allCourses, isLoading: coursesLoading } = useCourses()
  const { data: flashcardsList } = useFlashcards()
  const [searchTerm, setSearchTerm] = useState('')

  const isLoading = enrollLoading || coursesLoading
  const vocabDueCount = (flashcardsList || []).length

  // Ghép nối danh sách ghi danh với dữ liệu khóa học
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

  // Lọc theo tìm kiếm (chỉ áp dụng khi người học có nhiều hơn 6 khóa)
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return myEnrolledCourses
    const q = searchTerm.toLowerCase().trim()
    return myEnrolledCourses.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        stripHtml(c.description).toLowerCase().includes(q) ||
        c.teacherName?.toLowerCase().includes(q),
    )
  }, [myEnrolledCourses, searchTerm])

  // Xác định khóa học đang học dở để đưa vào dải "Hôm nay"
  const activeCourse = useMemo(() => {
    if (myEnrolledCourses.length === 0) return null
    const inProgress = myEnrolledCourses.find(
      (c) => c.progressPercent > 0 && c.progressPercent < 100,
    )
    return inProgress || myEnrolledCourses[0]
  }, [myEnrolledCourses])

  return (
    <div className="my-courses-page-clean" style={{ paddingBottom: 60 }}>
      {/* 1. Header chuẩn hoá */}
      <PageHeader
        title="Khóa học của tôi"
        description="Theo dõi lộ trình học tập cá nhân và tiếp tục các bài giảng chưa hoàn thành"
        icon={BookOpen}
        actions={
          <Link
            to="/courses"
            className="btn secondary sm flex-row"
            style={{ gap: 6, borderRadius: 'var(--radius, 8px)' }}
          >
            <Compass size={14} color="var(--accent)" />
            <span>Khám phá thêm</span>
          </Link>
        }
      />

      {/* 2. Dải "Hôm nay" (Today's Focus Hub) */}
      {!isLoading && activeCourse && (
        <div
          className="today-learning-strip"
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            border: '1px solid #dbeafe',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '16px 20px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Cột 1: Khóa học trọng tâm hôm nay */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 320px', minWidth: 260 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 'var(--radius-md, 10px)',
                background: 'var(--surface, #ffffff)',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent, #2563eb)',
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.08)',
              }}
            >
              <Play size={18} fill="currentColor" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#2563eb',
                    background: '#dbeafe',
                    padding: '2px 7px',
                    borderRadius: 4,
                  }}
                >
                  Hôm nay
                </span>
                <span className="text-dim text-xs">Tiếp tục bài giảng</span>
              </div>
              <h3
                style={{
                  margin: '3px 0 0',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text, #0f172a)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeCourse.title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div
                  style={{
                    width: 120,
                    height: 5,
                    borderRadius: 3,
                    background: '#e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(3, activeCourse.progressPercent))}%`,
                      height: '100%',
                      background: '#2563eb',
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-dim)' }}>
                  {activeCourse.progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Cột 2: Ôn tập Flashcards */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 16px',
              borderLeft: '1px solid #e2e8f0',
              flex: '0 1 auto',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md, 10px)',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Layers size={16} />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Flashcard đến hạn</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                {vocabDueCount > 0 ? `${vocabDueCount} từ cần ôn` : 'Đã hoàn thành'}
              </div>
            </div>
            <Link
              to="/flashcards/review"
              className="btn secondary sm"
              style={{ borderRadius: 'var(--radius, 8px)', fontSize: 12, marginLeft: 4 }}
            >
              Ôn ngay
            </Link>
          </div>

          {/* Cột 3: Nút hành động chính */}
          <div>
            <button
              type="button"
              className="btn primary flex-row"
              onClick={() => navigate(`/courses/${activeCourse.id}/learn`)}
              style={{
                height: 38,
                padding: '0 18px',
                borderRadius: 'var(--radius, 8px)',
                fontWeight: 600,
                fontSize: 13,
                gap: 6,
              }}
            >
              <Play size={14} fill="currentColor" />
              <span>Tiếp tục học</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Ô tìm kiếm: Chỉ hiện khi học viên có hơn 6 khóa học */}
      {myEnrolledCourses.length > 6 && (
        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim, #64748b)',
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm trong khóa học của bạn..."
            style={{
              width: '100%',
              paddingLeft: 36,
              paddingRight: 12,
              height: 36,
              fontSize: 13,
              borderRadius: 'var(--radius, 8px)',
              border: '1px solid var(--border, #e2e8f0)',
              background: 'var(--surface, #ffffff)',
            }}
          />
        </div>
      )}

      {/* 4. Trạng thái tải dữ liệu (Skeleton) */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="card"
              style={{
                borderRadius: 'var(--radius-lg, 12px)',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <Skeleton height={140} borderRadius="var(--radius-md, 10px)" />
              <Skeleton height={20} width="70%" />
              <Skeleton height={14} width="40%" />
              <Skeleton height={8} width="100%" borderRadius={4} />
              <Skeleton height={38} width="100%" borderRadius="var(--radius, 8px)" />
            </div>
          ))}
        </div>
      )}

      {/* 5. Trạng thái chưa đăng ký khóa học nào */}
      {!isLoading && myEnrolledCourses.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Bạn chưa đăng ký khóa học nào"
          description="Khám phá các khóa học TOEIC theo mục tiêu điểm số và bắt đầu lộ trình học tập cùng AI ngay hôm nay."
          actionText="Khám phá danh sách khóa học"
          onAction={() => navigate('/courses')}
        />
      )}

      {/* 6. Danh sách các khóa học của tôi */}
      {!isLoading && filteredCourses.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {filteredCourses.map((c) => {
            const isFinished = c.progressPercent >= 100
            return (
              <div
                key={c.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-lg, 12px)',
                  border: '1px solid var(--border, #e2e8f0)',
                  background: 'var(--surface, #ffffff)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Ảnh cover 16:9 thu nhỏ */}
                <div
                  style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => navigate(`/courses/${c.id}/learn`)}
                >
                  <div style={{ height: 150, overflow: 'hidden', background: 'var(--surface-2, #f1f5f9)' }}>
                    {c.coverUrl ? (
                      <img
                        src={resolveMediaUrl(c.coverUrl, { width: 500 })}
                        alt={c.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent, #2563eb)',
                        }}
                      >
                        <BookOpen size={36} strokeWidth={1.8} />
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {c.level || 'TOEIC'}
                  </span>
                </div>

                {/* Nội dung khóa học */}
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <User size={13} className="text-dim" />
                    <span className="text-dim text-xs" style={{ fontWeight: 500 }}>
                      {c.teacherName || 'Giảng viên chuyên môn'}
                    </span>
                  </div>

                  <h3
                    onClick={() => navigate(`/courses/${c.id}/learn`)}
                    style={{
                      margin: '0 0 12px',
                      fontSize: 15.5,
                      fontWeight: 700,
                      color: 'var(--text, #0f172a)',
                      cursor: 'pointer',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    title={c.title}
                  >
                    {c.title}
                  </h3>

                  {/* Thanh tiến độ */}
                  <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span className="text-dim text-xs">Tiến độ:</span>
                      <strong style={{ color: isFinished ? '#10b981' : 'var(--accent)', fontSize: 12.5 }}>
                        {c.progressPercent}%
                      </strong>
                    </div>

                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--surface-2, #f1f5f9)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, c.progressPercent))}%`,
                          background: isFinished ? '#10b981' : '#2563eb',
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Nút chính duy nhất: Tiếp tục học + link đề cương thanh lịch */}
                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn primary flex-row"
                      onClick={() => navigate(`/courses/${c.id}/learn`)}
                      style={{
                        flex: 1,
                        height: 38,
                        fontSize: 13,
                        fontWeight: 600,
                        gap: 6,
                        borderRadius: 'var(--radius, 8px)',
                        justifyContent: 'center',
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>{c.progressPercent > 0 ? 'Tiếp tục học' : 'Bắt đầu học'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() => navigate(`/courses/${c.id}`)}
                      title="Xem chi tiết & đề cương"
                      style={{
                        height: 38,
                        padding: '0 12px',
                        borderRadius: 'var(--radius, 8px)',
                        color: 'var(--text-dim, #64748b)',
                      }}
                    >
                      <FileText size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
