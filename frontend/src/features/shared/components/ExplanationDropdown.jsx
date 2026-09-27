import { useState } from 'react'

/**
 * ExplanationDropdown — Component hiển thị giải thích đáp án dưới dạng dropdown có thể xổ xuống.
 * Chỉ hiển thị khi có explanation (giáo viên đã nhập giải thích).
 * 
 * Props:
 *  - explanation: nội dung giải thích đáp án (string)
 *  - className: CSS class tùy chỉnh (optional)
 */
export default function ExplanationDropdown({ explanation, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)

  // Không render gì nếu không có explanation
  if (!explanation || !explanation.trim()) {
    return null
  }

  return (
    <div className={`explanation-dropdown ${className}`}>
      <button
        type="button"
        className="explanation-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="explanation-toggle-icon">{isOpen ? '▼' : '▶'}</span>
        <span className="explanation-toggle-text">Giải thích</span>
      </button>
      {isOpen && (
        <div className="explanation-content">
          {explanation}
        </div>
      )}
    </div>
  )
}
