/**
 * VocabPracticeTabs — Giai đoạn 6.
 * 5 tab chọn dạng luyện tập trong VOCAB_SET. Chỉ hiện khi content_item.type === 'VOCAB_SET'.
 */
const TABS = [
  { type: 'FLASHCARD', label: '🗂️ Flashcard' },
  { type: 'MULTIPLE_CHOICE', label: '✅ Trắc nghiệm' },
  { type: 'MATCHING', label: '🔗 Ghép cặp' },
  { type: 'LISTENING', label: '🎧 Nghe' },
  { type: 'FILL_BLANK', label: '✍️ Dịch nghĩa/Điền từ' },
]

export default function VocabPracticeTabs({ active, onChange, progressByType }) {
  return (
    <div className="tabs">
      {TABS.map((t) => (
        <button
          key={t.type}
          className={`tab-btn ${active === t.type ? 'active' : ''}`}
          onClick={() => onChange(t.type)}
        >
          {t.label} {progressByType?.[t.type] && ' ✓'}
        </button>
      ))}
    </div>
  )
}
