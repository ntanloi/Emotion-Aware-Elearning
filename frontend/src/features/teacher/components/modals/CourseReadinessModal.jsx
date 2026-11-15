import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getCourseReadiness } from '@teacher/api/teacher.js'
import { useSubmitCourse } from '@teacher/hooks/useTeacherCourses.js'
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Send,
  PlusCircle,
  Info,
  Check,
} from 'lucide-react'

// Định nghĩa tiêu chuẩn số lượng tối thiểu cho từng phần theo chuẩn kiểm định TOEIC
const SECTION_STANDARDS = {
  VOCAB: {
    name: 'Từ vựng (Vocabulary)',
    badge: 'Từ vựng',
    minText: 'Tối thiểu 50 từ vựng',
    desc: 'Mỗi từ cần có nghĩa tiếng Việt và ví dụ minh họa rõ ràng.',
    targetItems: [{ label: 'Số từ vựng không trùng', min: 50, unit: 'từ' }]
  },
  GRAMMAR: {
    name: 'Ngữ pháp (Grammar)',
    badge: 'Ngữ pháp',
    minText: 'Tối thiểu 8 chủ điểm ngữ pháp',
    desc: 'Mỗi bài lý thuyết tối thiểu 800 ký tự giải thích cấu trúc và cách dùng.',
    targetItems: [{ label: 'Chủ điểm ngữ pháp', min: 8, unit: 'chủ điểm' }]
  },
  PART1: {
    name: 'Part 1 - Mô tả tranh (Photographs)',
    badge: 'Part 1',
    minText: '1 video bài giảng + tối thiểu 6 câu hỏi',
    desc: 'Mỗi câu hỏi có ảnh minh họa rõ nét, audio chuẩn và 4 lựa chọn A-B-C-D.',
    targetItems: [
      { label: 'Video bài giảng', min: 1, unit: 'video' },
      { label: 'Câu hỏi mô tả tranh', min: 6, unit: 'câu' }
    ]
  },
  PART2: {
    name: 'Part 2 - Hỏi đáp (Question - Response)',
    badge: 'Part 2',
    minText: '1 video bài giảng + tối thiểu 25 câu hỏi',
    desc: 'Mỗi câu có audio phát âm chuẩn và 3 lựa chọn đáp án A-B-C.',
    targetItems: [
      { label: 'Video bài giảng', min: 1, unit: 'video' },
      { label: 'Câu hỏi hỏi - đáp', min: 25, unit: 'câu' }
    ]
  },
  PART3: {
    name: 'Part 3 - Hội thoại (Conversations)',
    badge: 'Part 3',
    minText: '1 video bài giảng + tối thiểu 39 câu hỏi',
    desc: '13 đoạn hội thoại (mỗi đoạn 3 câu), kèm audio và lời thoại.',
    targetItems: [
      { label: 'Video bài giảng', min: 1, unit: 'video' },
      { label: 'Câu hỏi hội thoại', min: 39, unit: 'câu' }
    ]
  },
  PART4: {
    name: 'Part 4 - Bài nói ngắn (Short Talks)',
    badge: 'Part 4',
    minText: '1 video bài giảng + tối thiểu 30 câu hỏi',
    desc: '10 bài nói độc thoại (mỗi bài 3 câu), kèm audio và lời thoại.',
    targetItems: [
      { label: 'Video bài giảng', min: 1, unit: 'video' },
      { label: 'Câu hỏi bài nói', min: 30, unit: 'câu' }
    ]
  },
  PART5: {
    name: 'Part 5 - Hoàn thành câu (Incomplete Sentences)',
    badge: 'Part 5',
    minText: '1 video bài giảng + tối thiểu 30 câu hỏi',
    desc: 'Các câu hỏi ngữ pháp hoặc từ vựng điền khuyết với 4 đáp án.',
    targetItems: [
      { label: 'Video bài giảng', min: 1, unit: 'video' },
      { label: 'Câu hỏi trắc nghiệm', min: 30, unit: 'câu' }
    ]
  },
  PART6: {
    name: 'Part 6 - Điền đoạn văn (Text Completion)',
    badge: 'Part 6',
    minText: '1 video bài giảng + tối thiểu 16 câu hỏi',
    desc: '4 đoạn văn hoàn chỉnh (mỗi đoạn 4 ô trống điền từ).',
    targetItems: [
      { label: 'Video bài giảng', min: 1, unit: 'video' },
      { label: 'Câu hỏi điền đoạn văn', min: 16, unit: 'câu' }
    ]
  },
  PART7: {
    name: 'Part 7 - Đọc hiểu (Reading Comprehension)',
    badge: 'Part 7',
    minText: '1 video bài giảng + tối thiểu 54 câu hỏi',
    desc: 'Đoạn văn đơn và đoạn văn kép kèm các câu hỏi đọc hiểu chuyên sâu.',
    targetItems: [
      { label: 'Video bài giảng', min: 1, unit: 'video' },
      { label: 'Câu hỏi đọc hiểu', min: 54, unit: 'câu' }
    ]
  },
  DICTATION: {
    name: 'Chép chính tả (Dictation)',
    badge: 'Dictation',
    minText: 'Tối thiểu 10 câu chép chính tả',
    desc: 'Mỗi câu có file âm thanh giọng đọc chuẩn và văn bản mẫu để hệ thống chấm điểm.',
    targetItems: [{ label: 'Câu chính tả có âm thanh', min: 10, unit: 'câu' }]
  }
}

