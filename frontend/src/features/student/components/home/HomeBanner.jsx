import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@auth/store/authStore.js'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import banner1Img from '@/assets/banners/anh1.png'
import banner2Img from '@/assets/banners/anh2.png'
import banner3Img from '@/assets/banners/anh3.png'

/**
 * Hàm khởi tạo nội dung cho các slide banner.
 * - Cả 3 banner đều dùng ảnh thiết kế riêng từ thư mục banner (không chữ, không nút).
 * - Banner 2 (anh2.png) có tỉ lệ 16:9 nên hiển thị đủ ảnh (fit: 'contain') với nền mờ hai bên.
 */
export function buildBanners(user) {
  return [
    {
      id: 'banner-toeic-smart',
      type: 'image',
      image: banner1Img,
      alt: 'TOEIC Study Smart Reach Your Goal',
      onClick: () => {
        document.getElementById('course-list-section')?.scrollIntoView({ behavior: 'smooth' })
      },
    },
    {
      id: 'adaptive-learning',
      type: 'image',
      image: banner2Img,
      fit: 'contain',
      alt: 'Học tập tập trung và thích ứng theo thời gian thực với AI nhận diện cảm xúc',
      onClick: () => {
        document.getElementById('course-list-section')?.scrollIntoView({ behavior: 'smooth' })
      },
    },
    {
      id: 'banner-toeic-achievement',
      type: 'image',
      image: banner3Img,
      alt: 'Our TOEIC Achievement - Learn Practice Achieve',
      onClick: () => {
        document.getElementById('course-list-section')?.scrollIntoView({ behavior: 'smooth' })
      },
    },
  ]
}

export default function HomeBanner() {
  const user = useAuthStore((s) => s.user)
  const banners = buildBanners(user)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)

  const slideCount = banners.length

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slideCount)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount)
  }

  // Tự động chuyển slide sau mỗi 5 giây, dừng khi rê chuột vào banner
  useEffect(() => {
    if (isPaused || slideCount <= 1) return

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount)
    }, 5000)

    return () => clearInterval(timerRef.current)
  }, [isPaused, slideCount])

  return (
    <div
      className="home-banner-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slider Track */}
      <div
        className="home-banner-slides-track"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((item) => {
          const isContain = item.fit === 'contain'
          return (
            <div
              key={item.id}
              className={`home-banner-slide slide-image-only${isContain ? ' is-contain' : ''}`}
              onClick={item.onClick}
              role={item.onClick ? 'button' : undefined}
              tabIndex={item.onClick ? 0 : undefined}
              title={item.alt}
            >
              {isContain && (
                <img
                  src={item.image}
                  alt=""
                  aria-hidden="true"
                  className="home-banner-blur-bg"
                  draggable={false}
                />
              )}
              <img
                src={item.image}
                alt={item.alt || 'Banner'}
                className="home-banner-pure-img"
                draggable={false}
              />
            </div>
          )
        })}
      </div>

      {/* Mũi tên điều hướng Trước / Sau */}
      {slideCount > 1 && (
        <>
          <button
            type="button"
            className="home-banner-nav-btn prev"
            onClick={handlePrev}
            aria-label="Slide trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="home-banner-nav-btn next"
            onClick={handleNext}
            aria-label="Slide tiếp theo"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Chấm chỉ báo trang (Dots Indicator) */}
      {slideCount > 1 && (
        <div className="home-banner-dots">
          {banners.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              className={`home-banner-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Chuyển tới slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}