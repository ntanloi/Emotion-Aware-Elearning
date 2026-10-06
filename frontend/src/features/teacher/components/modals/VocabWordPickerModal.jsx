import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import { useVocabLibrary } from '@teacher/hooks/useTeacherVocabWords.js'

/**
 * VocabWordPickerModal — chọn nhiều từ ĐÃ CÓ trong thư viện riêng của giáo viên để thêm vào
 * Bộ từ vựng đang soạn. `excludeIds` = các từ đã có sẵn trong Bộ này (không hiện lại để chọn
 * trùng).
 */
export default function VocabWordPickerModal({ open, excludeIds = [], onClose, onConfirm }) {
  const { data: library, isLoading } = useVocabLibrary()
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setSelected([])
    setSearch('')
  }, [open])

  const available = (library || []).filter((w) => !excludeIds.includes(w.id))
  const filtered = available.filter(
    (w) =>
      w.word.toLowerCase().includes(search.toLowerCase()) ||
      w.meaningVi.toLowerCase().includes(search.toLowerCase()),
  )

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const handleConfirm = () => {
    onConfirm?.(selected)
    onClose?.()
  }

  return (
    <Modal open={open} title="Chọn từ có sẵn trong thư viện" onClose={onClose} width={520}>
      <div className="field">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo từ hoặc nghĩa..." />
      </div>

      {isLoading && <p className="text-dim">Đang tải...</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-dim text-sm">
          {available.length === 0
            ? 'Thư viện của bạn chưa có từ nào khác (hoặc tất cả đã có trong Bộ này rồi).'
            : 'Không tìm thấy từ phù hợp.'}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="vocab-picker-list">
          {filtered.map((w) => (
            <label key={w.id} className={`vocab-picker-row ${selected.includes(w.id) ? 'checked' : ''}`}>
              <input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggle(w.id)} />
              <div>
                <strong>{w.word}</strong> <span className="text-dim text-sm">— {w.meaningVi}</span>
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="modal-footer">
        <button type="button" className="btn secondary" onClick={onClose}>Huỷ</button>
        <button type="button" className="btn" onClick={handleConfirm} disabled={selected.length === 0}>
          Thêm{selected.length > 0 ? ` (${selected.length})` : ''}
        </button>
      </div>
    </Modal>
  )
}
