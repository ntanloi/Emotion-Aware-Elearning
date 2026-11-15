import { useState } from 'react'
import RichTextEditor from '@shared/components/ui/RichTextEditor.jsx'
import { GRAMMAR_TEMPLATES, findEmptySections } from '@shared/components/ui/editorTemplates.js'
import { useUpdateContentItem } from '@teacher/hooks/useTeacherContentItems.js'
import { AlertCircle } from 'lucide-react'

/**
 * GrammarArticleEditor — soạn nội dung lý thuyết ngữ pháp bằng RichTextEditor (Tiptap) có sẵn.
 * Lưu thủ công qua nút "Lưu nội dung" (không auto-save mỗi phím gõ để tránh spam request).
 */
export default function GrammarArticleEditor({ item }) {
  const updateItem = useUpdateContentItem(item.courseId, item.sectionCode)
  const [html, setHtml] = useState(item.bodyHtml || '')
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState(null)
  const [emptyWarning, setEmptyWarning] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  const handleChange = (value) => {
    setHtml(value)
    setDirty(true)
  }

  const handleSave = async () => {
    setError(null)
    const emptySecs = findEmptySections(html)
    if (emptySecs.length > 0) {
      setEmptyWarning(`Còn ${emptySecs.length} mục chưa điền nội dung: ${emptySecs.join(', ')}`)
    } else {
      setEmptyWarning(null)
    }
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { bodyHtml: html } })
      setDirty(false)
      setSavedAt(new Date())
    } catch (err) {
      setError(err.response?.data?.error || 'Không lưu được nội dung, vui lòng thử lại')
    }
  }

  return (
    <div>
      <p className="text-dim text-sm">
        Soạn nội dung lý thuyết ngữ pháp. Học viên sẽ đọc đúng nội dung bạn soạn bên dưới, kèm
        các câu hỏi luyện tập (nếu có) sau phần lý thuyết.
      </p>
      {error && <div className="form-error">{error}</div>}

      <RichTextEditor
        templates={GRAMMAR_TEMPLATES}
        value={html}
        onChange={handleChange}
        placeholder="Soạn nội dung ngữ pháp..."
      />

      {emptyWarning && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 10,
          padding: '8px 12px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 8,
          fontSize: 12.5,
          color: 'var(--warn)'
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{emptyWarning}</span>
        </div>
      )}

      <div className="flex-row mt-16" style={{ justifyContent: 'flex-end', gap: 12 }}>
        {!dirty && savedAt && <span className="text-dim text-sm">Đã lưu lúc {savedAt.toLocaleTimeString('vi-VN')}</span>}
        {dirty && <span className="text-dim text-sm">Có thay đổi chưa lưu</span>}
        <button type="button" className="btn" onClick={handleSave} disabled={updateItem.isPending || !dirty}>
          {updateItem.isPending ? 'Đang lưu...' : 'Lưu nội dung'}
        </button>
      </div>
    </div>
  )
}
