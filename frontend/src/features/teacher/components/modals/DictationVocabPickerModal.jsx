import { useEffect, useMemo, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import { useContentTree } from '@shared/hooks/useContentSection.js'
import { useVocabSetWords } from '@teacher/hooks/useTeacherVocabSet.js'

/**
 * DictationVocabPickerModal — luồng chọn nguồn từ vựng RIÊNG cho "Luyện nghe chép chính tả".
 *
 * DICTATION_SET là 1 hoạt động lẻ trong sidebar (mục "Luyện nghe chép chính tả"), không có Bộ
 * từ vựng Flashcard của CHÍNH nó như các hoạt động trong mục "Từ vựng TOEIC". Vì vậy modal này
 * cho giáo viên duyệt qua cây Nhóm hoạt động > Bộ từ vựng Flashcard > Từ vựng của mục "Từ vựng
 * TOEIC" (cùng khoá học) để chọn từ, thay vì chọn thẳng từ thư viện phẳng như
 * VocabWordPickerModal (dùng khi soạn chính 1 Bộ từ vựng).
 *
 * Luồng 3 bước, có breadcrumb quay lại được:
 * 1. groups — danh sách Nhóm hoạt động (chỉ hiện nhóm có ít nhất 1 Bộ từ vựng Flashcard)
 * 2. items  — danh sách Bộ từ vựng Flashcard trong Nhóm đó (BỎ QUA bước này, vào thẳng bước 3
 *             nếu Nhóm chỉ có đúng 1 Bộ — đỡ thêm 1 cú bấm không cần thiết)
 * 3. words  — danh sách từ (flashcard) của 1 Bộ, tick chọn từng từ
 *
 * QUAN TRỌNG — LƯU TẠM KHI CHUYỂN QUA LẠI GIỮA CÁC PART: `selected` là 1 Set các wordId nằm ở
 * STATE CHUNG của modal (không thuộc riêng bước "words"), nên khi giáo viên quay lại danh sách
 * Nhóm rồi mở 1 Nhóm/Bộ khác, các từ đã tick ở Bộ trước đó VẪN CÒN — chỉ mất khi bấm "Huỷ"/đóng
 * modal, và chỉ được xác nhận thật sự (gọi onConfirm) khi bấm "Xong".
 */
export default function DictationVocabPickerModal({ open, courseId, onClose, onConfirm }) {
  const { data: tree, isLoading: loadingTree } = useContentTree(courseId, 'VOCAB')
  const [selected, setSelected] = useState(new Set())
  const [nav, setNav] = useState({ view: 'groups', groupId: null, itemId: null })

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setNav({ view: 'groups', groupId: null, itemId: null })
  }, [open])

  // Chỉ hiện Nhóm có ít nhất 1 Bộ từ vựng Flashcard (VOCAB_SET) — Nhóm rỗng hoặc chỉ chứa loại
  // hoạt động khác thì không có gì để chọn làm nguồn chính tả.
  const groups = useMemo(
    () => (tree?.groups || []).filter((g) => (g.items || []).some((it) => it.type === 'VOCAB_SET')),
    [tree],
  )

  const currentGroup = groups.find((g) => g.id === nav.groupId) || null
  const vocabSetItems = currentGroup ? (currentGroup.items || []).filter((it) => it.type === 'VOCAB_SET') : []
  const currentItem = vocabSetItems.find((it) => it.id === nav.itemId) || null

  const { data: words, isLoading: loadingWords } = useVocabSetWords(nav.view === 'words' ? nav.itemId : null)

  const openGroup = (group) => {
    const setsInGroup = (group.items || []).filter((it) => it.type === 'VOCAB_SET')
    if (setsInGroup.length === 1) {
      setNav({ view: 'words', groupId: group.id, itemId: setsInGroup[0].id })
    } else {
      setNav({ view: 'items', groupId: group.id, itemId: null })
    }
  }
  const openItem = (item) => setNav((n) => ({ ...n, view: 'words', itemId: item.id }))
  const backToGroups = () => setNav({ view: 'groups', groupId: null, itemId: null })
  const backToItems = () => setNav((n) => ({ ...n, view: 'items', itemId: null }))

  const toggleWord = (id) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleConfirm = () => {
    onConfirm?.(Array.from(selected))
    onClose?.()
  }

  return (
    <Modal open={open} title="Chọn từ vựng cho Bộ chính tả" onClose={onClose} width={620}>
      <div className="flex-row text-sm" style={{ gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="breadcrumb-btn" onClick={backToGroups} disabled={nav.view === 'groups'}>
          Nhóm hoạt động
        </button>
        {currentGroup && (
          <>
            <span className="text-dim">›</span>
            <button
              type="button"
              className="breadcrumb-btn"
              onClick={vocabSetItems.length > 1 ? backToItems : backToGroups}
              disabled={nav.view === 'items' || (nav.view === 'words' && vocabSetItems.length === 1)}
            >
              {currentGroup.title}
            </button>
          </>
        )}
        {nav.view === 'words' && currentItem && vocabSetItems.length > 1 && (
          <>
            <span className="text-dim">›</span>
            <button type="button" className="breadcrumb-btn" disabled>{currentItem.title}</button>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="badge neutral mb-16" style={{ marginBottom: 16 }}>
          Đã chọn {selected.size} từ — có thể quay lại danh sách Nhóm để chọn thêm từ Part khác trước khi bấm "Xong"
        </div>
      )}

      {nav.view === 'groups' && (
        <>
          {loadingTree && <p className="text-dim">Đang tải...</p>}
          {!loadingTree && groups.length === 0 && (
            <p className="text-dim text-sm">
              Mục "Từ vựng TOEIC" của khoá học này chưa có Bộ từ vựng Flashcard nào để chọn.
            </p>
          )}
          <div>
            {groups.map((g) => {
              const count = (g.items || []).filter((it) => it.type === 'VOCAB_SET').length
              return (
                <button
                  key={g.id} type="button" className="card hoverable picker-option-card"
                  onClick={() => openGroup(g)}
                >
                  <strong>{g.title}</strong>
                  <div className="text-dim text-sm mt-4">{count} Bộ từ vựng</div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {nav.view === 'items' && (
        <div>
          {vocabSetItems.map((it) => (
            <button
              key={it.id} type="button" className="card hoverable picker-option-card"
              onClick={() => openItem(it)}
            >
              <strong>{it.title}</strong>
            </button>
          ))}
        </div>
      )}

      {nav.view === 'words' && (
        <>
          {loadingWords && <p className="text-dim">Đang tải...</p>}
          {!loadingWords && (words || []).length === 0 && (
            <p className="text-dim text-sm">Bộ từ vựng này chưa có từ nào.</p>
          )}
          {(words || []).length > 0 && (
            <div className="vocab-picker-list">
              {(words || []).map((w) => (
                <label key={w.id} className={`vocab-picker-row ${selected.has(w.id) ? 'checked' : ''}`}>
                  <input type="checkbox" checked={selected.has(w.id)} onChange={() => toggleWord(w.id)} />
                  <div>
                    <strong>{w.word}</strong> <span className="text-dim text-sm">— {w.meaningVi}</span>
                    {!w.audioUsUrl && <span className="text-dim text-sm"> (chưa có Audio US)</span>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </>
      )}

      <div className="modal-footer">
        <button type="button" className="btn secondary" onClick={onClose}>Huỷ</button>
        <button type="button" className="btn" onClick={handleConfirm} disabled={selected.size === 0}>
          Xong{selected.size > 0 ? ` (${selected.size} từ)` : ''}
        </button>
      </div>
    </Modal>
  )
}