export default function CourseReadinessModal({ isOpen, onClose, courseId, onSubmitted }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'IN_PROGRESS' | 'PASSED'
  const [resultModal, setResultModal] = useState(null) // { type: 'SUCCESS' | 'ERROR', title: string, message: string }

  const submitCourse = useSubmitCourse()

  const loadReadiness = async () => {
    if (!courseId) return
    try {
      setLoading(true)
      setError(null)
      const res = await getCourseReadiness(courseId)
      setData(res)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu kiểm tra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadReadiness()
      setResultModal(null)
    }
  }, [isOpen, courseId])

  const handleConfirmSubmit = () => {
    if (!data?.canSubmit) return
    submitCourse.mutate(courseId, {
      onSuccess: () => {
        setResultModal({
          type: 'SUCCESS',
          title: 'Gửi duyệt thành công!',
          message: 'Khóa học đã được gửi tới Ban Quản trị để kiểm duyệt nội dung. Trạng thái khóa học hiện là Chờ duyệt.'
        })
        if (onSubmitted) onSubmitted()
      },
      onError: (err) => {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Gửi duyệt thất bại'
        setResultModal({
          type: 'ERROR',
          title: 'Không thể gửi duyệt',
          message: msg
        })
        loadReadiness()
      },
    })
  }

  const handleJump = (url) => {
    if (!url) return
    onClose()
    const target = url.replace('/curriculum', '/content')
    navigate(target)
  }

  // Phân tích trạng thái các section
  const sectionStats = useMemo(() => {
    if (!data?.sections) return { passed: 0, blocked: 0, notOpen: 0 }
    let passed = 0
    let blocked = 0
    let notOpen = 0
    data.sections.forEach(s => {
      if (s.status === 'PASSED') passed++
      else if (s.status === 'BLOCKED') blocked++
      else notOpen++
    })
    return { passed, blocked, notOpen }
  }, [data])

  // Lọc danh sách section theo tab
  const filteredSections = useMemo(() => {
    if (!data?.sections) return []
    if (filterTab === 'IN_PROGRESS') {
      return data.sections.filter(s => s.status === 'BLOCKED')
    }
    if (filterTab === 'PASSED') {
      return data.sections.filter(s => s.status === 'PASSED')
    }
    return data.sections
  }, [data, filterTab])

  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div className="card" style={{
        maxWidth: 780, width: '100%', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative', zIndex: 100000
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-1)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Điều kiện gửi duyệt khóa học
              </h2>
            </div>
            <div className="text-dim" style={{ fontSize: 14, marginTop: 3 }}>
              Hệ thống rà soát tự động theo tiêu chuẩn bảo đảm chất lượng TOEIC
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={loadReadiness}
              disabled={loading}
              title="Kiểm tra lại dữ liệu"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 14, fontWeight: 500,
                background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, padding: 0,
                background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <RefreshCw size={28} className="animate-spin text-dim" style={{ margin: '0 auto 12px' }} />
              <div className="text-dim" style={{ fontSize: 14 }}>Đang kiểm tra các điều kiện gửi duyệt...</div>
            </div>
          ) : error ? (
            <div style={{
              padding: 16, background: 'var(--bad-soft)', color: 'var(--bad)', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <XCircle size={22} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 14 }}>{error}</div>
            </div>
          ) : (
            <>
              {/* Thẻ trạng thái & Hướng dẫn cốt lõi cho giáo viên */}
              <div style={{
                padding: '16px 18px', borderRadius: 10, marginBottom: 20,
                background: data.canSubmit ? 'var(--good-soft)' : 'var(--info-soft)',
                border: `1px solid ${data.canSubmit ? 'var(--good-border)' : 'var(--info-soft)'}`,
                display: 'flex', alignItems: 'flex-start', gap: 14
              }}>
                {data.canSubmit ? (
                  <CheckCircle2 size={24} color='var(--good)' style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <Info size={24} color='var(--info)' style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 14,
                    color: data.canSubmit ? 'var(--good)' : 'var(--info)'
                  }}>
                    {data.canSubmit
                      ? 'Khóa học đã đủ điều kiện gửi duyệt!'
                      : 'Chưa đủ điều kiện gửi duyệt'}
                  </div>

                  {data.canSubmit ? (
                    <div style={{ fontSize: 14, marginTop: 4, color: 'var(--good)', lineHeight: 1.5 }}>
                      Khóa học của bạn đã thỏa mãn toàn bộ tiêu chuẩn kiểm định cơ bản. Bạn có thể nhấn nút <strong>Gửi duyệt ngay</strong> ở góc dưới để Quản trị viên thẩm định nội dung.
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, marginTop: 4, color: 'var(--info)', lineHeight: 1.5 }}>
                      <strong>Quy tắc gửi duyệt đơn giản:</strong> Khóa học <u>không bắt buộc</u> phải soạn tất cả 10 phần. Bạn chỉ cần hoàn thiện đạt chuẩn <strong>ít nhất 1 phần bất kỳ</strong> (ví dụ: chỉ cần hoàn tất Từ vựng, hoặc chỉ Part 1...) là đã có thể gửi duyệt ngay!
                    </div>
                  )}
                </div>
              </div>

              {/* Danh sách các vấn đề bắt buộc cần khắc phục (Blockers) nếu có */}
              {data.blockers && data.blockers.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 10
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bad)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={16} />
                      <span>Các mục cần khắc phục trước khi gửi duyệt ({data.blockers.length}):</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.blockers.map((b, idx) => (
                      <div key={idx} style={{
                        padding: '12px 14px', borderRadius: 8, background: 'var(--bad-soft)',
                        border: '1px solid var(--bad-border)', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 12
                      }}>
                        <div style={{ fontSize: 14, color: 'var(--bad)', lineHeight: 1.45, flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{b.message}</div>
                          {b.suggestion && (
                            <div style={{ fontSize: 12, marginTop: 3, color: 'var(--bad)' }}>
                              Hướng dẫn: {b.suggestion}
                            </div>
                          )}
                        </div>
                        {b.jumpTo && (
                          <button
                            type="button"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '6px 14px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                              background: 'var(--bad)', color: 'var(--surface)', border: 'none',
                              borderRadius: 6, cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(220, 38, 38, 0.25)',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => handleJump(b.jumpTo)}
                          >
                            <span>Sửa ngay</span>
                            <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bảng chi tiết từng phần & Tiêu chuẩn số lượng tối thiểu */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: 8, marginBottom: 12
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                      Tiến độ & Tiêu chuẩn từng phần:
                    </div>
                    <div className="text-dim" style={{ fontSize: 12, marginTop: 2 }}>
                      Đã đạt chuẩn: <strong style={{ color: sectionStats.passed > 0 ? 'var(--good)' : 'var(--text)' }}>{sectionStats.passed} / 10</strong> phần
                      {sectionStats.passed === 0 && ' (Cần đạt tối thiểu 1 phần)'}
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div style={{
                    display: 'flex', gap: 4, background: 'var(--surface-2)',
                    padding: 3, borderRadius: 8, border: '1px solid var(--border)'
                  }}>
                    <button
                      type="button"
                      style={{
                        padding: '5px 12px', fontSize: 12, border: 'none', borderRadius: 6,
                        background: filterTab === 'ALL' ? 'var(--surface)' : 'transparent',
                        color: filterTab === 'ALL' ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: filterTab === 'ALL' ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: filterTab === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setFilterTab('ALL')}
                    >
                      Tất cả (10)
                    </button>
                    {sectionStats.blocked > 0 && (
                      <button
                        type="button"
                        style={{
                          padding: '5px 12px', fontSize: 12, border: 'none', borderRadius: 6,
                          background: filterTab === 'IN_PROGRESS' ? 'var(--surface)' : 'transparent',
                          color: filterTab === 'IN_PROGRESS' ? 'var(--bad)' : 'var(--bad)',
                          fontWeight: filterTab === 'IN_PROGRESS' ? 700 : 500,
                          cursor: 'pointer',
                          boxShadow: filterTab === 'IN_PROGRESS' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setFilterTab('IN_PROGRESS')}
                      >
                        Đang soạn thiếu ({sectionStats.blocked})
                      </button>
                    )}
                    {sectionStats.passed > 0 && (
                      <button
                        type="button"
                        style={{
                          padding: '5px 12px', fontSize: 12, border: 'none', borderRadius: 6,
                          background: filterTab === 'PASSED' ? 'var(--surface)' : 'transparent',
                          color: filterTab === 'PASSED' ? 'var(--good)' : 'var(--good)',
                          fontWeight: filterTab === 'PASSED' ? 700 : 500,
                          cursor: 'pointer',
                          boxShadow: filterTab === 'PASSED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => setFilterTab('PASSED')}
                      >
                        Đã đạt ({sectionStats.passed})
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách thẻ Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredSections.map((sec) => {
                    const standard = SECTION_STANDARDS[sec.code] || {
                      name: sec.label || sec.code,
                      badge: sec.code,
                      minText: 'Xem yêu cầu chi tiết',
                      desc: '',
                      targetItems: []
                    }

                    const isPassed = sec.status === 'PASSED'
                    const isBlocked = sec.status === 'BLOCKED'
                    const isNotOpen = sec.status === 'NOT_OPEN'

                    // Kiểm tra xem có yêu cầu nào bị thiếu số lượng
                    const hasReqs = sec.requirements && sec.requirements.length > 0

                    return (
                      <div
                        key={sec.code}
                        style={{
                          padding: '14px 16px', borderRadius: 8,
                          border: `1px solid ${
                            isPassed ? 'var(--good-border)' : isBlocked ? 'var(--bad-border)' : 'var(--border)'
                          }`,
                          background: isPassed ? 'var(--good-soft)' : isBlocked ? 'var(--bad-soft)' : 'var(--surface-1)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                                {standard.name}
                              </span>
                              {isPassed && (
                                <span style={{
                                  fontSize: 12, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)',
                                  background: 'var(--good-soft)', color: 'var(--good)', fontWeight: 600,
                                  display: 'inline-flex', alignItems: 'center', gap: 3
                                }}>
                                  <Check size={11} /> Đạt chuẩn
                                </span>
                              )}
                              {isBlocked && (
                                <span style={{
                                  fontSize: 12, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)',
                                  background: 'var(--bad-soft)', color: 'var(--bad)', fontWeight: 600
                                }}>
                                  Chưa đủ số lượng
                                </span>
                              )}
                              {isNotOpen && (
                                <span style={{
                                  fontSize: 12, padding: '2px 8px', borderRadius: 'var(--radius-sm, 6px)',
                                  background: 'var(--surface-2)', color: 'var(--text-muted)', fontWeight: 500
                                }}>
                                  Chưa soạn
                                </span>
                              )}
                            </div>

                            {/* Chuẩn tối thiểu cần đạt */}
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Chuẩn tối thiểu: </span>
                              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{standard.minText}</span>
                              {standard.desc && <span style={{ marginLeft: 4 }}>— {standard.desc}</span>}
                            </div>
                          </div>

                          {/* Nút hành động trực tiếp */}
                          <div style={{ flexShrink: 0 }}>
                            {isNotOpen && (
                              <button
                                type="button"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '6px 14px', fontSize: 12, fontWeight: 600,
                                  background: 'var(--info-soft)', color: 'var(--info)', border: '1px solid var(--info-soft)',
                                  borderRadius: 6, cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => handleJump(`/teacher/courses/${courseId}/content?section=${sec.code}`)}
                              >
                                <PlusCircle size={14} color='var(--info)' />
                                <span>Bắt đầu soạn</span>
                              </button>
                            )}
                            {isBlocked && (
                              <button
                                type="button"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '6px 14px', fontSize: 12, fontWeight: 600,
                                  background: 'var(--bad)', color: 'var(--surface)', border: 'none',
                                  borderRadius: 6, cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(239, 68, 68, 0.25)',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => handleJump(`/teacher/courses/${courseId}/content?section=${sec.code}`)}
                              >
                                <span>Tiếp tục soạn</span>
                                <ArrowRight size={14} />
                              </button>
                            )}
                            {isPassed && (
                              <button
                                type="button"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '6px 14px', fontSize: 12, fontWeight: 600,
                                  background: 'var(--good-soft)', color: 'var(--good)', border: '1px solid var(--good-border)',
                                  borderRadius: 6, cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => handleJump(`/teacher/courses/${courseId}/content?section=${sec.code}`)}
                              >
                                <span>Xem lại</span>
                                <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Chi tiết tiến độ số lượng thực tế khi đang soạn */}
                        {hasReqs && (
                          <div style={{
                            marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)',
                            display: 'flex', flexDirection: 'column', gap: 6
                          }}>
                            {sec.requirements.map((req, rIdx) => {
                              const remaining = Math.max(0, req.required - req.actual)
                              return (
                                <div key={rIdx} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  fontSize: 12,
                                  color: req.met ? 'var(--good)' : 'var(--bad)'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {req.met ? (
                                      <CheckCircle2 size={13} color='var(--good)' />
                                    ) : (
                                      <XCircle size={13} color='var(--bad)' />
                                    )}
                                    <span style={{ fontWeight: req.met ? 500 : 600 }}>
                                      {req.label}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 600 }}>
                                      {req.actual} / {req.required}
                                    </span>
                                    {!req.met && remaining > 0 && (
                                      <span style={{
                                        fontSize: 12, padding: '1px 6px', borderRadius: 4,
                                        background: 'var(--bad-soft)', color: 'var(--bad)', fontWeight: 600
                                      }}>
                                        (Còn thiếu {remaining})
                                      </span>
                                    )}
                                    {req.met && (
                                      <span style={{ fontSize: 12, color: 'var(--good)' }}>
                                        (Đủ)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-1)'
        }}>
          <div className="text-dim" style={{ fontSize: 12 }}>
            {!data?.canSubmit && (
              <span>Hoàn thành ít nhất 1 phần đạt chuẩn để kích hoạt gửi duyệt.</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px', fontSize: 14, fontWeight: 500,
                background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 8, cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={!data?.canSubmit || submitCourse.isPending}
              onClick={handleConfirmSubmit}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 22px', fontSize: 14, fontWeight: 600,
                background: data?.canSubmit ? 'var(--accent)' : 'var(--border)',
                color: data?.canSubmit ? 'var(--surface)' : 'var(--text-muted)',
                border: 'none', borderRadius: 8,
                cursor: data?.canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: data?.canSubmit ? '0 2px 4px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={15} />
              <span>{submitCourse.isPending ? 'Đang gửi duyệt...' : 'Gửi duyệt ngay'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Thông báo kết quả gửi duyệt */}
      {resultModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 100010,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            maxWidth: 440, width: '100%',
            background: 'var(--surface-1)',
            borderRadius: 16, padding: '28px 24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: resultModal.type === 'SUCCESS' ? 'var(--good-soft)' : 'var(--bad-soft)',
              border: `2px solid ${resultModal.type === 'SUCCESS' ? 'var(--good-border)' : 'var(--bad-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14
            }}>
              {resultModal.type === 'SUCCESS' ? (
                <CheckCircle2 size={32} color='var(--good)' />
              ) : (
                <AlertTriangle size={32} color='var(--bad)' />
              )}
            </div>

            <h3 style={{
              fontSize: 18, fontWeight: 700, margin: '0 0 8px',
              color: resultModal.type === 'SUCCESS' ? 'var(--good)' : 'var(--bad)'
            }}>
              {resultModal.title}
            </h3>

            <p style={{
              fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55,
              margin: 0
            }}>
              {resultModal.message}
            </p>

            {resultModal.type === 'SUCCESS' && (
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5
              }}>
                Ban Quản trị sẽ tiến hành thẩm định và phản hồi kết quả trong thời gian sớm nhất.
              </div>
            )}

            <button
              type="button"
              style={{
                marginTop: 22, width: '100%',
                padding: '11px 0', fontSize: 14, fontWeight: 600,
                background: resultModal.type === 'SUCCESS' ? 'var(--good)' : 'var(--bad)',
                color: 'var(--surface)', border: 'none', borderRadius: 8,
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                const wasSuccess = resultModal.type === 'SUCCESS'
                setResultModal(null)
                if (wasSuccess) {
                  onClose()
                }
              }}
            >
              {resultModal.type === 'SUCCESS' ? 'Đã hiểu' : 'Đóng & Thử lại'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
