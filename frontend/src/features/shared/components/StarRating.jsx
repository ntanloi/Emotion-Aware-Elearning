import { useState } from 'react'

/**
 * StarRating — hiển thị 1-5 sao.
 * - readOnly (mặc định): chỉ hiển thị, dùng cho card khoá học / danh sách review.
 * - interactive: cho phép bấm chọn sao (dùng trong form viết đánh giá).
 */
export default function StarRating({ value = 0, onChange, readOnly = true, size = 18 }) {
  const [hover, setHover] = useState(0)
  const display = readOnly ? value : (hover || value)

  return (
    <span
      className="star-rating"
      style={{ display: 'inline-flex', gap: 2, cursor: readOnly ? 'default' : 'pointer' }}
      onMouseLeave={() => !readOnly && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          style={{
            fontSize: size,
            lineHeight: 1,
            color: star <= display ? 'var(--warn)' : 'var(--border)',
          }}
        >
          ★
        </span>
      ))}
    </span>
  )
}
