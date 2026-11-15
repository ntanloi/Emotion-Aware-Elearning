import { useState } from 'react'
import { Star } from 'lucide-react'

/**
 * StarRating — hiển thị 1-5 sao.
 * - readOnly (mặc định): chỉ hiển thị, dùng cho card khoá học / danh sách review (hỗ trợ nửa sao mượt mà).
 * - interactive: cho phép bấm chọn sao (dùng trong form viết đánh giá).
 */
export default function StarRating({ value = 0, onChange, readOnly = true, size = 18 }) {
  const [hover, setHover] = useState(0)
  const display = readOnly ? value : (hover || value)

  return (
    <span
      className="star-rating"
      style={{ display: 'inline-flex', gap: 2, cursor: readOnly ? 'default' : 'pointer', alignItems: 'center' }}
      onMouseLeave={() => !readOnly && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = star <= display
        const isHalf = readOnly && !isFull && display >= star - 0.75

        return (
          <span
            key={star}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            style={{
              lineHeight: 1,
              position: 'relative',
              display: 'inline-flex',
            }}
          >
            {isHalf ? (
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Star size={size} strokeWidth={1.5} fill="none" color="#cbd5e1" />
                <span style={{ position: 'absolute', left: 0, top: 0, overflow: 'hidden', width: '50%' }}>
                  <Star size={size} strokeWidth={1.5} fill="#f59e0b" color="#f59e0b" />
                </span>
              </span>
            ) : (
              <Star
                size={size}
                fill={isFull ? '#f59e0b' : 'none'}
                color={isFull ? '#f59e0b' : '#cbd5e1'}
                strokeWidth={1.5}
              />
            )}
          </span>
        )
      })}
    </span>
  )
}
