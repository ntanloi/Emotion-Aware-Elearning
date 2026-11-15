import { useEffect, useState, useRef } from 'react'
import { ImageOff, RotateCcw } from 'lucide-react'
import { resolveMediaUrl } from '@config/media.js'

/**
 * QuestionImage — Component hiển thị hình ảnh câu hỏi / đoạn văn với placeholder cố định kích cỡ khi lỗi.
 * Khi ảnh lỗi (Cloudinary lỗi / 404 / mất mạng), thay thế bằng một khung placeholder đẹp mắt
 * có đúng kích thước ảnh thật để không làm vỡ hoặc giật bố cục giao diện bài thi.
 *
 * Props:
 *  - src: string
 *  - alt: string
 *  - aspectRatio: string (mặc định '4 / 3')
 *  - maxWidth: number | string (mặc định '520px')
 *  - maxHeight: number | string (mặc định '340px')
 *  - className: string
 */
export default function QuestionImage({
  src,
  alt = 'Minh hoạ câu hỏi',
  aspectRatio = '4 / 3',
  maxWidth = '520px',
  maxHeight = '340px',
  className = '',
}) {
  const [status, setStatus] = useState('loading') // 'loading' | 'loaded' | 'error'
  const [retryCount, setRetryCount] = useState(0)
  const imgRef = useRef(null)

  const resolvedSrc = resolveMediaUrl(src)

  useEffect(() => {
    if (!resolvedSrc) {
      setStatus('error')
      return
    }
    // Nếu ảnh đã hoàn thành tải trước đó hoặc từ cache trình duyệt
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setStatus('loaded')
    } else {
      setStatus('loading')
    }
  }, [resolvedSrc, retryCount])

  const handleRetry = (e) => {
    e.stopPropagation()
    setStatus('loading')
    setRetryCount((c) => c + 1)
  }

  const containerStyle = {
    maxWidth,
    maxHeight,
    ...(status !== 'loaded' ? { aspectRatio, width: '100%' } : { width: 'fit-content' }),
  }

  return (
    <div
      className={`question-img-container ${status} ${className}`}
      style={containerStyle}
    >
      {/* ẢNH THẬT */}
      {resolvedSrc && status !== 'error' && (
        <img
          ref={imgRef}
          key={`${resolvedSrc}-${retryCount}`}
          src={resolvedSrc}
          alt={alt}
          decoding="async"
          style={{
            maxWidth: '100%',
            maxHeight,
          }}
          className={`question-img-element ${status === 'loaded' ? 'visible' : 'hidden'}`}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}

      {/* TRẠNG THÁI ĐANG TẢI (SKELETON SHIMMER) */}
      {status === 'loading' && (
        <div className="question-img-skeleton">
          <div className="question-img-skeleton-pulse" />
          <span className="question-img-skeleton-text">Đang tải hình ảnh...</span>
        </div>
      )}

      {/* TRẠNG THÁI LỖI: PLACEHOLDER ĐÚNG KÍCH CỠ ẢNH THẬT */}
      {status === 'error' && (
        <div className="question-img-error-placeholder">
          <div className="question-img-error-icon-box">
            <ImageOff size={36} strokeWidth={1.75} />
          </div>
          <div className="question-img-error-info">
            <h4 className="question-img-error-title">{alt || 'Hình ảnh minh hoạ câu hỏi'}</h4>
            <p className="question-img-error-desc">
              Không thể tải ảnh minh hoạ (Máy chủ lưu trữ đang gặp sự cố hoặc ảnh chưa tải lên)
            </p>
          </div>
          <button
            type="button"
            className="question-img-retry-btn"
            onClick={handleRetry}
            title="Thử tải lại ảnh"
          >
            <RotateCcw size={12} />
            <span>Thử tải lại</span>
          </button>
        </div>
      )}
    </div>
  )
}
