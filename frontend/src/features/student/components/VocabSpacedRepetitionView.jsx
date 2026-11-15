import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Volume2,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  PlayCircle,
  HelpCircle,
  Info,
  X,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'

export default function VocabSpacedRepetitionView({ vocabData, onRefresh }) {
  const navigate = useNavigate()
  const [playingAudio, setPlayingAudio] = useState(null)
  const [showSpacedRepInfo, setShowSpacedRepInfo] = useState(false)
  const infoRef = useRef(null)

  // Đóng popover khi nhấn/chạm bên ngoài màn hình (hỗ trợ cả mobile touch và desktop click)
  useEffect(() => {
    if (!showSpacedRepInfo) return
    const handleOutsideClick = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) {
        setShowSpacedRepInfo(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [showSpacedRepInfo])

  if (!vocabData) {
    return (
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
          <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Không thể tải dữ liệu từ vựng</h4>
          <p className="text-dim text-xs" style={{ margin: 0 }}>Đã xảy ra lỗi khi kết nối dữ liệu flashcard. Vui lòng thử lại.</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            className="btn primary sm flex-row"
            style={{ gap: 6, minHeight: 38 }}
            onClick={onRefresh}
          >
            <RefreshCw size={14} />
            <span>Thử lại</span>
          </button>
        )}
      </div>
    )
  }

  const { kpi = {}, forecast = {}, sets = [], dueWords = [] } = vocabData
  const totalWords = Number(kpi.totalWords) || 0
  const isZeroWords = totalWords === 0

  const playAudio = (url) => {
    if (!url) return
    if (playingAudio) {
      playingAudio.pause()
    }
    const audio = new Audio(url)
    setPlayingAudio(audio)
    audio.play().catch((err) => console.error('Audio play error:', err))
  }

  // Dữ liệu biểu đồ dự báo ôn tập giãn cách Spaced Repetition
  const forecastChartData = [
    { label: 'Hôm nay', count: Number(forecast.dueToday) || 0, color: '#ef4444' },
    { label: 'Ngày mai (+1d)', count: Number(forecast.dueTomorrow) || 0, color: '#f59e0b' },
    { label: '2-3 ngày tới', count: Number(forecast.dueIn3Days) || 0, color: '#3b82f6' },
    { label: '4-7 ngày tới', count: Number(forecast.dueIn7Days) || 0, color: '#6366f1' },
    { label: 'Sau 7 ngày', count: Number(forecast.dueLater) || 0, color: '#10b981' },
  ]
  const totalForecastCount = forecastChartData.reduce((sum, item) => sum + item.count, 0)
  const hasForecastData = totalForecastCount > 0

  // 1. Trường hợp kpi.totalWords === 0: Không có từ vựng trong chu trình ôn tập
  if (isZeroWords) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Empty state ngắn gọn */}
        <div
          className="card"
          style={{
            padding: '36px 20px',
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
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary, #6366f1)',
            }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>
              Chưa có từ vựng trong tiến trình ôn tập
            </h4>
            <div className="flex-row" style={{ gap: 6, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <p className="text-dim text-xs" style={{ margin: 0, maxWidth: 440, lineHeight: 1.5 }}>
                Bắt đầu học các bộ từ vựng dưới đây để kích hoạt chu trình ghi nhớ ngắt quãng (Spaced Repetition).
              </p>
              <div style={{ position: 'relative', display: 'inline-flex' }} ref={infoRef}>
                <button
                  type="button"
                  onClick={() => setShowSpacedRepInfo((v) => !v)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 3,
                    cursor: 'pointer',
                    color: showSpacedRepInfo ? 'var(--accent, #6366f1)' : 'var(--text-dim)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                  }}
                  title="Bấm để xem giải thích nguyên lý Spaced Repetition"
                  aria-label="Giải thích nguyên lý Spaced Repetition"
                >
                  <Info size={15} />
                </button>

                {showSpacedRepInfo && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 60,
                      width: 'min(360px, calc(100vw - 32px))',
                      background: 'var(--surface, #ffffff)',
                      border: '1px solid var(--border, #e2e8f0)',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-xl, 0 10px 25px -5px rgba(0, 0, 0, 0.15))',
                      padding: '14px 16px',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text, #0f172a)',
                      textAlign: 'left',
                    }}
                    role="tooltip"
                  >
                    <div className="flex-between" style={{ marginBottom: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 13.5, color: 'var(--accent, #6366f1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Info size={15} />
                        <span>Nguyên lý Spaced Repetition</span>
                      </strong>
                      <button
                        type="button"
                        onClick={() => setShowSpacedRepInfo(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: 2,
                          display: 'flex',
                          borderRadius: 4,
                        }}
                        aria-label="Đóng"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted, #475569)', fontSize: 12.5 }}>
                      Hệ thống tự động nhắc bạn ôn từ vựng theo chu kỳ khoa học: <strong>1 ngày</strong> (Đang học) → <strong>3 ngày</strong> (Nhớ lần đầu) → <strong>7 ngày</strong> (Đã thuộc vững) để củng cố trí nhớ dài hạn và chống lại đường cong quên lãng.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách Tiến độ theo từng Bộ từ vựng với nút "Bắt đầu học" */}
        <div className="card" style={{ padding: 20 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                Tiến độ theo từng Bộ từ vựng ({sets.length})
              </h3>
              <p className="text-dim text-xs" style={{ margin: '4px 0 0' }}>
                Các bộ Flashcard thuộc khóa học của bạn
              </p>
            </div>
            <span className="badge neutral">{sets.length} bộ</span>
          </div>

          {sets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span>Chưa có bộ từ vựng nào trong khóa học đã đăng ký.</span>
              <button
                type="button"
                className="btn primary sm flex-row"
                style={{ gap: 6 }}
                onClick={() => navigate('/courses')}
              >
                <BookOpen size={14} />
                <span>Khám phá các khóa học</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sets.map((set) => {
                const setId = set.setId || set.id
                return (
                  <div
                    key={setId || set.title}
                    style={{
                      background: 'var(--surface-hover, #f8fafc)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 14,
                    }}
                  >
                    <div style={{ minWidth: 220, flex: 1 }}>
                      <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                        {set.courseTitle && (
                          <span className="badge neutral" style={{ fontSize: 11 }}>
                            {set.courseTitle}
                          </span>
                        )}
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                          {set.title}
                        </h4>
                      </div>
                      {set.sampleWords && set.sampleWords.length > 0 && (
                        <div className="text-dim text-xs" style={{ marginTop: 4 }}>
                          Từ mẫu: {set.sampleWords.join(', ')}...
                        </div>
                      )}
                    </div>

                    {/* Progress bar & Stats */}
                    <div style={{ minWidth: 180 }}>
                      <div className="flex-between text-xs" style={{ marginBottom: 4 }}>
                        <span className="text-dim">Đã thuộc {set.masteredWords || 0}/{set.totalWords || 0} từ</span>
                        <strong style={{ color: (set.progressPercent || 0) >= 80 ? 'var(--good, #10b981)' : 'var(--accent)' }}>
                          {set.progressPercent || 0}%
                        </strong>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 6,
                          background: 'var(--border, #e5e7eb)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, set.progressPercent || 0)}%`,
                            height: '100%',
                            background: (set.progressPercent || 0) >= 80 ? 'var(--good, #10b981)' : 'var(--accent)',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>

                    {/* Nút Bắt đầu học */}
                    <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn primary sm flex-row"
                        style={{ gap: 6, flexShrink: 0, minHeight: 36 }}
                        onClick={() => {
                          if (setId) {
                            navigate(`/flashcards/review?setId=${setId}`)
                          } else if (set.courseId) {
                            navigate(`/courses/${set.courseId}/learn`)
                          } else {
                            navigate('/courses')
                          }
                        }}
                        title="Bắt đầu ôn tập bộ từ vựng này"
                      >
                        <PlayCircle size={14} />
                        <span>Bắt đầu học</span>
                      </button>
                      {set.courseId && setId && (
                        <button
                          type="button"
                          className="btn secondary sm flex-row"
                          style={{ gap: 5, flexShrink: 0, minHeight: 36, fontSize: 12.5 }}
                          onClick={() => navigate(`/content-items/${setId}?courseId=${set.courseId}&section=VOCAB`)}
                          title="Vào bài học từ vựng trong khóa học"
                        >
                          <span>Bài học khóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 2. Trường hợp kpi.totalWords > 0: Đã có dữ liệu từ vựng
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar: Tiêu đề + icon ℹ️ giải thích Spaced Repetition + Nút Ôn tập duy nhất */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div className="flex-row" style={{ gap: 8, alignItems: 'center', position: 'relative' }} ref={infoRef}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            Tiến trình ghi nhớ từ vựng
          </h3>
          <button
            type="button"
            onClick={() => setShowSpacedRepInfo((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: showSpacedRepInfo ? 'var(--accent, #6366f1)' : 'var(--text-dim)',
              borderRadius: 6,
              transition: 'color 0.15s ease',
            }}
            aria-label="Giải thích nguyên lý Spaced Repetition"
            title="Bấm để xem giải thích nguyên lý Spaced Repetition"
          >
            <Info size={17} />
          </button>

          {showSpacedRepInfo && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 60,
                width: 'min(360px, calc(100vw - 32px))',
                background: 'var(--surface, #ffffff)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-xl, 0 10px 25px -5px rgba(0, 0, 0, 0.15))',
                padding: '14px 16px',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text, #0f172a)',
              }}
              role="tooltip"
            >
              <div className="flex-between" style={{ marginBottom: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 13.5, color: 'var(--accent, #6366f1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={15} />
                  <span>Nguyên lý Spaced Repetition</span>
                </strong>
                <button
                  type="button"
                  onClick={() => setShowSpacedRepInfo(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    borderRadius: 4,
                  }}
                  aria-label="Đóng"
                >
                  <X size={15} />
                </button>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted, #475569)', fontSize: 12.5 }}>
                Hệ thống tự động nhắc bạn ôn từ vựng theo chu kỳ khoa học: <strong>1 ngày</strong> (Đang học) → <strong>3 ngày</strong> (Nhớ lần đầu) → <strong>7 ngày</strong> (Đã thuộc vững) để củng cố trí nhớ dài hạn và chống lại đường cong quên lãng.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn primary sm flex-row"
          style={{ gap: 6, minHeight: 36 }}
          onClick={() => navigate('/flashcards/review')}
        >
          <PlayCircle size={15} />
          <span>Ôn tập ngay</span>
        </button>
      </div>

      {/* 4 Thẻ KPI: Đã thuộc, Đang học, Cần ôn hôm nay, Tỷ lệ nhớ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 14,
        }}
      >
        {/* 1. Đã thuộc (Mastered) */}
        <div className="card" style={{ padding: 16 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center', color: '#10b981' }}>
            <CheckCircle2 size={17} />
            <span className="text-dim text-xs font-medium">Đã thuộc (Mastered)</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: '#10b981' }}>
            {kpi.masteredWords || 0} <span style={{ fontSize: 13, fontWeight: 400 }}>từ</span>
          </div>
          <div className="text-dim text-xs" style={{ marginTop: 4 }}>
            Nhớ vững vàng
          </div>
        </div>

        {/* 2. Đang học (Learning) */}
        <div className="card" style={{ padding: 16 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center', color: '#f59e0b' }}>
            <TrendingUp size={17} />
            <span className="text-dim text-xs font-medium">Đang học (Learning)</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: '#d97706' }}>
            {kpi.learningWords || 0} <span style={{ fontSize: 13, fontWeight: 400 }}>từ</span>
          </div>
          <div className="text-dim text-xs" style={{ marginTop: 4 }}>
            Trong chu kỳ lặp lại
          </div>
        </div>

        {/* 3. Cần ôn hôm nay */}
        <div
          className="card"
          style={{
            padding: 16,
            borderColor: (kpi.dueForReviewCount || 0) > 0 ? '#fecaca' : undefined,
          }}
        >
          <div className="flex-row" style={{ gap: 8, alignItems: 'center', color: (kpi.dueForReviewCount || 0) > 0 ? '#ef4444' : 'var(--text-dim)' }}>
            <Clock size={17} />
            <span className="text-dim text-xs font-medium">Cần ôn hôm nay</span>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginTop: 6,
              color: (kpi.dueForReviewCount || 0) > 0 ? '#dc2626' : 'var(--text)',
            }}
          >
            {kpi.dueForReviewCount || 0} <span style={{ fontSize: 13, fontWeight: 400 }}>từ</span>
          </div>
          <div className="text-dim text-xs" style={{ marginTop: 4 }}>
            {(kpi.dueForReviewCount || 0) > 0 ? 'Đến hạn kiểm tra' : 'Đã hoàn thành'}
          </div>
        </div>

        {/* 4. Tỷ lệ nhớ */}
        <div className="card" style={{ padding: 16 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center', color: '#06b6d4' }}>
            <Sparkles size={17} />
            <span className="text-dim text-xs font-medium">Tỷ lệ nhớ</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--text)' }}>
            {kpi.retentionRate || 0}%
          </div>
          <div
            style={{
              width: '100%',
              height: 5,
              background: 'var(--border, #e5e7eb)',
              borderRadius: 3,
              marginTop: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, kpi.retentionRate || 0)}%`,
                height: '100%',
                background: '#06b6d4',
                borderRadius: 3,
              }}
            />
          </div>
        </div>
      </div>

      {/* Biểu đồ dự báo Spaced Repetition (Ẩn nếu mọi giá trị = 0) */}
      {hasForecastData && (
        <div className="card" style={{ padding: 20 }}>
          <div className="flex-between" style={{ marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                Lịch dự báo ôn tập giãn cách (Spaced Repetition)
              </h3>
              <p className="text-dim text-xs" style={{ margin: '4px 0 0' }}>
                Phân bố số từ đến hạn ôn theo chu kỳ 1 ngày → 3 ngày → 7 ngày
              </p>
            </div>
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
          </div>

          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const d = payload[0].payload
                    return (
                      <div
                        style={{
                          background: '#1f2937',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{d.label}</div>
                        <div style={{ marginTop: 2 }}>
                          Số từ đến hạn: <strong>{d.count} từ</strong>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {forecastChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Danh sách từ vựng cần ôn tập ngay (Chỉ giữ thông tin từ, bỏ nút Mở toàn bộ thẻ để ôn) */}
      <div className="card" style={{ padding: 20 }}>
        <div className="flex-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
            <Clock size={17} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Từ vựng cần ôn tập ngay ({dueWords.length})
            </h3>
          </div>
          <span className="text-dim text-xs">
            Đến hạn kiểm tra hoặc đang trong chu kỳ củng cố
          </span>
        </div>

        {dueWords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <CheckCircle2 size={36} color="var(--good, #10b981)" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Bạn đã hoàn thành mọi từ vựng cần ôn hôm nay!
            </h4>
            <p className="text-dim text-xs" style={{ margin: '6px 0 0' }}>
              Hãy quay lại vào ngày mai theo lịch Spaced Repetition để củng cố trí nhớ nhé.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {dueWords.map((w) => (
              <div
                key={w.wordId}
                style={{
                  background: 'var(--surface-hover, #f8fafc)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Header từ vựng */}
                <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div className="flex-row" style={{ gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        {w.word}
                      </span>
                      {w.partOfSpeech && (
                        <span className="badge neutral" style={{ fontSize: 10, padding: '1px 5px' }}>
                          {w.partOfSpeech}
                        </span>
                      )}
                    </div>
                    {w.ipa && <div className="text-dim text-xs" style={{ marginTop: 2 }}>{w.ipa}</div>}
                  </div>

                  {/* Nút nghe phát âm */}
                  {(w.audioUsUrl || w.audioUkUrl) && (
                    <button
                      type="button"
                      className="btn secondary sm"
                      style={{ padding: '4px 8px', borderRadius: 6 }}
                      onClick={() => playAudio(w.audioUsUrl || w.audioUkUrl)}
                      title="Nghe phát âm"
                      aria-label={`Nghe phát âm từ ${w.word}`}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>

                {/* Nghĩa tiếng Việt */}
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>
                  {w.meaningVi}
                </div>

                {/* Ví dụ mẫu nếu có */}
                {w.exampleEn && (
                  <div
                    style={{
                      background: 'var(--surface)',
                      padding: 8,
                      borderRadius: 6,
                      fontSize: 12,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontStyle: 'italic', color: '#334155' }}>"{w.exampleEn}"</div>
                    {w.exampleVi && <div className="text-dim text-xs" style={{ marginTop: 2 }}>{w.exampleVi}</div>}
                  </div>
                )}

                {/* Footer status */}
                <div className="flex-between text-xs" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <span
                    className={`badge ${
                      w.daysOverdue > 0 ? 'bad' : 'warn'
                    }`}
                    style={{ fontSize: 10, padding: '2px 6px' }}
                  >
                    {w.daysOverdue > 0 ? `Quá hạn ${w.daysOverdue} ngày` : 'Hạn hôm nay'}
                  </span>
                  <span className="text-dim">{w.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tiến độ theo từng Bộ từ vựng (Vocab Sets) */}
      <div className="card" style={{ padding: 20 }}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Tiến độ theo từng Bộ từ vựng ({sets.length})
            </h3>
            <p className="text-dim text-xs" style={{ margin: '4px 0 0' }}>
              Các bộ Flashcard thuộc khóa học của bạn
            </p>
          </div>
          <span className="badge neutral">{sets.length} bộ</span>
        </div>

        {sets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)' }}>
            Chưa có bộ từ vựng nào trong khóa học đã đăng ký.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sets.map((set) => {
              const setId = set.setId || set.id
              return (
                <div
                  key={setId || set.title}
                  style={{
                    background: 'var(--surface-hover, #f8fafc)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14,
                  }}
                >
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                      {set.courseTitle && (
                        <span className="badge neutral" style={{ fontSize: 11 }}>
                          {set.courseTitle}
                        </span>
                      )}
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                        {set.title}
                      </h4>
                    </div>
                    {set.sampleWords && set.sampleWords.length > 0 && (
                      <div className="text-dim text-xs" style={{ marginTop: 4 }}>
                        Từ mẫu: {set.sampleWords.join(', ')}...
                      </div>
                    )}
                  </div>

                  {/* Progress bar & Stats */}
                  <div style={{ minWidth: 180 }}>
                    <div className="flex-between text-xs" style={{ marginBottom: 4 }}>
                      <span className="text-dim">Đã thuộc {set.masteredWords || 0}/{set.totalWords || 0} từ</span>
                      <strong style={{ color: (set.progressPercent || 0) >= 80 ? 'var(--good, #10b981)' : 'var(--accent)' }}>
                        {set.progressPercent || 0}%
                      </strong>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 6,
                        background: 'var(--border, #e5e7eb)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, set.progressPercent || 0)}%`,
                          height: '100%',
                          background: (set.progressPercent || 0) >= 80 ? 'var(--good, #10b981)' : 'var(--accent)',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>

                  {/* Nút Ôn bộ từ này */}
                  <button
                    type="button"
                    className="btn secondary sm flex-row"
                    style={{ gap: 6, flexShrink: 0, minHeight: 36 }}
                    onClick={() => navigate(setId ? `/flashcards/review?setId=${setId}` : '/flashcards/review')}
                  >
                    <BookOpen size={14} />
                    <span>Ôn bộ từ này</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
