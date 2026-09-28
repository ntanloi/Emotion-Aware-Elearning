import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadMedia } from '@shared/api/media.js'

const ACCEPT_BY_TYPE = {
  IMAGE: { 'image/*': [] },
  AUDIO: { 'audio/*': [] },
  VIDEO: { 'video/*': [] },
}

const ICON_BY_TYPE = { IMAGE: '🖼️', AUDIO: '🎧', VIDEO: '🎬' }

/**
 * MediaUploader — Giai đoạn 5, component #2.
 * Wrap react-dropzone, preview ảnh/audio/video, trả về mediaId.
 *
 * Mặc định (deferUpload=false, giữ nguyên hành vi cũ): onDrop gọi POST /api/media NGAY LẬP TỨC
 * và trả về asset đã upload xong. Một số form (VideoLectureEditor...) cố tình dựa vào việc
 * "onChange chỉ bắn ra SAU KHI đã upload xong" để lưu ngay không cần nút Lưu riêng — KHÔNG đổi
 * hành vi này để tránh vỡ các form đó.
 *
 * deferUpload=true: onDrop CHỈ preview file cục bộ bằng URL.createObjectURL (không gọi Cloudinary),
 * value trả về dạng { file, previewUrl, fileName }. Nơi dùng component (form cha) phải tự upload
 * thật sự (gọi uploadMedia) vào đúng lúc submit — dùng cho các modal "Tạo mới" mà người dùng có
 * thể bấm Huỷ, để tránh sinh rác trên Cloudinary khi họ không submit.
 *
 * Props:
 *  - type: 'IMAGE' | 'AUDIO' | 'VIDEO'
 *  - value: MediaAssetDto | { file, previewUrl, fileName } | null
 *  - onChange(next | null)
 *  - label: text hiển thị trong dropzone
 *  - disabled: khoá dropzone (VD: đang lưu form)
 *  - deferUpload: true = chỉ preview local, không upload lên Cloudinary tại đây
 */
export default function MediaUploader({ type, value, onChange, label, disabled, deferUpload = false }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  // Theo dõi blob URL đã tạo (chế độ deferUpload) để revoke khi không còn dùng, tránh leak memory.
  const createdUrlsRef = useRef(new Set())
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      createdUrlsRef.current.clear()
    }
  }, [])

  const onDrop = useCallback(
    async (accepted) => {
      const file = accepted[0]
      if (!file) return
      setError(null)

      if (deferUpload) {
        const previewUrl = URL.createObjectURL(file)
        createdUrlsRef.current.add(previewUrl)
        onChange?.({ file, previewUrl, fileName: file.name })
        return
      }

      setUploading(true)
      setProgress(0)
      try {
        const asset = await uploadMedia(file, type, setProgress)
        onChange?.(asset)
      } catch (err) {
        setError(err.response?.data?.error || 'Tải lên thất bại')
      } finally {
        setUploading(false)
      }
    },
    [type, onChange, deferUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_BY_TYPE[type],
    multiple: false,
    disabled: disabled || uploading,
  })

  const handleRemove = () => {
    if (value?.previewUrl) {
      URL.revokeObjectURL(value.previewUrl)
      createdUrlsRef.current.delete(value.previewUrl)
    }
    onChange?.(null)
  }

  if (value) {
    const previewSrc = value.url || value.previewUrl
    return (
      <div>
        <div className="media-preview">
          {type === 'IMAGE' && <img src={previewSrc} alt={value.fileName} />}
          {type === 'AUDIO' && <audio src={previewSrc} controls style={{ flex: 1 }} />}
          {type === 'VIDEO' && (
            <video src={previewSrc} controls style={{ width: 160, borderRadius: 8 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {value.fileName}
            </div>
            <button type="button" className="btn ghost sm mt-8" onClick={handleRemove} disabled={disabled}>
              Xoá / chọn file khác
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <div className="icon">{ICON_BY_TYPE[type]}</div>
        <p style={{ margin: 0 }}>
          {uploading
            ? `Đang tải lên... ${progress}%`
            : label || `Kéo-thả hoặc bấm để chọn ${type === 'IMAGE' ? 'ảnh' : type === 'AUDIO' ? 'audio' : 'video'}`}
        </p>
        {uploading && (
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      {error && <p style={{ color: 'var(--bad)', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  )
}