import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import MediaUploader from '@shared/components/ui/MediaUploader.jsx'
import RichTextEditor from '@shared/components/ui/RichTextEditor.jsx'
import { COURSE_TEMPLATES } from '@shared/components/ui/editorTemplates.js'
import { useCourse } from '@shared/hooks/useCourses.js'
import { useCreateCourse, useUpdateCourse } from '@teacher/hooks/useTeacherCourses.js'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtimeEvent } from '@shared/realtime/index.js'
import CourseRejectDetailModal from '@teacher/components/modals/CourseRejectDetailModal.jsx'
import { useAuthStore } from '@auth/store/authStore.js'
import {
  ArrowLeft,
  Save,
  FileText,
  Sparkles,
  GraduationCap,
  Clock,
  DollarSign,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
} from 'lucide-react'

const LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'Advanced']

const PROFILES = [
  { value: 'TOPIC', label: 'Khóa học chuyên đề / Linh hoạt (Soạn tùy ý các phần)' },
  { value: 'FULL', label: 'Khóa học TOEIC toàn diện (Yêu cầu đủ 7 Part + Từ vựng + Ngữ pháp)' },
  { value: 'LISTENING', label: 'Khóa chuyên Listening (Part 1 - Part 4)' },
  { value: 'READING', label: 'Khóa chuyên Reading (Part 5 - Part 7)' },
]

const emptyForm = {
  title: '',
  description: '',
  level: 'Beginner',
  profile: 'TOPIC',
  durationHours: '',
  price: '',
  originalPrice: '',
  accessMonths: 6,
  cover: null,
}

