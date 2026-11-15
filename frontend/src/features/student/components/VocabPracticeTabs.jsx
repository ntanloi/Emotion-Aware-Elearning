/**
 * VocabPracticeTabs — Giai đoạn 6.
 * 5 tab chọn dạng luyện tập trong VOCAB_SET. Chỉ hiện khi content_item.type === 'VOCAB_SET'.
 * Thiết kế segmented control hiện đại với icon chuyên biệt cho từng dạng bài.
 */
import { Layers, CheckSquare, Puzzle, Headphones, FileEdit, Check } from 'lucide-react'

const TABS = [
  { type: 'FLASHCARD', label: 'Flashcard', icon: Layers },
  { type: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm', icon: CheckSquare },
  { type: 'MATCHING', label: 'Ghép cặp', icon: Puzzle },
  { type: 'LISTENING', label: 'Luyện nghe', icon: Headphones },
  { type: 'FILL_BLANK', label: 'Dịch nghĩa / Điền từ', icon: FileEdit },
]

export default function VocabPracticeTabs({ active, onChange, progressByType }) {
  return (
    <div className="vocab-tabs-bar-container">
      <div className="vocab-tabs-track" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = active === t.type
          const isDone = !!progressByType?.[t.type]

          return (
            <button
              key={t.type}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`vocab-tab-pill ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => onChange(t.type)}
            >
              <span className="vocab-tab-icon-wrap">
                <Icon size={16} />
              </span>
              <span className="vocab-tab-label">{t.label}</span>
              {isDone && (
                <span className="vocab-tab-check-badge" title="Đã hoàn thành">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
