import { useEffect, useState } from 'react'
import { X, Check, AlertCircle, Volume2, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { getAdminTestDetail } from '@admin/api/adminTests.js'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import QuestionImage from '@shared/components/QuestionImage.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'

export default function AdminTestDetailModal({
  open,
  testId,
  onClose,
  onApprove,
  onReject,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePartIndex, setActivePartIndex] = useState(0)

  useEffect(() => {
    if (open && testId) {
      loadDetail()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, testId])

  const loadDetail = async () => {
    setLoading(true)
    try {
      const res = await getAdminTestDetail(testId)
      setData(res)
      setActivePartIndex(0)
    } catch (err) {
      console.error('Lỗi tải chi tiết đề thi:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const test = data?.test
  const parts = data?.parts || []
  const currentPart = parts[activePartIndex] || null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 1000,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {test?.source === 'SYSTEM' ? 'Đề Hệ thống' : 'Đề Cộng đồng'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Tác giả: <strong>{test?.authorName || '—'}</strong>
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>
              {test?.title || 'Đang tải thông tin đề thi...'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {test?.status === 'PENDING_REVIEW' && (
              <>
                <button
                  type="button"
                  style={{
                    background: 'var(--bad-soft)',
                    color: 'var(--bad)',
                    border: '1px solid var(--bad-border)',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => onReject(test)}
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  style={{
                    background: 'var(--good)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => onApprove(test)}
                >
                  <Check size={14} />
                  <span>Phê duyệt đề</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Thanh chọn Part */}
        <div
          style={{
            background: 'var(--surface-2, #f8fafc)',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            flexShrink: 0,
            overflow: 'visible',
          }}
        >
          {parts.map((p, idx) => {
            const isActive = idx === activePartIndex
            return (
              <button
                key={p.partNo}
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  border: isActive ? '1px solid var(--accent, #2563eb)' : '1px solid var(--border, #e2e8f0)',
                  background: isActive ? 'var(--accent, #2563eb)' : 'var(--surface, #ffffff)',
                  color: isActive ? '#ffffff' : 'var(--text, #1e293b)',
                  boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--accent, #2563eb)'
                    e.currentTarget.style.color = 'var(--accent, #2563eb)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)'
                    e.currentTarget.style.color = 'var(--text, #1e293b)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => setActivePartIndex(idx)}
              >
                <span>Part {p.partNo}</span>
                <span
                  style={{
                    fontSize: 11.5,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: isActive ? 'rgba(255, 255, 255, 0.24)' : 'var(--surface-2, #f1f5f9)',
                    color: isActive ? '#ffffff' : 'var(--text-dim, #64748b)',
                    fontWeight: 700,
                  }}
                >
                  {p.questionCount} câu
                </span>
              </button>
            )
          })}
        </div>

        {/* Nội dung câu hỏi và đáp án */}
        <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div>
              <Skeleton width="40%" height={24} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={200} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={200} />
            </div>
          ) : !currentPart ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 40 }}>
              Không có dữ liệu cho phần thi này.
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16, color: 'var(--text)' }}>
                Nội dung Part {currentPart.partNo} ({currentPart.questions?.length || 0} câu hỏi)
              </div>

              {/* Đoạn văn / Audio nếu có */}
              {(currentPart.passages || []).map((passage, pIdx) => (
                <div
                  key={passage.id || pIdx}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>
                    Đoạn thông tin / Bài đọc #{pIdx + 1}
                  </div>
                  {passage.audioUrl && (
                    <div style={{ marginBottom: 10 }}>
                      <AudioPlayer src={passage.audioUrl} />
                    </div>
                  )}
                  {passage.imageUrl && (
                    <div style={{ marginBottom: 10 }}>
                      <QuestionImage src={passage.imageUrl} alt="Passage" />
                    </div>
                  )}
                  {passage.passageHtml && (
                    <div
                      style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)' }}
                      dangerouslySetInnerHTML={{ __html: passage.passageHtml }}
                    />
                  )}
                </div>
              ))}

              {/* Danh sách câu hỏi có hiển thị đáp án đúng */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(currentPart.questions || []).map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      background: 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>
                        Câu #{qIdx + 1}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                        Dạng: {q.questionKind || 'MULTIPLE_CHOICE'}
                      </span>
                    </div>

                    {q.audioUrl && (
                      <div style={{ marginBottom: 8 }}>
                        <AudioPlayer src={q.audioUrl} />
                      </div>
                    )}
                    {q.imageUrl && (
                      <div style={{ marginBottom: 8 }}>
                        <QuestionImage src={q.imageUrl} alt={`Question ${qIdx + 1}`} />
                      </div>
                    )}

                    {q.promptText && (
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>
                        {q.promptText}
                      </div>
                    )}

                    {/* Các lựa chọn trắc nghiệm */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {(q.options || []).map((opt) => {
                        const isCorrect = Boolean(opt.isCorrect)
                        return (
                          <div
                            key={opt.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: isCorrect ? '1px solid var(--good-border)' : '1px solid var(--border)',
                              background: isCorrect ? 'var(--good-soft)' : 'var(--surface)',
                              fontSize: 13.5,
                            }}
                          >
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: isCorrect ? 'var(--good)' : 'var(--surface-2)',
                                color: isCorrect ? '#ffffff' : 'var(--text)',
                              }}
                            >
                              {opt.label}
                            </span>
                            <span style={{ flex: 1, color: isCorrect ? 'var(--good)' : 'var(--text)', fontWeight: isCorrect ? 600 : 400 }}>
                              {opt.content}
                            </span>
                            {isCorrect && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--good)' }}>
                                Đáp án đúng
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Lời giải thích */}
                    {q.explanation && (
                      <div
                        style={{
                          background: 'var(--surface-2)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13,
                          color: 'var(--text-dim)',
                        }}
                      >
                        <strong>Giải thích:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
