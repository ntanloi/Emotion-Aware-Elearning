import { useState, useEffect } from 'react'
import StarRating from '@shared/components/StarRating.jsx'
import * as reviewsApi from '@student/api/reviews.js'
import { useSubmitCourseReview } from '@student/hooks/useCourseReviews.js'
import { X, Camera, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react'

export default function ReviewForm({
  isOpen,
  onClose,
  mineReview,
  courseId,
}) {
  const { create, update, remove } = useSubmitCourseReview(courseId)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [allowFeature, setAllowFeature] = useState(false)
  const [uploadedImages, setUploadedImages] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (mineReview) {
      setRating(mineReview.rating || 0)
      setComment(mineReview.comment || '')
      setAllowFeature(Boolean(mineReview.allowFeature))
      setUploadedImages(
        mineReview.images?.map((img) => ({
          mediaAssetId: img.mediaAssetId,
          url: img.url,
        })) || []
      )
    } else {
      setRating(0)
      setComment('')
      setAllowFeature(false)
      setUploadedImages([])
    }
    setError(null)
  }, [mineReview, isOpen])

  if (!isOpen) return null

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (uploadedImages.length + files.length > 3) {
      setError('Bạn chỉ được đính kèm tối đa 3 ảnh trong mỗi đánh giá.')
      return
    }

    setUploadingImage(true)
    setError(null)
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5 MB.`)
        }
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          throw new Error(`Ảnh "${file.name}" không đúng định dạng JPG, PNG hoặc WEBP.`)
        }

        const res = await reviewsApi.uploadReviewImage(file)
        setUploadedImages((prev) => [...prev, { mediaAssetId: res.mediaAssetId, url: res.url }])
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Lỗi khi tải ảnh lên.')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const handleRemoveImage = (indexToRemove) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!rating) {
      setError('Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao)')
      return
    }

    try {
      const payload = {
        rating,
        comment: comment.trim() || null,
        allowFeature,
        imageMediaIds: uploadedImages.map((img) => img.mediaAssetId),
      }

      if (mineReview) {
        await update.mutateAsync(payload)
      } else {
        await create.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Có lỗi xảy ra, vui lòng thử lại.')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá của mình không?')) return
    try {
      await remove.mutateAsync()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể xóa đánh giá.')
    }
  }

  const isSaving = create.isPending || update.isPending || uploadingImage

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
          borderRadius: 14,
          background: 'var(--surface)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between mb-16">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {mineReview ? 'Chỉnh sửa đánh giá' : 'Viết đánh giá khóa học'}
          </h3>
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={isSaving} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            className="card mb-14"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--bad)',
              padding: '8px 12px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Chọn số sao */}
          <div className="field mb-14">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Số sao đánh giá <span style={{ color: 'var(--bad)' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StarRating value={rating} onChange={setRating} readOnly={false} size={26} />
              <span className="text-xs font-semibold" style={{ color: 'var(--warn)' }}>
                {rating > 0 ? `${rating} sao - ${['Kém', 'Tạm ổn', 'Khá tốt', 'Rất tốt', 'Tuyệt vời'][rating - 1]}` : 'Chưa chọn'}
              </span>
            </div>
          </div>

          {/* Nhận xét */}
          <div className="field mb-14">
            <div className="flex-between" style={{ marginBottom: 4 }}>
              <label style={{ fontWeight: 600, fontSize: 14 }}>Nhận xét</label>
              <span className="text-dim text-xs">{comment.length} / 2000</span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm học tập, bài tập, giảng viên..."
              maxLength={2000}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Đính kèm ảnh */}
          <div className="field mb-14">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Hình ảnh minh họa <span className="text-dim text-xs font-normal">(tối đa 3 ảnh, ≤ 5 MB/ảnh)</span>
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {uploadedImages.map((img, idx) => (
                <div
                  key={img.mediaAssetId || idx}
                  style={{
                    position: 'relative',
                    width: 68,
                    height: 68,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                  }}
                >
                  <img src={img.url} alt="Xem trước" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    aria-label="Xóa ảnh này"
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)',
                      color: 'var(--surface)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}

              {uploadedImages.length < 3 && (
                <label
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 8,
                    border: '1.5px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: uploadingImage ? 'wait' : 'pointer',
                    color: 'var(--text-dim)',
                    backgroundColor: 'rgba(248, 250, 252, 0.8)',
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadingImage}
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <Camera size={18} />
                  <span style={{ fontSize: 12, marginTop: 3 }}>Thêm ảnh</span>
                </label>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                fontSize: 12,
                color: 'var(--warn)',
              }}
            >
              <ShieldCheck size={14} style={{ flexShrink: 0 }} />
              <span>Vui lòng không tải ảnh chứa CCCD, SBD hoặc thông tin bảo mật cá nhân.</span>
            </div>
          </div>

          {/* Cho phép giảng viên giới thiệu */}
          <div
            className="field mb-18"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(241, 245, 249, 0.7)',
            }}
          >
            <input
              type="checkbox"
              id="allowFeatureCheck"
              checked={allowFeature}
              onChange={(e) => setAllowFeature(e.target.checked)}
              style={{ marginTop: 2, cursor: 'pointer' }}
            />
            <label htmlFor="allowFeatureCheck" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}>
              Đồng ý cho giảng viên dùng đánh giá này để giới thiệu khóa học.
            </label>
          </div>

          {/* Hành động */}
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              {mineReview && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={handleDelete}
                  disabled={isSaving || remove.isPending}
                  style={{ color: 'var(--bad)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  <Trash2 size={13} />
                  Xóa
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn secondary sm" onClick={onClose} disabled={isSaving}>
                Hủy
              </button>
              <button type="submit" className="btn primary sm" disabled={isSaving || !rating}>
                {isSaving ? 'Đang lưu...' : mineReview ? 'Cập nhật' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
