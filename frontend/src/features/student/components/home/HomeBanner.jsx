import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Smile,
  ShieldCheck,
  Brain,
} from 'lucide-react'
import banner1Img from '@/assets/banners/anh1.png'
import banner3Img from '@/assets/banners/anh3.png'

/**
 * Hàm khởi tạo nội dung cho các slide banner.
 * - Banner 1 và 3: Sử dụng ảnh thiết kế riêng từ thư mục banner (không chữ, không nút).
 * - Banner 2: Giữ nguyên nội dung giới thiệu Công nghệ thích ứng cảm xúc.
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
      type: 'content',
      badge: 'Công nghệ thích ứng cảm xúc',
      badgeIcon: Smile,
      title: 'Học tập tập trung & Thích ứng theo thời gian thực',
      description:
        'Hệ thống theo dõi độ tập trung để đưa ra gợi ý giải lao kịp thời. Camera chỉ hoạt động khi bạn đồng ý và hoàn toàn không lưu trữ ảnh mặt hay video.',
      theme: 'violet',
      primaryAction: {
        label: 'Khám phá khóa học',
        icon: Compass,
        onClick: () => {
          document.getElementById('course-list-section')?.scrollIntoView({ behavior: 'smooth' })
        },
      },
      secondaryAction: {
        label: 'Xem báo cáo học tập',
        to: '/reports',
      },
      graphicIcon: ShieldCheck,
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
          if (item.type === 'image') {
            return (
              <div
                key={item.id}
                className="home-banner-slide slide-image-only"
                onClick={item.onClick}
                role={item.onClick ? 'button' : undefined}
                tabIndex={item.onClick ? 0 : undefined}
                title={item.alt}
              >
                <img
                  src={item.image}
                  alt={item.alt || 'Banner'}
                  className="home-banner-pure-img"
                  draggable={false}
                />
              </div>
            )
          }

          const BadgeIcon = item.badgeIcon
          const GraphicIcon = item.graphicIcon

          return (
            <div key={item.id} className={`home-banner-slide theme-${item.theme}`}>
              {/* Ảnh nền riêng nếu người dùng bỏ comment imageUrl */}
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="home-banner-bg-image"
                />
              )}

              {/* Nội dung bên trái */}
              <div className="home-banner-content">
                {item.badge && (
                  <div className="home-banner-badge">
                    {BadgeIcon && <BadgeIcon size={13} />}
                    <span>{item.badge}</span>
                  </div>
                )}

                <h1 className="home-banner-title">{item.title}</h1>
                <p className="home-banner-desc">{item.description}</p>

                <div className="home-banner-actions">
                  {/* Primary Action */}
                  {item.primaryAction && (
                    item.primaryAction.to ? (
                      <Link to={item.primaryAction.to} className="banner-btn-primary">
                        {item.primaryAction.icon && <item.primaryAction.icon size={15} />}
                        <span>{item.primaryAction.label}</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={item.primaryAction.onClick}
                        className="banner-btn-primary"
                      >
                        {item.primaryAction.icon && <item.primaryAction.icon size={15} />}
                        <span>{item.primaryAction.label}</span>
                      </button>
                    )
                  )}

                  {/* Secondary Action */}
                  {item.secondaryAction && (
                    item.secondaryAction.to ? (
                      <Link to={item.secondaryAction.to} className="banner-btn-secondary">
                        {item.secondaryAction.icon && <item.secondaryAction.icon size={15} />}
                        <span>{item.secondaryAction.label}</span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={item.secondaryAction.onClick}
                        className="banner-btn-secondary"
                      >
                        {item.secondaryAction.icon && <item.secondaryAction.icon size={15} />}
                        <span>{item.secondaryAction.label}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Khung minh hoạ bên phải (tự ẩn trên mobile) */}
              <div className="home-banner-media">
                <div className="banner-graphic-box">
                  {GraphicIcon ? <GraphicIcon size={64} strokeWidth={1.75} /> : <Brain size={64} strokeWidth={1.75} />}
                </div>
              </div>
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
