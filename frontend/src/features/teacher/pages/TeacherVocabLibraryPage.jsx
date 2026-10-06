import { useState } from 'react'
import FlashcardCard from '@shared/components/FlashcardCard.jsx'
import ConfirmDeleteModal from '@teacher/components/ConfirmDeleteModal.jsx'
import VocabWordModal from '@teacher/components/modals/VocabWordModal.jsx'
import { useVocabLibrary, useDeleteVocabWord } from '@teacher/hooks/useTeacherVocabWords.js'

/**
 * TeacherVocabLibraryPage — quản lý TOÀN BỘ từ vựng của giáo viên ở 1 nơi (độc lập với từng
 * khoá học/Bộ từ vựng cụ thể). Xoá ở đây là XOÁ HẲN khỏi thư viện — khác với "gỡ khỏi Bộ" ở
 * VocabSetEditor. Hữu ích khi giáo viên muốn chuẩn bị sẵn kho từ trước khi soạn bài.
 */
export default function TeacherVocabLibraryPage() {
  const { data: words, isLoading } = useVocabLibrary()
  const deleteWord = useDeleteVocabWord()
  const [search, setSearch] = useState('')
  const [wordModal, setWordModal] = useState({ open: false, word: null })
  const [deletingWord, setDeletingWord] = useState(null)

  const filtered = (words || []).filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaningVi.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="teacher-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Thư viện từ vựng</h2>
          <p className="text-dim text-sm" style={{ marginTop: 4 }}>
            Toàn bộ từ vựng bạn đã tạo — dùng lại được ở nhiều Bộ từ vựng/khoá học khác nhau.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setWordModal({ open: true, word: null })}>
          + Tạo từ mới
        </button>
      </div>

      <div className="field" style={{ maxWidth: 320 }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo từ hoặc nghĩa..." />
      </div>

      {isLoading && <p className="text-dim">Đang tải...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>{words?.length ? 'Không tìm thấy từ phù hợp.' : 'Bạn chưa có từ vựng nào trong thư viện.'}</p>
        </div>
      )}

      <div className="vocab-set-grid mt-16">
        {filtered.map((w) => (
          <div key={w.id} className="vocab-word-tile editable-block">
            <div className="editable-actions">
              <button type="button" onClick={() => setWordModal({ open: true, word: w })} title="Sửa từ này">✏️</button>
              <button type="button" className="danger" onClick={() => setDeletingWord(w)} title="Xoá khỏi thư viện">🗑️</button>
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

      <VocabWordModal
        open={wordModal.open}
        word={wordModal.word}
        onClose={() => setWordModal({ open: false, word: null })}
      />

      <ConfirmDeleteModal
        open={!!deletingWord}
        title="Xoá từ vựng"
        description={`Xoá hẳn "${deletingWord?.word}" khỏi thư viện? Từ này sẽ biến mất khỏi TẤT CẢ các Bộ từ vựng đang dùng nó.`}
        onClose={() => setDeletingWord(null)}
        onConfirm={() => deleteWord.mutateAsync(deletingWord.id)}
      />
    </div>
  )
}
