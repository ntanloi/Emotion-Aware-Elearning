import React, { useState } from 'react'
import { useEventStream } from '@shared/hooks/useEventStream.js'
import { seedDemoViewers } from '@teacher/api/live.js'
import VideoEmotionTimelineModal from '@teacher/components/VideoEmotionTimelineModal.jsx'
import {
  Radio,
  Users,
  AlertTriangle,
  PlayCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  Video,
} from 'lucide-react'

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '00:00'
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
}

export default function LiveClassPanel() {
  const [selectedTimelineLesson, setSelectedTimelineLesson] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [seedNotice, setSeedNotice] = useState(null)

  const { snapshot, latestAlert, status, lastUpdatedAt, reconnect } = useEventStream({
    enabled: true,
    onAlert: (alert) => {
      console.log('[LiveClassPanel] Nhận cảnh báo điểm nghẽn:', alert)
    },
  })

  const lessons = snapshot?.lessons || []
  const totalViewers = lessons.reduce((acc, l) => acc + (l.viewers || 0), 0)

  const handleSeedDemo = async () => {
    setSeeding(true)
    setSeedNotice(null)
    try {
      const res = await seedDemoViewers(5)
      setSeedNotice(res.message || 'Đã tạo 5 học viên giả lập đang học.')
      setTimeout(() => setSeedNotice(null), 5000)
    } catch (err) {
      setSeedNotice(err.response?.data?.message || 'Không thể tạo dữ liệu giả lập. Hãy kiểm tra cài đặt.')
      setTimeout(() => setSeedNotice(null), 5000)
    } finally {
      setSeeding(false)
    }
  }

  const renderStatusBadge = () => {
    switch (status) {
      case 'LIVE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 2px rgba(16,185,129,0.35)',
              }}
            />
            TRỰC TIẾP (LIVE)
          </span>
        )
      case 'CONNECTING':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fefce8',
              color: '#ca8a04',
              border: '1px solid #fef08a',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Đang kết nối luồng...
          </span>
        )
      case 'RECONNECTING':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fff7ed',
              color: '#ea580c',
              border: '1px solid #fed7aa',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Đang nối lại...
          </span>
        )
      case 'FALLBACK':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Dự phòng (Polling 5s)
          </span>
        )
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Thanh trạng thái Header */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {renderStatusBadge()}
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {lastUpdatedAt
              ? `Cập nhật lúc: ${lastUpdatedAt.toLocaleTimeString('vi-VN')}`
              : 'Đang tải dữ liệu thời gian thực...'}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              background: 'var(--surface-2)',
              padding: '3px 10px',
              borderRadius: 6,
            }}
          >
            {totalViewers} học viên trực tuyến
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn secondary sm flex-row"
            onClick={reconnect}
            title="Kết nối lại SSE"
            style={{ gap: 6 }}
          >
            <RefreshCw size={14} />
            <span>Kết nối lại</span>
          </button>

          <button
            type="button"
            className="btn primary sm flex-row"
            onClick={handleSeedDemo}
            disabled={seeding}
            style={{ gap: 6 }}
          >
            <Sparkles size={14} />
            <span>{seeding ? 'Đang tạo...' : 'Tạo học viên thử nghiệm (Demo)'}</span>
          </button>
        </div>
      </div>

      {/* Thông báo tạo Demo thành công/thất bại */}
      {seedNotice && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13.5,
          }}
        >
          {seedNotice}
        </div>
      )}

      {/* Banner thông báo Cảnh báo điểm nghẽn mới nhất nếu có */}
      {latestAlert && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#dc2626" />
            <div>
              <div style={{ fontWeight: 600, color: '#991b1b', fontSize: 14 }}>
                Phát hiện điểm nghẽn tiếp thu tức thời
              </div>
              <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 2 }}>
                Bài giảng: <strong>{latestAlert.lessonTitle}</strong> (đoạn {formatTime(latestAlert.startSec)} - {formatTime(latestAlert.endSec)}) có {latestAlert.nStudents} học viên bối rối hoặc mất tập trung.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() =>
              setSelectedTimelineLesson({
                contentItemId: latestAlert.contentItemId,
                title: latestAlert.lessonTitle,
                startSec: latestAlert.startSec,
              })
            }
            style={{ borderColor: '#fca5a5', color: '#991b1b', whiteSpace: 'nowrap' }}
          >
            Xem dòng thời gian
          </button>
        </div>
      )}

      {/* Danh sách các bài giảng đang có người xem */}
      {lessons.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
            }}
          >
            <Radio size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Chưa có học viên nào đang xem</h3>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-dim)', maxWidth: 520 }}>
            Khi học viên mở video bài giảng trong các khóa học của bạn, số liệu cảm xúc và phân bố mức độ tập trung sẽ tự động hiển thị trực tiếp tại đây mà không cần tải lại trang.
          </p>
          <button
            type="button"
            className="btn secondary sm"
            onClick={handleSeedDemo}
            disabled={seeding}
            style={{ marginTop: 8 }}
          >
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Tạo giả lập 5 học viên để trải nghiệm
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          {lessons.map((lesson) => {
            const dist = lesson.distribution || {}
            const totalInLesson = lesson.viewers || 1

            const pctEngaged = Math.round(((dist.ENGAGED || 0) / totalInLesson) * 100)
            const pctInterested = Math.round(((dist.INTERESTED || 0) / totalInLesson) * 100)
            const pctConfused = Math.round(((dist.CONFUSED || 0) / totalInLesson) * 100)
            const pctBored = Math.round(((dist.BORED || 0) / totalInLesson) * 100)
            const pctNoFace = Math.round(((dist.NO_FACE || 0) / totalInLesson) * 100)

            return (
              <div
                key={lesson.contentItemId}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
                }}
              >
                {/* Header bài giảng */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: 'var(--accent-soft, #eff6ff)',
                        color: 'var(--accent, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Video size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{lesson.title}</h4>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
                        {lesson.viewers} học viên đang theo dõi bài này
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn secondary sm flex-row"
                    onClick={() =>
                      setSelectedTimelineLesson({
                        contentItemId: lesson.contentItemId,
                        title: lesson.title,
                        startSec: lesson.hotSegment ? lesson.hotSegment.startSec : 0,
                      })
                    }
                    style={{ gap: 6 }}
                  >
                    <Eye size={14} />
                    <span>Dòng thời gian video</span>
                  </button>
                </div>

                {/* Thanh tiến độ phân bố cảm xúc */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12.5,
                      fontWeight: 500,
                      marginBottom: 6,
                    }}
                  >
                    <span>Phân bố mức độ tiếp thu ({lesson.viewers} học viên)</span>
                    <span style={{ color: 'var(--text-dim)' }}>Cập nhật mỗi 3s</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      height: 12,
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: 'var(--surface-3, #e2e8f0)',
                      width: '100%',
                    }}
                  >
                    {pctEngaged > 0 && (
                      <div
                        style={{ width: `${pctEngaged}%`, background: '#16a34a' }}
                        title={`Tập trung: ${pctEngaged}% (${dist.ENGAGED})`}
                      />
                    )}
                    {pctInterested > 0 && (
                      <div
                        style={{ width: `${pctInterested}%`, background: '#2563eb' }}
                        title={`Hào hứng: ${pctInterested}% (${dist.INTERESTED})`}
                      />
                    )}
                    {pctConfused > 0 && (
                      <div
                        style={{ width: `${pctConfused}%`, background: '#f59e0b' }}
                        title={`Bối rối: ${pctConfused}% (${dist.CONFUSED})`}
                      />
                    )}
                    {pctBored > 0 && (
                      <div
                        style={{ width: `${pctBored}%`, background: '#ea580c' }}
                        title={`Mất tập trung: ${pctBored}% (${dist.BORED})`}
                      />
                    )}
                    {pctNoFace > 0 && (
                      <div
                        style={{ width: `${pctNoFace}%`, background: '#ef4444' }}
                        title={`Rời màn hình: ${pctNoFace}% (${dist.NO_FACE})`}
                      />
                    )}
                  </div>

                  {/* Chú giải trạng thái */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                      marginTop: 8,
                      fontSize: 12,
                      color: 'var(--text-dim)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#16a34a' }} />
                      Tập trung: {dist.ENGAGED || 0} ({pctEngaged}%)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563eb' }} />
                      Hào hứng: {dist.INTERESTED || 0} ({pctInterested}%)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b' }} />
                      Bối rối: {dist.CONFUSED || 0} ({pctConfused}%)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ea580c' }} />
                      Mất tập trung: {dist.BORED || 0} ({pctBored}%)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} />
                      Rời camera: {dist.NO_FACE || 0} ({pctNoFace}%)
                    </span>
                  </div>
                </div>

                {/* Đoạn video nóng (Hot Segment) nếu có */}
                {lesson.hotSegment && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
                      <AlertTriangle size={16} color="#d97706" />
                      <span>
                        Đoạn video gây bối rối cao: <strong>{formatTime(lesson.hotSegment.startSec)} - {formatTime(lesson.hotSegment.endSec)}</strong> (Tỷ lệ tiêu cực: {Math.round(lesson.hotSegment.negativeRatio * 100)}%)
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() =>
                        setSelectedTimelineLesson({
                          contentItemId: lesson.contentItemId,
                          title: lesson.title,
                          startSec: lesson.hotSegment.startSec,
                        })
                      }
                      style={{ fontSize: 12, padding: '3px 8px' }}
                    >
                      Kiểm tra đoạn này
                    </button>
                  </div>
                )}

                {/* Danh sách học viên cần chú ý */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Học viên cần lưu ý ({lesson.attention?.length || 0})
                  </div>

                  {!lesson.attention || lesson.attention.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: '#16a34a',
                        background: '#f0fdf4',
                        padding: '8px 12px',
                        borderRadius: 6,
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Tất cả học viên trong bài này đều đang tiếp thu ổn định.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                      {lesson.attention.map((att, idx) => {
                        const isConfused = att.state === 'CONFUSED'
                        const stateLabel = isConfused
                          ? 'Bối rối kéo dài'
                          : att.state === 'NO_FACE'
                          ? 'Rời khỏi camera'
                          : 'Mất tập trung kéo dài'

                        const badgeColor = isConfused ? '#d97706' : '#dc2626'
                        const badgeBg = isConfused ? '#fef3c7' : '#fee2e2'

                        return (
                          <div
                            key={idx}
                            style={{
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              padding: '10px 12px',
                              background: 'var(--surface-2)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{att.alias}</span>
                              <span
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: badgeColor,
                                  background: badgeBg,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                }}
                              >
                                {stateLabel}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)' }}>
                              <span>Duy trì: <strong>{att.sinceSec} giây</strong></span>
                              <span>Vị trí video: <strong>{formatTime(att.videoSec)}</strong></span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal dòng thời gian cảm xúc khi bấm xem chi tiết */}
      {selectedTimelineLesson && (
        <VideoEmotionTimelineModal
          isOpen={true}
          onClose={() => setSelectedTimelineLesson(null)}
          contentItemId={selectedTimelineLesson.contentItemId}
          lessonTitle={selectedTimelineLesson.title}
          initialStartSec={selectedTimelineLesson.startSec}
        />
      )}
    </div>
  )
}
