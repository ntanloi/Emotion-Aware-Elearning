/**
 * ProgressBadge — Giai đoạn 6, Bước 10.
 * Tick hoàn thành xanh/xám theo content_item_progress (BR-20: mỗi practiceType 1 dòng riêng).
 * Props: completed: boolean, label?: string
 */
export default function ProgressBadge({ completed, label }) {
  return (
    <span className="flex-row" style={{ gap: 6 }}>
      <span className={`progress-tick ${completed ? 'done' : ''}`}>{completed ? '✓' : ''}</span>
      {label && <span className="text-sm text-dim">{label}</span>}
    </span>
  )
}
