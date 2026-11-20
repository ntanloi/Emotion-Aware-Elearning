import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as reviewsApi from '@student/api/reviews.js'
import StarRating from '@shared/components/StarRating.jsx'
import ReviewImageLightbox from './ReviewImageLightbox.jsx'
import {
  Sparkles,
  Quote,
  CheckCircle,
  MessageSquare,
  Award,
} from 'lucide-react'

import { formatVnDate } from '@shared/utils/dateTime.js'
/**
 * Khối "Học viên nói gì về khóa học" (Phase 4):
 * - Hiển thị các đánh giá xuất sắc nhất do Giảng viên lựa chọn và ghim lên trang giới thiệu.
 * - Luôn giữ tính trung thực: Ghi rõ nhãn "Do giảng viên chọn" và kèm điểm sao trung bình thật cùng tổng số đánh giá.
 * - Tên học viên được rút gọn ("Nguyễn V.") và nhãn tiến độ học "Đã học X%".
 * - Hình ảnh đính kèm có thể bấm để phóng to qua Lightbox.
 */
export default function CourseFeaturedReviews({ courseId, avgRating = 0, reviewCount = 0 }) {
  const [lightboxData, setLightboxData] = useState(null)

  const { data: featured = [], isLoading } = useQuery({
    queryKey: ['featuredReviews', courseId],
    queryFn: () => reviewsApi.getFeaturedReviews(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  })

  // Nếu đang tải hoặc không có đánh giá nào được ghim thì không hiển thị khối này
  if (isLoading || !featured || featured.length === 0) {
    return null
  }

  return (
    <section
      className="course-featured-reviews-section"
      style={{
        margin: 0,
        padding: '20px 24px',
        borderRadius: 12,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Lightbox xem ảnh */}
      {lightboxData && (
        <ReviewImageLightbox
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}

      {/* Header Khối giới thiệu */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Đánh giá tiêu biểu
          </h3>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            <Sparkles size={11} /> Do giảng viên chọn
          </span>
        </div>

        {/* Điểm trung bình thật & Tổng đánh giá thật (Bảo đảm tính trung thực) */}
        {reviewCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <StarRating value={avgRating} size={14} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {avgRating > 0 ? avgRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-dim text-xs">
              / 5.0 ({reviewCount} đánh giá thật)
            </span>
          </div>
        )}
      </div>

      {/* Grid danh sách đánh giá tiêu biểu */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: 16,
        }}
      >
        {featured.map((item) => {
          const r = item.review
          if (!r) return null

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 18,
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                position: 'relative',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'
              }}
            >
              <div>
                {/* Header card */}
                <div className="flex-between items-start mb-10">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--color-primary)', color: 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {r.studentName ? r.studentName.charAt(0).toUpperCase() : 'H'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 14, color: 'var(--text)' }}>{r.studentName}</strong>
                        {r.progressAtReview != null && r.progressAtReview > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 8,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--good)',
                            }}
                          >
                            Đã học {r.progressAtReview}%
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <StarRating value={r.rating} size={13} />
                        <span className="text-dim text-xs">
                          {formatVnDate(r.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Quote size={20} style={{ color: 'var(--border)', opacity: 0.6 }} />
                </div>

                {/* Nhận xét */}
                {r.comment && (
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--text)',
                      fontStyle: 'italic',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    "{r.comment}"
                  </p>
                )}
              </div>

              <div>
                {/* Lưới hình ảnh thực tế */}
                {r.images && r.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {r.images.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        onClick={() => setLightboxData({ images: r.images, index: idx })}
                        title="Bấm để xem ảnh phóng to"
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 8,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid var(--border)',
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <img
                          src={img.url}
                          alt="Ảnh đính kèm"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Phản hồi từ giảng viên (nếu có) */}
                {r.teacherReply && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: 'rgba(37, 99, 235, 0.05)',
                      borderLeft: '2px solid var(--color-primary)',
                      fontSize: 12,
                      color: 'var(--text-dim)',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong style={{ color: 'var(--color-primary)' }}>Giảng viên: </strong>
                    {r.teacherReply}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
