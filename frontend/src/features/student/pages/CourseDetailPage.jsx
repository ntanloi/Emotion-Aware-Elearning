import { useParams, Link } from 'react-router-dom'
import { useCourse } from '@shared/hooks/useCourses.js'
import StarRating from '@shared/components/StarRating.jsx'
import RichTextViewer from '@shared/components/RichTextViewer.jsx'
import EnrollButton from '@student/components/EnrollButton.jsx'
import CourseReviews from '@student/components/CourseReviews.jsx'
import CourseFeaturedReviews from '@student/components/CourseFeaturedReviews.jsx'
import CoursePreviewLessons from '@student/components/CoursePreviewLessons.jsx'
import { resolveMediaUrl } from '@config/media.js'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import {
  ChevronRight,
  Clock,
  User,
  Sparkles,
  Brain,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Headphones,
  Layers,
  GraduationCap,
  BookOpen,
  Award,
  Star,
} from 'lucide-react'

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const { data: course, isLoading, isError, error } = useCourse(courseId)

  if (isLoading) {
    return (
      <div className="course-detail-container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p className="text-dim">Đang tải thông tin khóa học...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="course-detail-container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Không tìm thấy khóa học</h2>
        <p className="text-dim mt-8">Khóa học này có thể đã bị ẩn hoặc không tồn tại.</p>
        <Link to="/courses" className="btn mt-16" style={{ display: 'inline-flex' }}>
          Quay lại danh sách khóa học
        </Link>
      </div>
    )
  }

  const sections = (course.description || '')
    .split(/---+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="course-detail-container">
      {/* Breadcrumb navigation */}
      <nav className="course-detail-breadcrumb">
        <Link to="/courses">Khóa học</Link>
        <ChevronRight size={14} />
        <span>{course.level || 'TOEIC'}</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{course.title}</span>
      </nav>

      <div className="course-detail-grid">
        {/* CỘT TRÁI: Nội dung chính & Giới thiệu chi tiết */}
        <div className="course-detail-main">
          {/* Header Card */}
          <div className="course-detail-header-card">
            <div className="course-detail-badge-row">
              {course.level && (
                <span className="course-level-tag">
                  <GraduationCap size={13} /> {course.level}
                </span>
              )}
              <span className="course-category-tag">TOEIC Full Skills</span>
              {course.averageRating != null && (
                <span className="course-category-tag" style={{ color: 'var(--warn)' }}>
                  <Star size={13} fill="#f59e0b" color="#f59e0b" style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline' }} />{course.averageRating.toFixed(1)} ({course.reviewCount || 0} đánh giá)
                </span>
              )}
            </div>

            <h1 className="course-detail-title">{course.title}</h1>

            <div className="course-detail-meta-list">
              <span className="course-detail-meta-item">
                <User size={15} style={{ color: 'var(--accent)' }} />
                <span>Giảng viên: <strong>{course.teacherName || 'Chưa cập nhật'}</strong></span>
              </span>

              {course.durationHours ? (
                <span className="course-detail-meta-item">
                  <Clock size={15} style={{ color: 'var(--accent)' }} />
                  <span>Thời lượng: <strong>{course.durationHours} giờ học</strong></span>
                </span>
              ) : null}

              <span className="course-detail-meta-item">
                <Brain size={15} style={{ color: 'var(--secondary)' }} />
                <span>Trợ lý AI: <strong>Nhận diện cảm xúc</strong></span>
              </span>
            </div>
          </div>



          {/* Chi tiết nội dung / Mô tả khóa học */}
          <CoursePreviewLessons courseId={course.id} />

          <div className="course-desc-card">
            <h3 className="course-section-title">
              <BookOpen size={18} style={{ color: 'var(--accent)' }} />
              Mô tả &amp; Lộ trình khóa học
            </h3>

            <div className="course-desc-content">
              {/<[a-z][\s\S]*>/i.test(course.description || '') ? (
                <RichTextViewer html={course.description} />
              ) : sections.length > 0 ? (
                <div className="course-desc-plain-text">
                  {sections.map((partText, idx) => (
                    <p key={idx} className="course-desc-paragraph">{partText}</p>
                  ))}
                </div>
              ) : (
                <p className="text-dim">Chưa có thông tin mô tả chi tiết cho khóa học này.</p>
              )}
            </div>
          </div>

          {/* Thông tin Giảng viên */}
          <div className="course-instructor-card">
            <h3 className="course-section-title">
              <Award size={18} style={{ color: 'var(--accent)' }} />
              Giảng viên phụ trách
            </h3>
            <div className="course-instructor-profile">
              <div className="course-instructor-avatar">
                {course.teacherName ? course.teacherName.charAt(0).toUpperCase() : 'T'}
              </div>
              <div className="course-instructor-info">
                <h4>{course.teacherName || 'Giảng viên chuyên môn'}</h4>
                <p>{course.teacherBio || 'Giảng viên phụ trách chuyên môn tại hệ thống E-Learning AI.'}</p>
              </div>
            </div>
          </div>

          {/* Khối "Học viên nói gì về khóa học" - Đánh giá tiêu biểu do Giảng viên chọn (Phase 4) */}
          <CourseFeaturedReviews
            courseId={course.id}
            avgRating={course.averageRating || course.avgRating || 0}
            reviewCount={course.reviewCount || 0}
          />

          {/* Đánh giá từ học viên */}
          <CourseReviews courseId={course.id} />
        </div>

        {/* CỘT PHẢI: Sticky Card ghi danh / Đăng ký */}
        <div className="course-sidebar-wrapper">
          <div className="course-preview-card">
            {/* Ảnh Cover khóa học (tỷ lệ 16:9 sắc nét, bo góc chuẩn) */}
            <div className="course-preview-media">
              {course.coverUrl ? (
                <img
                  src={resolveMediaUrl(course.coverUrl, { width: 700 })}
                  alt={course.title}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="course-preview-media-placeholder">
                  <BookOpen size={42} strokeWidth={1.8} />
                  <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>TOEIC Mastery</span>
                </div>
              )}
            </div>

            <div className="course-preview-body">
              {/* Giá học phí */}
              <div className="course-preview-price-box">
                <div className="course-preview-price-label">Học phí khóa học</div>
                <div className="course-preview-price-row">
                  {course.price ? (
                    <>
                      <span className="course-preview-price-current">
                        {Number(course.price).toLocaleString('vi-VN')}đ
                      </span>
                      {course.originalPrice && (
                        <span className="course-preview-price-original">
                          {Number(course.originalPrice).toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="course-preview-price-current" style={{ color: 'var(--good)' }}>
                      Miễn phí
                    </span>
                  )}
                </div>
                {course.price && (
                  <span className="course-preview-price-badge">Học phí trọn gói</span>
                )}
                {Number(course.price) > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 8, fontWeight: 500 }}>
                    * Thanh toán thành công sẽ không được hoàn tiền
                  </div>
                )}
              </div>

              {/* Nút hành động Vào học / Đăng ký */}
              <EnrollButton
                course={course}
                courseId={course.id}
                className="course-preview-action-btn"
              />

              {/* Thông tin khóa học */}
              <div className="course-preview-features-list">
                <div className="course-preview-feature-item">
                  <ShieldCheck size={16} className="course-preview-feature-icon" />
                  <span>Quyền truy cập học tập không giới hạn</span>
                </div>
                <div className="course-preview-feature-item">
                  <FileText size={16} className="course-preview-feature-icon" />
                  <span>Theo dõi tiến độ &amp; lịch sử bài làm</span>
                </div>
                <div className="course-preview-feature-item">
                  <Layers size={16} className="course-preview-feature-icon" />
                  <span>Hỗ trợ ôn luyện đa thiết bị (PC / Tablet)</span>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

