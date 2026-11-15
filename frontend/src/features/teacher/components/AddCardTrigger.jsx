import { Plus } from 'lucide-react'

/**
 * AddCardTrigger — ô nút thêm dùng chung mọi nơi giáo viên cần thêm mới (Unit, Nhóm hoạt động,
 * Hoạt động con, Từ vựng...). Luôn đặt ở CUỐI danh sách card đã có, đúng yêu cầu:
 * "nếu giáo viên đã tạo sẵn các card trước đó rồi thì card dấu cộng sẽ nằm ở dưới các card đó".
 */
export default function AddCardTrigger({ label, onClick, compact = false }) {
  return (
    <button
      type="button"
      className={`add-card-trigger${compact ? ' compact' : ''}`}
      onClick={onClick}
      aria-label={label || 'Thêm mới'}
    >
      <span className="plus-icon">
        <Plus size={compact ? 15 : 18} />
      </span>
      <span>{label}</span>
    </button>
  )
}