export default function TeacherCourseEditorPage() {
  const user = useAuthStore((s) => s.user)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const { courseId } = useParams()
  const isEdit = Boolean(courseId)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromParam = searchParams.get('from')
  const backTarget = fromParam === 'dashboard' ? '/dashboard/teacher?tab=courses' : '/teacher/courses'
  const backLabel = fromParam === 'dashboard' ? 'Dashboard (Khóa học của tôi)' : 'Khoá học của tôi'

  const { data: existingCourse, isLoading: loadingCourse } = useCourse(courseId)
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const qc = useQueryClient()

  // Lắng nghe cập nhật trạng thái duyệt/từ chối theo thời gian thực
  useRealtimeEvent('course-status', (payload) => {
    if (payload?.courseId === courseId) {
      qc.invalidateQueries({ queryKey: ['course', courseId] })
      qc.invalidateQueries({ queryKey: ['courses', 'mine'] })
    }
  })

  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)

  const isPendingApproval = !isEdit && user?.status === 'PENDING_APPROVAL'
  const saving = createCourse.isPending || updateCourse.isPending

  useEffect(() => {
    refreshProfile()
  }, [])

  useEffect(() => {
    if (isEdit && existingCourse) {
      setForm({
        title: existingCourse.title || '',
        description: existingCourse.description || '',
        level: existingCourse.level || 'Beginner',
        profile: existingCourse.profile || 'TOPIC',
        durationHours: existingCourse.durationHours ?? '',
        price: existingCourse.price ?? '',
        originalPrice: existingCourse.originalPrice ?? '',
        accessMonths: existingCourse.accessMonths || 6,
        cover: existingCourse.coverUrl
          ? { url: existingCourse.coverUrl, id: existingCourse.coverMediaId }
          : null,
      })
    }
  }, [isEdit, existingCourse])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const buildPayload = () => ({
    title: form.title.trim(),
    description: form.description && form.description.trim() ? form.description.trim() : null,
    level: form.level || null,
    profile: form.profile || 'TOPIC',
    durationHours: form.durationHours === '' ? null : Number(form.durationHours),
    price: form.price === '' ? null : Number(form.price),
    originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
    accessMonths: Math.max(6, Number(form.accessMonths) || 6),
    coverMediaId: form.cover?.id ?? null,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (isPendingApproval) {
      setError('Tài khoản giảng viên của bạn đang chờ quản trị viên phê duyệt. Trong thời gian này bạn chưa thể tạo khóa học.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!form.title.trim()) {
      setError('Vui lòng nhập tên khoá học')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      if (isEdit) {
        await updateCourse.mutateAsync({ id: courseId, payload: buildPayload() })
        setSuccessMsg('Đã lưu thông tin khoá học thành công!')
        setTimeout(() => setSuccessMsg(null), 4000)
      } else {
        const created = await createCourse.mutateAsync(buildPayload())
        // Chuyển thẳng đến trang soạn nội dung khóa học
        navigate(`/teacher/courses/${created.id}/content`)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng kiểm tra lại dữ liệu')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Tính phần trăm giảm giá nếu có
  const discountPercent =
    form.originalPrice && form.price && Number(form.originalPrice) > Number(form.price)
      ? Math.round(((Number(form.originalPrice) - Number(form.price)) / Number(form.originalPrice)) * 100)
      : null

  if (isEdit && loadingCourse) {
    return (
      <div className="course-editor-container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p className="text-dim">Đang tải thông tin khoá học...</p>
      </div>
    )
  }

  return (
    <div className="course-editor-page">
      {/* Header & Breadcrumb */}
      <div className="course-editor-header-bar">
        <div className="course-editor-breadcrumb">
          <Link to={backTarget} className="course-editor-back-link">
            <ArrowLeft size={16} />
            <span>{backLabel}</span>
          </Link>
          <span className="course-editor-breadcrumb-sep">/</span>
          <span className="course-editor-breadcrumb-current">
            {isEdit ? `Sửa: ${form.title || 'Khoá học'}` : 'Tạo khoá học mới'}
          </span>
        </div>

        <div className="course-editor-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => navigate(backTarget)}
            disabled={saving}
          >
            Quay lại
          </button>
          {isEdit && (
            <Link
              to={`/courses/${courseId}`}
              target="_blank"
              className="btn secondary"
              title="Xem trang hiển thị phía học viên"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Eye size={15} />
              <span>Xem trang học viên</span>
            </Link>
          )}
          <button
            type="button"
            className="btn"
            onClick={handleSubmit}
            disabled={saving || isPendingApproval}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={16} />
            <span>{saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo khoá học'}</span>
          </button>
        </div>
      </div>

      <div className="course-editor-title-row">
        <div>
          <h1 className="course-editor-main-title">
            {isEdit ? 'Chỉnh sửa khoá học' : 'Tạo khoá học mới'}
          </h1>
          <p className="course-editor-subtitle">
            Thiết lập tiêu đề, xây dựng lộ trình chi tiết bằng bộ công cụ Rich Text và quản lý thông tin hiển thị.
          </p>
        </div>
      </div>

      {isPendingApproval && (
        <div
          style={{
            marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 8,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Tài khoản giảng viên đang chờ duyệt:</strong> Quản trị viên cần phê duyệt tài khoản của bạn trước khi bạn có thể tạo khóa học mới.
          </div>
        </div>
      )}

      {error && (
        <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="form-success" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          background: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#22c55e',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="course-editor-layout-grid">
        {/* CỘT CHÍNH (BÊN TRÁI): TÊN & MÔ TẢ RICH TEXT EDITOR */}
        <div className="course-editor-main-col">
          {/* Box thông tin cơ bản */}
          <div className="card course-editor-card">
            <div className="field">
              <label style={{ fontSize: 15, fontWeight: 600 }}>Tên khoá học *</label>
              <input
                type="text"
                className="course-editor-title-input"
                value={form.title}
                onChange={set('title')}
                placeholder="VD: TOEIC 650+ Bứt phá điểm số cùng AI"
                autoFocus={!isEdit}
              />
            </div>

            <div className="field course-modal-desc-field" style={{ marginTop: 20 }}>
              <div className="course-editor-field-header">
                <div>
                  <label style={{ fontSize: 15, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <FileText size={17} style={{ color: 'var(--accent)' }} />
                    <span>Mô tả & Lộ trình đào tạo</span>
                  </label>
                  <p className="text-dim text-sm" style={{ margin: '4px 0 0' }}>
                    Sử dụng các thanh công cụ, chèn bảng biểu lộ trình, hình ảnh và các bố cục gợi ý bên dưới.
                  </p>
                </div>
                <span className="course-editor-rich-badge">
                  <Sparkles size={13} />
                  <span>Rich Text Editor</span>
                </span>
              </div>

              <div style={{ marginTop: 12 }}>
                <RichTextEditor
                  templates={COURSE_TEMPLATES}
                  value={form.description}
                  onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                  placeholder="Soạn thảo giới thiệu khóa học, đối tượng tham gia, mục tiêu cam kết và bảng phân chia lộ trình từng tuần..."
                  minHeight={380}
                />
              </div>
            </div>
          </div>

          {/* Card mẹo soạn lộ trình */}
          <div className="card course-editor-card course-editor-tips-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div className="course-editor-tips-icon">
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 14 }}>Gợi ý xây dựng mô tả khoá học hiệu quả</h4>
                <ul className="course-editor-tips-list">
                  <li><strong>Bấm nút &quot;Mẫu khóa học&quot;</strong> trên thanh &quot;Bố cục gợi ý&quot; để tự động chèn cấu trúc chuẩn (Mục tiêu, Đối tượng, Bảng lộ trình, Quyền lợi).</li>
                  <li><strong>Dùng Bảng (Table):</strong> Giúp học viên hình dung rõ ràng lộ trình học theo từng tuần, từng kỹ năng và thời lượng dự kiến.</li>
                  <li><strong>Hình ảnh minh họa:</strong> Tải lên giáo trình tham khảo, sơ đồ tư duy hoặc bảng điểm mục tiêu để tăng tính thu hút.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHỤ (BÊN PHẢI): BÌA KHÓA HỌC, PHÂN LOẠI, HỌC PHÍ & LƯU */}
        <div className="course-editor-side-col">
          {/* Card Ảnh bìa */}
          <div className="card course-editor-card">
            <h3 className="course-editor-section-heading">
              <ImageIcon size={16} style={{ color: 'var(--accent)' }} />
              Ảnh bìa khoá học
            </h3>
            <p className="text-dim text-xs" style={{ marginBottom: 12 }}>
              Kích thước đề xuất 1280x720 (tỉ lệ 16:9), dung lượng dưới 5MB.
            </p>
            <MediaUploader
              type="IMAGE"
              value={form.cover}
              onChange={(asset) => setForm((f) => ({ ...f, cover: asset }))}
            />
          </div>

          {/* Card Phân loại & Thời lượng */}
          <div className="card course-editor-card">
            <h3 className="course-editor-section-heading">
              <GraduationCap size={16} style={{ color: 'var(--accent)' }} />
              Cấu hình trình độ & định dạng
            </h3>

            <div className="field">
              <label>Mức độ / Trình độ</label>
              <select value={form.level} onChange={set('level')}>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label>Định dạng khóa học</label>
              <select value={form.profile || 'TOPIC'} onChange={set('profile')}>
                {PROFILES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <span className="hint" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
                Chọn "Khóa học chuyên đề / Linh hoạt" để soạn các phần tùy ý mà không bị ép buộc phải mở đủ tất cả các Part.
              </span>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} style={{ color: 'var(--accent)' }} />
                <span>Thời lượng đào tạo (giờ)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.durationHours}
                onChange={set('durationHours')}
                placeholder="VD: 36"
              />
            </div>
          </div>

          {/* Card Học phí & Ưu đãi */}
          <div className="card course-editor-card">
            <h3 className="course-editor-section-heading">
              <DollarSign size={16} style={{ color: 'var(--accent)' }} />
              Học phí & Ưu đãi
            </h3>

            <div className="field">
              <label>Giá bán (VNĐ)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={set('price')}
                placeholder="Để trống = Miễn phí"
              />
              <span className="hint">Học viên thanh toán số tiền này khi ghi danh.</span>
            </div>

            <div className="field">
              <label>Giá gốc / Niêm yết (VNĐ)</label>
              <input
                type="number"
                min="0"
                value={form.originalPrice}
                onChange={set('originalPrice')}
                placeholder="VD: 1500000"
              />
              {discountPercent != null && (
                <div className="course-editor-discount-preview">
                  <span>Tiết kiệm: </span>
                  <strong>{discountPercent}%</strong>
                </div>
              )}
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} style={{ color: 'var(--accent)' }} />
                <span>Thời hạn khóa học (tháng)</span>
              </label>
              <input
                type="number"
                min="6"
                value={form.accessMonths ?? 6}
                onChange={set('accessMonths')}
                placeholder="Mặc định: 6"
              />
              <span className="hint" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, display: 'block', lineHeight: 1.4 }}>
                Thời hạn tính từ ngày học viên bắt đầu học. Hết hạn học viên phải mua lại, phần 10% giữ hộ chưa đạt sẽ chuyển cho giảng viên. Thay đổi thời hạn chỉ áp dụng cho các lượt mua mới.
              </span>
            </div>
          </div>

          {/* Card Trạng thái & Thao tác */}
          <div className="card course-editor-card course-editor-submit-card">
            <div style={{ marginBottom: 16 }}>
              <div className="text-dim text-xs" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Trạng thái lưu trữ
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {isEdit ? (
                  existingCourse?.status === 'PUBLISHED' ? 'Đã xuất bản' :
                  existingCourse?.status === 'PENDING_REVIEW' ? 'Chờ Admin duyệt' :
                  existingCourse?.status === 'REJECTED' ? 'Bị từ chối' :
                  existingCourse?.status === 'HIDDEN' ? 'Đang ẩn' :
                  'Bản nháp'
                ) : 'Đang tạo mới'}
              </div>
              {isEdit && existingCourse?.status === 'REJECTED' && existingCourse?.rejectReason && (
                <div style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8
                }}>
                  <div style={{ color: '#991b1b', fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>
                    Có phản hồi từ Quản trị viên
                  </div>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      borderRadius: 6,
                      color: '#b91c1c',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Xem chi tiết lý do từ chối
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn full-width"
              disabled={saving || isPendingApproval}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}
            >
              <Save size={16} />
              <span>{saving ? 'Đang xử lý...' : isEdit ? 'Lưu thay đổi' : 'Tạo khoá học'}</span>
            </button>

            <button
              type="button"
              className="btn secondary full-width mt-8"
              onClick={() => navigate(backTarget)}
              disabled={saving}
            >
              Huỷ bỏ
            </button>
          </div>
        </div>
      </form>

      <CourseRejectDetailModal
        isOpen={rejectModalOpen}
        course={existingCourse}
        onClose={() => setRejectModalOpen(false)}
      />
    </div>
  )
}
