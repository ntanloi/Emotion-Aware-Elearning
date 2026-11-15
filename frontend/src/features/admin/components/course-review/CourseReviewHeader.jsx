import React from 'react'
import { ArrowLeft, Clock, ArrowRight, User, GraduationCap, DollarSign } from 'lucide-react'
import StatusBadge from '@admin/components/ui/StatusBadge.jsx'
import RiskBadge from '@admin/components/ui/RiskBadge.jsx'

export default function CourseReviewHeader({
  course,
  riskLevel = 'LOW',
  onBack,
  nextPendingCourseId,
  onNextPending,
  waitingTime,
  urgencyClass,
}) {
  if (!course) return null

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '12px 18px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        flexWrap: 'wrap',
      }}
    >
      {/* Cụm thông tin khóa học bên trái */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', flex: 1 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#475569',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f1f5f9'
            e.currentTarget.style.color = '#0f172a'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8fafc'
            e.currentTarget.style.color = '#475569'
          }}
          title="Quay lại danh sách khóa học"
        >
          <ArrowLeft size={14} />
          <span>Quay lại</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={course.status} />
          {riskLevel && <RiskBadge level={riskLevel} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            {course.title}
          </h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 12,
              color: '#64748b',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <User size={13} style={{ color: '#94a3b8' }} />
              <strong>{course.teacherName || 'Chưa rõ'}</strong>
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <GraduationCap size={13} style={{ color: '#94a3b8' }} />
              <span>{course.level || 'TOEIC'}</span>
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, color: '#0284c7' }}>
              <span>{course.price ? `${Number(course.price).toLocaleString()} đ` : 'Miễn phí'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Cụm điều hướng & Hàng đợi bên phải */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {course.status === 'PENDING_REVIEW' && waitingTime && (
          <div className={`urgency-badge ${urgencyClass}`}>
            <Clock size={13} />
            <span>Chờ: {waitingTime}</span>
          </div>
        )}

        {nextPendingCourseId && onNextPending && (
          <button
            type="button"
            onClick={onNextPending}
            title="Chuyển tới khóa học chờ duyệt tiếp theo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#ffffff',
              background: '#0284c7',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#0369a1')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0284c7')}
          >
            <span>Khóa tiếp</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
