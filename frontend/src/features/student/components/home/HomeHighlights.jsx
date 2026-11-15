import { useNavigate } from 'react-router-dom'
import { Target, BookCheck, Layers, ArrowRight } from 'lucide-react'

/**
 * 3 Khối lối tắt hành động thông minh (Smart Action Cards) trên Trang chủ học viên.
 * Cho phép học viên truy cập ngay lập tức vào Luyện đề, Ôn từ vựng Flashcard, hoặc lọc khóa học theo mục tiêu điểm.
 */
export const HIGHLIGHTS = [
  {
    id: 'target-path',
    icon: Target,
    theme: 'blue',
    title: 'Lộ trình theo mục tiêu điểm',
    badge: 'Mục tiêu điểm',
    description:
      'Các khóa học chia rõ thang điểm 450, 650 và 800+ TOEIC Full Skills với video bài giảng chi tiết và thực hành theo kỹ năng.',
    actionLabel: 'Xem lộ trình',
    actionType: 'SCROLL_COURSES',
  },
  {
    id: 'practice-notebook',
    icon: BookCheck,
    theme: 'indigo',
    title: 'Luyện đề & Sổ tay câu sai',
    badge: 'Đề thi 2026',
    description:
      'Luyện thi Part 1–7 bấm giờ như thi thật. Hệ thống tự động gom các câu bạn làm sai vào Sổ tay riêng để củng cố lỗ hổng.',
    actionLabel: 'Luyện đề ngay',
    actionType: 'NAVIGATE',
    to: '/tests',
  },
  {
    id: 'spaced-vocab',
    icon: Layers,
    theme: 'emerald',
    title: 'Ôn từ vựng ngắt quãng',
    badge: 'Thuật toán SM-2',
    description:
      'Thuật toán Spaced Repetition (SM-2) tính toán thời điểm vàng để ôn tập Flashcards, giúp ghi nhớ lâu bền không quá tải.',
    actionLabel: 'Ôn Flashcards',
    actionType: 'NAVIGATE',
    to: '/flashcards/review',
  },
]

export default function HomeHighlights({ onExploreCourses }) {
  const navigate = useNavigate()

  const handleCardClick = (item) => {
    if (item.actionType === 'NAVIGATE' && item.to) {
      navigate(item.to)
    } else if (item.actionType === 'SCROLL_COURSES') {
      if (onExploreCourses) {
        onExploreCourses()
      } else {
        document.getElementById('course-list-section')?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="home-highlights-grid">
      {HIGHLIGHTS.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.id}
            className={`home-highlight-card theme-${item.theme}`}
            onClick={() => handleCardClick(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCardClick(item)
              }
            }}
          >
            <div className="highlight-card-top">
              <div className="highlight-icon-wrap">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              {item.badge && <span className="highlight-mini-badge">{item.badge}</span>}
            </div>

            <div className="highlight-content">
              <h3 className="highlight-title">{item.title}</h3>
              <p className="highlight-desc">{item.description}</p>
            </div>

            <div className="highlight-action-link">
              <span>{item.actionLabel}</span>
              <ArrowRight size={14} className="action-arrow-icon" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
