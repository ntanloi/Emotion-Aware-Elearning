import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { snapshotTest } from '@teacher/api/teacherTests.js'

export default function PublishToLibraryModal({ open, onClose, item, courseId }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Tự động đoán partNo từ sectionCode (ví dụ: "PART5" -> 5)
  const detectedPartNo = (() => {
    if (!item?.sectionCode) return 5
    const match = item.sectionCode.match(/PART(\d)/i)
    return match ? parseInt(match[1], 10) : 5
  })()

  const [title, setTitle] = useState(item?.title ? `Đề thi TOEIC - ${item.title}` : 'Đề thi TOEIC mới')
  const [description, setDescription] = useState(
    'Bản sao đề thi độc lập đóng góp lên thư viện đề thi TOEIC cộng đồng.'
  )
  const [partNo, setPartNo] = useState(detectedPartNo)
  const [listeningMinutes, setListeningMinutes] = useState(45)
  const [readingMinutes, setReadingMinutes] = useState(75)

  if (!open || !item) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề đề thi')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      await snapshotTest({
        sourceCourseId: courseId,
        title: title.trim(),
        description: description.trim(),
        parts: [
          {
            partNo: parseInt(partNo, 10),
            sourceContentItemId: item.id,
          },
        ],
        listeningMinutes: parseInt(listeningMinutes, 10) || 45,
        readingMinutes: parseInt(readingMinutes, 10) || 75,
      })

      onClose()
      navigate('/teacher/tests')
    } catch (err) {
      console.error('Lỗi sao chép đề lên thư viện:', err)
      setErrorMsg(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi sao chép đề thi.')
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 540,
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
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
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UploadCloud size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Đóng góp đề thi lên Thư viện
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Thông báo cơ chế Snapshot */}
          <div
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid rgba(37,99,235,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--accent)',
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              Hệ thống sẽ sao chép (Snapshot) đề thi và toàn bộ câu hỏi sang kho chứa đề công khai độc lập.
              Sau khi tạo, nếu bạn chỉnh sửa đề trong khóa học này thì đề trên thư viện sẽ <strong>không bị thay đổi</strong>.
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                background: 'var(--bad-soft)',
                color: 'var(--bad)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: 13,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
              Tiêu đề hiển thị trên Thư viện đề <span style={{ color: 'var(--bad)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
                Thuộc phần thi (Part)
              </label>
              <select
                value={partNo}
                onChange={(e) => setPartNo(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <option key={num} value={num}>
                    Part {num} {num <= 4 ? '(Nghe)' : '(Đọc)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
                Đề gốc trong khóa học
              </label>
              <input
                type="text"
                disabled
                value={item.title}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                  background: 'var(--surface-2)',
                  color: 'var(--text-dim)',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
              Mô tả ngắn về đề thi
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13.5,
                background: 'var(--surface)',
                color: 'var(--text)',
                resize: 'none',
              }}
            />
          </div>

          {/* Footer nút hành động */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-test-action"
              style={{ padding: '7px 18px', fontWeight: 500 }}
            >
              {submitting ? 'Đang tạo bản sao...' : 'Tạo bản sao & Đăng lên thư viện'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
