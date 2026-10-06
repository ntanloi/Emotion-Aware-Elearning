import { useState } from 'react'
import FlashcardCard from '@shared/components/FlashcardCard.jsx'
import ConfirmDeleteModal from '@teacher/components/ConfirmDeleteModal.jsx'
import VocabWordModal from '@teacher/components/modals/VocabWordModal.jsx'
import VocabWordPickerModal from '@teacher/components/modals/VocabWordPickerModal.jsx'
import { useVocabSetWords, useSetVocabSetWords } from '@teacher/hooks/useTeacherVocabSet.js'

/**
 * VocabSetEditor — đúng luồng bạn mô tả: mỗi từ là 1 Flashcard hiển thị y hệt học viên sẽ
 * thấy (dùng lại nguyên FlashcardCard). Thêm từ bằng 2 cách: "Chọn từ có sẵn trong thư viện"
 * hoặc "Tạo từ mới". Xoá ở đây chỉ GỠ khỏi Bộ này (không xoá khỏi thư viện — từ có thể dùng
 * lại ở Bộ khác).
 */
export default function VocabSetEditor({ item }) {
  const { data: words, isLoading } = useVocabSetWords(item.id)
  const setWords = useSetVocabSetWords(item.id)

  const [wordModal, setWordModal] = useState({ open: false, word: null })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removingWord, setRemovingWord] = useState(null)
  const [error, setError] = useState(null)

  const currentIds = (words || []).map((w) => w.id)

  const openCreate = () => setWordModal({ open: true, word: null })
  const openEdit = (word) => setWordModal({ open: true, word })

  const handleWordSaved = async (savedWord) => {
    // Neu la tu MOI tao (chua co trong Bo nay) -> them vao cuoi danh sach hien tai
    if (!currentIds.includes(savedWord.id)) {
      setError(null)
      try {
        await setWords.mutateAsync([...currentIds, savedWord.id])
      } catch (err) {
        setError(err.response?.data?.error || 'Không thêm được từ vào Bộ, vui lòng thử lại')
      }
    }
    // Neu la SUA tu da co san -> khong can goi setVocabWords, chi can invalidate cache tu (da
    // tu dong lam trong useUpdateVocabWord/useVocabSetWords khi refetch)
  }

  const handlePickConfirm = async (pickedIds) => {
    if (pickedIds.length === 0) return
    setError(null)
    try {
      await setWords.mutateAsync([...currentIds, ...pickedIds])
    } catch (err) {
      setError(err.response?.data?.error || 'Không thêm được từ vào Bộ, vui lòng thử lại')
    }
  }

  const handleRemove = async () => {
    await setWords.mutateAsync(currentIds.filter((id) => id !== removingWord.id))
  }

  return (
    <div>
      <p className="text-dim text-sm">
        Mỗi từ hiển thị dưới đây đúng như học viên sẽ thấy khi học. Không điền câu ví dụ thì mặt
        sau Flashcard sẽ không có phần Ví dụ.
      </p>
      {error && <div className="form-error">{error}</div>}

      {isLoading && <p className="text-dim">Đang tải...</p>}

      {!isLoading && (
        <div className="vocab-set-grid mt-16">
          {(words || []).map((w) => (
            <div key={w.id} className="vocab-word-tile editable-block">
              <div className="editable-actions">
                <button type="button" onClick={() => openEdit(w)} title="Sửa từ này">✏️</button>
                <button type="button" className="danger" onClick={() => setRemovingWord(w)} title="Gỡ khỏi Bộ này">🗑️</button>
              </div>
              <FlashcardCard
                word={w.word}
                ipa={w.ipa}
                partOfSpeech={w.partOfSpeech}
                meaningVi={w.meaningVi}
                imageUrl={w.imageUrl}
                audioUkUrl={w.audioUkUrl}
                audioUsUrl={w.audioUsUrl}
                examples={w.examples}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex-row mt-16" style={{ gap: 12 }}>
        <button type="button" className="add-card-trigger compact" style={{ flex: 1 }} onClick={() => setPickerOpen(true)}>
          <span className="plus-icon">+</span> Chọn từ có sẵn trong thư viện
        </button>
        <button type="button" className="add-card-trigger compact" style={{ flex: 1 }} onClick={openCreate}>
          <span className="plus-icon">+</span> Tạo từ mới
        </button>
      </div>

      <VocabWordModal
        open={wordModal.open}
        word={wordModal.word}
        onClose={() => setWordModal({ open: false, word: null })}
        onSaved={handleWordSaved}
      />

      <VocabWordPickerModal
        open={pickerOpen}
        excludeIds={currentIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickConfirm}
      />

      <ConfirmDeleteModal
        open={!!removingWord}
        title="Gỡ từ khỏi Bộ từ vựng"
        description={`Gỡ "${removingWord?.word}" khỏi Bộ này? Từ vẫn được giữ trong thư viện của bạn để dùng lại ở Bộ khác.`}
        onClose={() => setRemovingWord(null)}
        onConfirm={handleRemove}
      />
    </div>
  )
}
