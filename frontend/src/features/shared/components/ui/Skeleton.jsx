import React from 'react'

/**
 * Skeleton - Khung tải trang mượt mà (placeholder loading) thay cho văn bản "Đang tải..."
 */
export default function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 'var(--radius-sm, 6px)',
  className = '',
  style = {},
}) {
  return (
    <div
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.5s infinite ease-in-out',
        ...style,
      }}
    />
  )
}
