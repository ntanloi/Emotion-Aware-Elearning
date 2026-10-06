import { useState } from 'react'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import ConfirmDeleteModal from '@teacher/components/ConfirmDeleteModal.jsx'
import DictationVocabPickerModal from '@teacher/components/modals/DictationVocabPickerModal.jsx'
import { useTeacherQuestions, useDeleteQuestion } from '@teacher/hooks/useTeacherQuestions.js'
import { useGenerateDictation } from '@teacher/hooks/useTeacherDictation.js'

/**
 * DictationSetEditor — TỰ SINH câu hỏi chính tả từ thư viện từ vựng (đúng yêu cầu: lấy audio
 * US, đáp án so khớp tên từ). Giáo viên chọn từ qua DictationVocabPickerModal — duyệt theo cây
 * Nhóm hoạt động > Bộ từ vựng Flashcard > Từ (vì Luyện nghe chép chính tả là hoạt động lẻ,
 * không có Bộ từ vựng riêng như các hoạt động trong mục "Từ vựng TOEIC") → bấm Sinh → toàn bộ
 * câu chính tả CŨ của Bộ này bị xoá và thay bằng danh sách MỚI (idempotent, xem
 * DictationGeneratorService phía backend).
 */
export default function DictationSetEditor({ item }) {
  const { data: questions, isLoading } = useTeacherQuestions(item.id)
  const deleteQuestion = useDeleteQuestion(item.id)
  const generateDictation = useGenerateDictation(item.id)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [deletingQuestion, setDeletingQuestion] = useState(null)
  const [result, setResult] = useState(null) // { skippedWords }
  const [error, setError] = useState(null)

  const handlePickConfirm = async (wordIds) => {
    if (wordIds.length === 0) return
    setError(null)
    setResult(null)
    try {
      const res = await generateDictation.mutateAsync({ vocabWordIds: wordIds })
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.error || 'Không sinh được câu luyện chính tả, vui lòng thử lại')
    }
  }

  return (
    <div>
      <p className="text-dim text-sm">
        Chọn từ vựng có sẵn (chỉ những từ đã có Audio US mới sinh được câu luyện chính tả). Sinh
        lại sẽ THAY THẾ TOÀN BỘ danh sách câu chính tả hiện tại của Bộ này.
      </p>

      {error && <div className="form-error">{error}</div>}
      {result && (
        <div className="form-error" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          Đã sinh {result.questions.length} câu luyện chính tả.
          {result.skippedWords.length > 0 && (
            <> Bỏ qua {result.skippedWords.length} từ chưa có Audio US: {result.skippedWords.join(', ')}.</>
          )}
        </div>
      )}

      <button
        type="button"
        className="add-card-trigger"
        onClick={() => setPickerOpen(true)}
        disabled={generateDictation.isPending}
      >
        <span className="plus-icon">+</span>
        {generateDictation.isPending ? 'Đang sinh câu hỏi...' : 'Chọn từ vựng & Sinh câu luyện chính tả'}
      </button>

      <h4 className="mt-24">Danh sách câu luyện chính tả hiện tại</h4>
      {isLoading && <p className="text-dim">Đang tải...</p>}
      {!isLoading && (questions || []).length === 0 && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>Chưa có câu luyện chính tả nào — chọn từ vựng ở trên để sinh.</p>
        </div>
      )}

      <div className="stack-list mt-16">
        {(questions || []).map((q, i) => (
          <div key={q.id} className="card editable-block flex-row" style={{ gap: 16, alignItems: 'center' }}>
            <div className="editable-actions">
              <button type="button" className="danger" onClick={() => setDeletingQuestion(q)} title="Xoá câu này">🗑️</button>
            </div>
            <span className="text-dim" style={{ width: 24 }}>{i + 1}.</span>
            <AudioPlayer src={q.audioUrl} compact />
            <span><strong>Đáp án:</strong> {q.correctText}</span>
          </div>
        ))}
      </div>

      <DictationVocabPickerModal
        open={pickerOpen}
        courseId={item.courseId}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickConfirm}
      />

      <ConfirmDeleteModal
        open={!!deletingQuestion}
        title="Xoá câu luyện chính tả"
        description={`Xoá câu chính tả cho từ "${deletingQuestion?.correctText}"?`}
        onClose={() => setDeletingQuestion(null)}
        onConfirm={() => deleteQuestion.mutateAsync(deletingQuestion.id)}
      />
    </div>
  )
}