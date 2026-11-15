import React, { useState, useEffect, useRef } from 'react'
import { getPreviewLessons } from '@shared/api/contentItems.js'
import { PlayCircle, Clock, Sparkles, X, Lock, CheckCircle2, AlertCircle, Video, RotateCcw } from 'lucide-react'

const formatDuration = (totalSec) => {
  if (!totalSec || totalSec <= 0) return 'Xem toàn bộ bài giảng'
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m > 0 && s > 0) return `Xem từ 00:00 đến ${m}p${s}s đầu`
  if (m > 0) return `Xem ${m} phút đầu bài giảng`
  return `Xem ${s} giây đầu bài giảng`
}

const formatSeconds = (sec) => {
  if (isNaN(sec) || sec < 0) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
}

export default function CoursePreviewLessons({ courseId, onEnrollClick }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeLesson, setActiveLesson] = useState(null)

  // State cho trình phát xem thử
  const [currentTime, setCurrentTime] = useState(0)
  const [reachedLimit, setReachedLimit] = useState(false)
  const [useIframeFallback, setUseIframeFallback] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!courseId) return
    setLoading(true)
    getPreviewLessons(courseId)
      .then((data) => {
        setLessons(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.error('Không tải được bài học thử:', err)
        setLessons([])
      })
      .finally(() => setLoading(false))
  }, [courseId])

  const activeVideoUrl = activeLesson?.videoUrl || ''

  // Nhận diện link Google Drive -> ưu tiên stream qua proxy để kiểm soát chính xác timeline video
  const driveMatch = activeVideoUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  const driveFileId = driveMatch ? driveMatch[1] : null
  const driveDirectUrl = driveFileId
    ? `/drive-proxy/download?id=${driveFileId}&export=download`
    : null

  // Nhận diện link YouTube
  const ytMatch = activeVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  const ytVideoId = ytMatch ? ytMatch[1] : null

  // Nhận diện video trực tiếp (mp4, webm, cloudinary hoặc Google Drive direct stream)
  const isNativeVideoUrl = Boolean(
    activeVideoUrl && (
      activeVideoUrl.match(/\.(mp4|webm|ogg|m4v)($|\?)/i) ||
      (activeVideoUrl.includes('cloudinary.com') && activeVideoUrl.includes('/video/'))
    )
  )

  // Ưu tiên phát qua HTML5 <video> native để quản lý chính xác từng giây timeline của video từ 00:00
  const isDirectVideo = (isNativeVideoUrl || Boolean(driveDirectUrl)) && !useIframeFallback
  const isIframe = Boolean(activeVideoUrl && !isDirectVideo)
  const videoSourceUrl = isDirectVideo ? (driveDirectUrl || activeVideoUrl) : activeVideoUrl

  const limitSeconds = activeLesson?.previewDurationSeconds || 0
  const hasLimit = limitSeconds > 0

  const handleOpenPreview = (lesson) => {
    setActiveLesson(lesson)
    setCurrentTime(0)
    setReachedLimit(false)
    setUseIframeFallback(false)
  }

  const handleCloseModal = () => {
    setActiveLesson(null)
    setCurrentTime(0)
    setReachedLimit(false)
    setUseIframeFallback(false)
  }

  // Quản lý vị trí phát theo tiến trình video: Cho xem từ lúc bắt đầu (00:00) đến phút thứ limit
  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeLesson) return
    const cur = videoRef.current.currentTime
    setCurrentTime(cur)

    if (hasLimit && cur >= limitSeconds) {
      videoRef.current.pause()
      videoRef.current.currentTime = limitSeconds
      setReachedLimit(true)
    }
  }

  // Chặn học viên kéo thanh tua (timeline) vượt quá phút giới hạn quy định
  const handleSeeking = () => {
    if (!videoRef.current || !activeLesson) return
    const cur = videoRef.current.currentTime
    if (hasLimit && cur > limitSeconds) {
      // Ép vị trí video quay về đúng mốc giới hạn, dừng phát và khóa lại
      videoRef.current.currentTime = limitSeconds
      videoRef.current.pause()
      setCurrentTime(limitSeconds)
      setReachedLimit(true)
    } else if (hasLimit && cur < limitSeconds && reachedLimit) {
      // Nếu học viên tua lại về trước mốc giới hạn thì mở khóa cho xem tiếp
      setReachedLimit(false)
    }
  }

  const handleRestartPreview = () => {
    setCurrentTime(0)
    setReachedLimit(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }
  }

  // Tạo URL embed cho YouTube có giới hạn end=... hoặc iframe fallback
  const getIframeUrl = () => {
    if (!activeVideoUrl) return ''
    if (ytVideoId) {
      // YouTube embed hỗ trợ tham số end=... chặn phát qua phút thứ limit
      const endParam = hasLimit ? `&end=${limitSeconds}` : ''
      return `https://www.youtube.com/embed/${ytVideoId}?start=0${endParam}&autoplay=1`
    }
    return activeVideoUrl
  }

  if (loading || lessons.length === 0) {
    return null
  }

  return (
    <>
      <div className="course-desc-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h3 className="course-section-title" style={{ margin: 0 }}>
            <PlayCircle size={20} style={{ color: 'var(--accent)' }} />
            <span>Bài giảng học thử miễn phí</span>
            <span
              style={{
                fontSize: 11.5,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--accent)',
                fontWeight: 700,
                marginLeft: 8,
              }}
            >
              {lessons.length} video mở xem thử
            </span>
          </h3>

          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Trải nghiệm chất lượng bài giảng trước khi đăng ký
          </span>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Bạn có thể xem trước các bài giảng thực tế dưới đây để nắm bắt phương pháp truyền đạt và nội dung trước khi quyết định đăng ký khóa học.
        </p>

        {/* Danh sách các video học thử */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => handleOpenPreview(lesson)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                gap: 12,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PlayCircle size={22} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)' }}>
                      {lesson.title}
                    </span>
                    {lesson.groupTitle && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 7px',
                          borderRadius: 6,
                          background: 'var(--surface-2)',
                          color: 'var(--text-dim)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {lesson.groupTitle}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, fontSize: 12.5, color: 'var(--text-dim)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{formatDuration(lesson.previewDurationSeconds)}</span>
                    </span>
                    <span>•</span>
                    <span style={{ color: 'var(--good)', fontWeight: 500 }}>Miễn phí trải nghiệm</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn primary sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenPreview(lesson)
                }}
              >
                <PlayCircle size={15} />
                <span>Học thử ngay</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal phát video học thử */}
      {activeLesson && (
        <div
          className="modal-overlay"
          onClick={handleCloseModal}
          style={{
            zIndex: 1200,
            backdropFilter: 'blur(6px)',
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 860,
              width: '100%',
              borderRadius: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                >
                  HỌC THỬ MIỄN PHÍ
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                  {activeLesson.title}
                </span>
              </div>

              <button
                type="button"
                className="btn ghost sm"
                onClick={handleCloseModal}
                style={{ borderRadius: '50%', width: 32, height: 32, padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Khung phát video */}
            <div
              style={{
                background: '#000',
                position: 'relative',
                width: '100%',
                minHeight: 420,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {activeVideoUrl ? (
                isIframe ? (
                  !reachedLimit ? (
                    <div style={{ position: 'relative', width: '100%', height: 460 }}>
                      <iframe
                        src={getIframeUrl()}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        allow="autoplay; encrypted-media; fullscreen"
                        title={activeLesson.title}
                      />
                      {/* Lớp chặn thanh tua đối với iframe bên ngoài khi có giới hạn thời lượng */}
                      {hasLimit && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 24,
                            left: 0,
                            right: 0,
                            height: 28,
                            zIndex: 10,
                            cursor: 'not-allowed',
                          }}
                          title="Chỉ cho phép xem đoạn đầu từ 00:00 đến giới hạn quy định"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div style={{ height: 460, width: '100%', background: '#0f172a' }} />
                  )
                ) : (
                  <video
                    ref={videoRef}
                    src={videoSourceUrl}
                    controls
                    autoPlay
                    controlsList="nodownload"
                    onTimeUpdate={handleTimeUpdate}
                    onSeeking={handleSeeking}
                    onSeeked={handleSeeking}
                    onError={() => {
                      console.warn('Lỗi phát video trực tiếp, chuyển sang iframe fallback')
                      setUseIframeFallback(true)
                    }}
                    style={{ width: '100%', maxHeight: 480, display: 'block' }}
                  />
                )
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <Video size={48} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <div>Bài giảng này chưa được tải video lên máy chủ.</div>
                </div>
              )}

              {/* Lớp phủ chặn khi đã xem đến mốc giới hạn */}
              {reachedLimit && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.94)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    textAlign: 'center',
                    color: '#fff',
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: 'var(--bad)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <Lock size={28} />
                  </div>

                  <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 8px', color: '#fff' }}>
                    {hasLimit
                      ? `Bạn đã xem đến giới hạn phút ${formatSeconds(limitSeconds)} của bài giảng!`
                      : 'Bạn đã xem hết bài giảng học thử!'}
                  </h3>
                  <p style={{ fontSize: 14, color: '#cbd5e1', maxWidth: 480, margin: '0 0 22px', lineHeight: 1.55 }}>
                    {hasLimit
                      ? `Bài học này chỉ mở xem thử đoạn đầu từ lúc bắt đầu (00:00) đến phút ${formatSeconds(limitSeconds)}. Để xem trọn vẹn toàn bộ bài giảng và lộ trình học đầy đủ, vui lòng đăng ký khóa học.`
                      : 'Để xem trọn vẹn toàn bộ các bài giảng tiếp theo trong lộ trình và nhận hỗ trợ từ AI cảm xúc, vui lòng đăng ký khóa học.'}
                  </p>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600 }}
                      onClick={() => {
                        handleCloseModal()
                        if (onEnrollClick) {
                          onEnrollClick()
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                      }}
                    >
                      Đăng ký khóa học ngay
                    </button>

                    <button
                      type="button"
                      className="btn secondary"
                      style={{
                        padding: '10px 18px',
                        fontSize: 14,
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onClick={handleRestartPreview}
                    >
                      <RotateCcw size={14} />
                      <span>Xem lại từ đầu</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal: Tiến trình video & Lời kêu gọi */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface-2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
                {hasLimit ? (
                  <>
                    <Clock size={15} style={{ color: 'var(--accent)' }} />
                    <span>
                      Đoạn xem thử:{' '}
                      <strong style={{ color: 'var(--text)' }}>Từ 00:00 đến {formatSeconds(limitSeconds)}</strong>
                      <span style={{ margin: '0 8px', opacity: 0.4 }}>•</span>
                      <span>Vị trí video: </span>
                      <strong
                        style={{
                          color: reachedLimit ? 'var(--bad)' : 'var(--accent)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatSeconds(currentTime)}
                      </strong>
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} style={{ color: 'var(--good)' }} />
                    <span>Bạn được xem toàn bộ bài giảng này (100% thời lượng)</span>
                  </>
                )}
              </div>

              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  handleCloseModal()
                  if (onEnrollClick) {
                    onEnrollClick()
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
              >
                Đăng ký khóa học ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
