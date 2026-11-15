import React from 'react'
import {
  BookOpen,
  ChevronRight,
  PlayCircle,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  User,
  GraduationCap,
  Clock,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react'
import RichTextViewer from '@shared/components/RichTextViewer.jsx'

export default function ContentViewer({
  course,
  selectedItem,
  itemDetail,
  itemLoading,
}) {
  if (selectedItem === null) {
    return (
      <main className="admin-workspace-col-center">
        <div>
          {/* Hero Banner Thông tin khóa học */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginBottom: 24,
              alignItems: 'flex-start',
              padding: 20,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              flexWrap: 'wrap',
            }}
          >
            {course.coverUrl && (
              <div
                style={{
                  width: 240,
                  height: 140,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                  background: '#e2e8f0',
                }}
              >
                <img
                  src={course.coverUrl}
                  alt={course.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#0284c7',
                    background: '#e0f2fe',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {course.profile === 'FULL'
                    ? 'TOEIC Toàn diện'
                    : course.profile === 'LISTENING'
                    ? 'Chuyên Listening'
                    : course.profile === 'READING'
                    ? 'Chuyên Reading'
                    : 'Chuyên đề / Linh hoạt'}
                </span>
              </div>

              <h2 style={{ margin: '0 0 10px 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                {course.title}
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                  <User size={15} style={{ color: '#0284c7' }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Giảng viên</div>
                    <strong>{course.teacherName || 'Chưa rõ'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                  <GraduationCap size={15} style={{ color: '#16a34a' }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Trình độ</div>
                    <strong>{course.level || 'Tất cả'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                  <Clock size={15} style={{ color: '#d97706' }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Thời lượng</div>
                    <strong>{course.durationHours || 0} giờ</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                  <DollarSign size={15} style={{ color: '#0284c7' }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Học phí</div>
                    <strong style={{ color: '#0284c7' }}>
                      {course.price ? `${Number(course.price).toLocaleString()} đ` : 'Miễn phí'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mô tả khóa học */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
              Mô tả khóa học
            </h4>
            <div
              style={{
                padding: 16,
                background: '#ffffff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: 14,
                lineHeight: 1.6,
                color: '#334155',
              }}
            >
              {course.description && course.description.trim() ? (
                <RichTextViewer htmlContent={course.description} />
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có nội dung mô tả cho khóa học này.</span>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (itemLoading) {
    return (
      <main className="admin-workspace-col-center">
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 10, color: '#0284c7' }} />
          <div>Đang tải nội dung bài học...</div>
        </div>
      </main>
    )
  }

  if (!itemDetail) {
    return (
      <main className="admin-workspace-col-center">
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          Chọn một bài học từ mục lục bên trái để xem nội dung chi tiết.
        </div>
      </main>
    )
  }

  return (
    <main className="admin-workspace-col-center">
      <div>
        {/* Breadcrumb phân cấp */}
        <div className="center-breadcrumb">
          <span>{itemDetail.sectionCode}</span>
          <ChevronRight size={13} style={{ opacity: 0.6 }} />
          {itemDetail.groupTitle && (
            <>
              <span>{itemDetail.groupTitle}</span>
              <ChevronRight size={13} style={{ opacity: 0.6 }} />
            </>
          )}
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{itemDetail.title}</span>
        </div>

        {/* Tiêu đề bài học */}
        <div className="center-item-header">
          <div>
            <h3>{itemDetail.title}</h3>
            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, display: 'flex', gap: 10 }}>
              <span
                style={{
                  background: '#f1f5f9',
                  padding: '2px 7px',
                  borderRadius: 4,
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                {itemDetail.type}
              </span>
              <span>Thứ tự: #{itemDetail.orderIndex}</span>
              {itemDetail.timeLimitMinutes && <span>Thời lượng: {itemDetail.timeLimitMinutes} phút</span>}
            </div>
          </div>
        </div>

        {/* Video bài giảng */}
        {itemDetail.videoUrl && (
          <div style={{ marginBottom: 24 }}>
            <h4
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <PlayCircle size={16} style={{ color: '#0284c7' }} />
              Video bài giảng
            </h4>
            <div
              style={{
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                background: '#000000',
                maxHeight: 420,
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}
            >
              {itemDetail.videoUrl.includes('drive.google.com') || itemDetail.videoUrl.includes('youtube.com') ? (
                <iframe
                  src={itemDetail.videoUrl}
                  title="Video Preview"
                  style={{ width: '100%', height: 380, border: 'none' }}
                  allowFullScreen
                />
              ) : (
                <video src={itemDetail.videoUrl} controls style={{ width: '100%', maxHeight: 380 }} />
              )}
            </div>
          </div>
        )}

        {/* Nội dung lý thuyết RichText */}
        {itemDetail.bodyHtml && (
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
              Nội dung lý thuyết / Hướng dẫn
            </h4>
            <div
              style={{
                padding: 16,
                background: '#ffffff',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              <RichTextViewer htmlContent={itemDetail.bodyHtml} />
            </div>
          </div>
        )}

        {/* Đoạn văn đọc hiểu / Hội thoại (Passages) */}
        {itemDetail.passages?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h4
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <BookOpen size={16} style={{ color: '#16a34a' }} />
              Đoạn văn & Tài liệu nghe ({itemDetail.passages.length})
            </h4>
            {itemDetail.passages.map((p, idx) => (
              <div
                key={p.id || idx}
                style={{
                  padding: 16,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              >
                {p.audioUrl && (
                  <div style={{ marginBottom: 10 }}>
                    <audio src={p.audioUrl} controls style={{ width: '100%', height: 36 }} />
                  </div>
                )}
                {p.imageUrl && (
                  <div style={{ marginBottom: 10 }}>
                    <img src={p.imageUrl} alt="Passage" style={{ maxHeight: 260, borderRadius: 8 }} />
                  </div>
                )}
                {p.passageHtml && <RichTextViewer htmlContent={p.passageHtml} />}
                {p.transcriptHtml && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: '1px dashed #86efac',
                      fontSize: 12.5,
                      color: '#15803d',
                    }}
                  >
                    <strong>Transcript:</strong> <RichTextViewer htmlContent={p.transcriptHtml} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Danh sách câu hỏi kèm đáp án đúng và giải thích */}
        {itemDetail.questions?.length > 0 ? (
          <div>
            <h4
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <HelpCircle size={16} style={{ color: '#0284c7' }} />
              Danh sách câu hỏi & Đáp án đúng ({itemDetail.questions.length})
            </h4>

            {itemDetail.questions.map((q, idx) => (
              <div key={q.id || idx} className="preview-question-card" id={`question-${q.id}`}>
                <div className="preview-question-number">
                  <span>Câu {idx + 1}</span>
                  {q.tag && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: '#64748b',
                        background: '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {q.tag}
                    </span>
                  )}
                </div>

                {q.imageUrl && (
                  <div style={{ marginBottom: 10 }}>
                    <img src={q.imageUrl} alt="Question" style={{ maxHeight: 220, borderRadius: 8 }} />
                  </div>
                )}

                {q.audioUrl && (
                  <div style={{ marginBottom: 10 }}>
                    <audio src={q.audioUrl} controls style={{ width: '100%', height: 34 }} />
                  </div>
                )}

                <div className="preview-question-prompt">{q.promptText}</div>

                {/* Các lựa chọn trắc nghiệm */}
                {q.options?.length > 0 && (
                  <div className="preview-options-list">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`preview-option-row ${opt.isCorrect ? 'correct' : ''}`}
                      >
                        <div style={{ width: 26, fontWeight: 700, fontSize: 13.5 }}>{opt.optionLabel}.</div>
                        <div style={{ flex: 1 }}>{opt.optionText}</div>
                        {opt.isCorrect && (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#dcfce7',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            <CheckCircle2 size={13} /> Đáp án đúng
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Đáp án điền từ / nghe chép */}
                {q.correctText && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: '#166534',
                      marginBottom: 8,
                    }}
                  >
                    <strong>Đáp án chuẩn:</strong> {q.correctText}
                  </div>
                )}

                {/* Giải thích chi tiết */}
                {q.explanation && (
                  <div className="preview-explanation-box">
                    <strong>Giải thích chi tiết:</strong>
                    <div style={{ marginTop: 4 }}>{q.explanation}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: '#94a3b8',
              background: '#f8fafc',
              borderRadius: 8,
            }}
          >
            Bài học này không có bộ câu hỏi trắc nghiệm.
          </div>
        )}
      </div>
    </main>
  )
}
