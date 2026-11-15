import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, FileText, CheckCircle2, Award, Zap, AlertCircle } from 'lucide-react'
import { getTest, startTestAttempt } from '@student/api/tests.js'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import '@student/components/tests/tests.css'

export default function TestConfigPage() {
  const { testId } = useParams()
  const navigate = useNavigate()

  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Cấu hình làm bài
  const [mode, setMode] = useState('FULL') // FULL | PRACTICE
  const [selectedParts, setSelectedParts] = useState([])
  const [timeMode, setTimeMode] = useState('STANDARD') // STANDARD | CUSTOM | UNLIMITED
  const [customMinutes, setCustomMinutes] = useState(60)

  useEffect(() => {
    loadTestDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  const loadTestDetail = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const data = await getTest(testId)
      setTest(data)
      const allPartNos = (data.parts || []).map((p) => p.partNo).sort((a, b) => a - b)
      setSelectedParts(allPartNos)
    } catch (err) {
      console.error('Lỗi tải thông tin đề thi:', err)
      setErrorMsg('Không thể tải thông tin đề thi hoặc đề thi chưa xuất bản.')
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    if (newMode === 'FULL') {
      // Khi chọn Full test, tự động chọn tất cả các part có sẵn
      const allPartNos = (test?.parts || []).map((p) => p.partNo).sort((a, b) => a - b)
      setSelectedParts(allPartNos)
      setTimeMode('STANDARD')
    }
  }

  const togglePart = (partNo) => {
    if (mode === 'FULL') return // Chế độ Full không sửa từng part
    setSelectedParts((prev) => {
      if (prev.includes(partNo)) {
        if (prev.length === 1) return prev // Tối thiểu 1 part
        return prev.filter((p) => p !== partNo)
      }
      return [...prev, partNo].sort((a, b) => a - b)
    })
  }

  const handleQuickSelect = (type) => {
    const all = (test?.parts || []).map((p) => p.partNo)
    if (type === 'ALL') {
      setSelectedParts(all)
    } else if (type === 'LISTENING') {
      setSelectedParts(all.filter((p) => p <= 4))
    } else if (type === 'READING') {
      setSelectedParts(all.filter((p) => p >= 5))
    }
  }

  const handleStart = async () => {
    if (selectedParts.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 phần thi')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      let timeLimitSeconds = null
      if (timeMode === 'UNLIMITED') {
        timeLimitSeconds = 0
      } else if (timeMode === 'CUSTOM') {
        timeLimitSeconds = Math.max(1, parseInt(customMinutes, 10)) * 60
      }

      const res = await startTestAttempt({
        testId,
        mode,
        selectedParts: mode === 'FULL' ? null : selectedParts,
        timeLimitSeconds,
      })

      navigate(`/tests/attempts/${res.testAttemptId}`)
    } catch (err) {
      console.error('Lỗi khi bắt đầu làm bài:', err)
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể tạo lượt làm bài.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="test-config-container">
        <Skeleton width="30%" height={24} style={{ marginBottom: 20 }} />
        <Skeleton width="100%" height={400} />
      </div>
    )
  }

  if (!test && errorMsg) {
    return (
      <div className="test-config-container">
        <div style={{ background: 'var(--bad-soft)', color: 'var(--bad)', padding: 20, borderRadius: 'var(--radius-lg)' }}>
          {errorMsg}
        </div>
        <Link to="/tests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <ArrowLeft size={16} />
          <span>Quay lại thư viện đề thi</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="test-config-container">
      <Link
        to="/tests"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-dim)',
          marginBottom: 16,
          fontSize: 14,
        }}
      >
        <ArrowLeft size={16} />
        <span>Quay lại danh sách đề thi</span>
      </Link>

      <div className="test-config-card">
        {/* Tiêu đề & Tác giả */}
        <h2 className="test-config-title">{test.title}</h2>
        <div style={{ display: 'flex', gap: 16, fontSize: 13.5, color: 'var(--text-dim)', marginBottom: 16 }}>
          <span>Biên soạn bởi: <strong>{test.authorName || 'Hệ thống'}</strong></span>
          <span>•</span>
          <span>Nguồn: <strong>{test.source === 'SYSTEM' ? 'Hệ thống' : 'Cộng đồng'}</strong></span>
          <span>•</span>
          <span>Tổng số câu: <strong>{test.totalQuestions} câu</strong></span>
        </div>

        {test.description && <p className="test-config-desc">{test.description}</p>}

        {errorMsg && (
          <div style={{ background: 'var(--bad-soft)', color: 'var(--bad)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Chọn chế độ làm bài */}
        <div className="config-section-title">1. Chọn chế độ làm bài</div>
        <div className="mode-selector-grid">
          <div
            className={`mode-choice-card ${mode === 'FULL' ? 'selected' : ''}`}
            onClick={() => handleModeChange('FULL')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Award size={18} color={mode === 'FULL' ? 'var(--accent)' : 'var(--text-dim)'} />
              <h4 style={{ margin: 0 }}>Thi thử (Full test)</h4>
            </div>
            <p>
              Làm trọn vẹn 7 phần thi TOEIC, đồng hồ đếm ngược 120 phút.
              Chấm điểm và quy đổi thang điểm TOEIC chuẩn 10–990 sau khi nộp bài.
            </p>
          </div>

          <div
            className={`mode-choice-card ${mode === 'PRACTICE' ? 'selected' : ''}`}
            onClick={() => handleModeChange('PRACTICE')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Zap size={18} color={mode === 'PRACTICE' ? 'var(--accent)' : 'var(--text-dim)'} />
              <h4 style={{ margin: 0 }}>Luyện tập (Practice)</h4>
            </div>
            <p>
              Tự do chọn các Part bạn muốn ôn tập, tùy chỉnh hoặc không giới hạn thời gian làm bài.
            </p>
          </div>
        </div>

        {/* 2. Chọn phần thi */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="config-section-title">2. Các phần thi (Part)</div>
          {mode === 'PRACTICE' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onClick={() => handleQuickSelect('ALL')}
              >
                Tất cả
              </button>
              <span style={{ color: 'var(--border)' }}>|</span>
              <button
                type="button"
                style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onClick={() => handleQuickSelect('LISTENING')}
              >
                Chỉ Nghe (P1-4)
              </button>
              <span style={{ color: 'var(--border)' }}>|</span>
              <button
                type="button"
                style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                onClick={() => handleQuickSelect('READING')}
              >
                Chỉ Đọc (P5-7)
              </button>
            </div>
          )}
        </div>

        <div className="parts-checkbox-grid">
          {(test.parts || []).map((p) => {
            const isChecked = selectedParts.includes(p.partNo)
            return (
              <label
                key={p.partNo}
                className={`part-checkbox-label ${isChecked ? 'checked' : ''} ${mode === 'FULL' ? 'disabled' : ''}`}
                onClick={(e) => {
                  if (mode === 'FULL') {
                    e.preventDefault()
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={mode === 'FULL'}
                  onChange={() => togglePart(p.partNo)}
                  style={{ cursor: mode === 'FULL' ? 'not-allowed' : 'pointer' }}
                />
                <span>Part {p.partNo}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>({p.questionCount}c)</span>
              </label>
            )
          })}
        </div>

        {/* 3. Thời gian làm bài */}
        <div className="config-section-title">3. Thời gian làm bài</div>
        <div className="time-options-group">
          <button
            type="button"
            className={`time-option-btn ${timeMode === 'STANDARD' ? 'selected' : ''}`}
            onClick={() => setTimeMode('STANDARD')}
          >
            Thời gian chuẩn ({mode === 'FULL' ? '120 phút' : 'Theo part đã chọn'})
          </button>
          <button
            type="button"
            className={`time-option-btn ${timeMode === 'CUSTOM' ? 'selected' : ''}`}
            onClick={() => setTimeMode('CUSTOM')}
          >
            Tự chọn thời gian
          </button>
          <button
            type="button"
            className={`time-option-btn ${timeMode === 'UNLIMITED' ? 'selected' : ''}`}
            onClick={() => setTimeMode('UNLIMITED')}
          >
            Không giới hạn thời gian
          </button>
        </div>

        {timeMode === 'CUSTOM' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 14 }}>Số phút làm bài:</span>
            <input
              type="number"
              min="1"
              max="240"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              style={{
                width: 90,
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
              }}
            />
            <span style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>phút</span>
          </div>
        )}

        {/* Nút hành động Bắt đầu làm bài */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20, marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-test-action"
            style={{ padding: '10px 24px', fontSize: 15 }}
            disabled={submitting}
            onClick={handleStart}
          >
            {submitting ? 'Đang khởi tạo lượt làm bài...' : 'Bắt đầu làm bài'}
          </button>
        </div>
      </div>
    </div>
  )
}
