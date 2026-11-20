import { useState } from 'react'
import MediaUploader from '@shared/components/ui/MediaUploader.jsx'
import RichTextEditor from '@shared/components/ui/RichTextEditor.jsx'
import { VIDEO_THEORY_TEMPLATES, findEmptySections } from '@shared/components/ui/editorTemplates.js'
import { useUpdateContentItem } from '@teacher/hooks/useTeacherContentItems.js'
import { linkMedia } from '@shared/api/media.js'
import { useToast } from '@shared/context/AppUIContext.jsx'
import { UploadCloud, Link as LinkIcon, Film, Check, ExternalLink, AlertCircle, Sparkles, Clock } from 'lucide-react'

import { formatVnTime } from '@shared/utils/dateTime.js'
/**
 * VideoLectureEditor — hỗ trợ 2 tuỳ chọn: Tải file lên (kéo thả) hoặc Gắn link video (URL).
 * Kèm trình soạn thảo lý thuyết (RichTextEditor) đã tối ưu thanh công cụ & màu sắc.
 */
export default function VideoLectureEditor({ item }) {
  const toast = useToast()
  const updateItem = useUpdateContentItem(item.courseId, item.sectionCode)
  const [video, setVideo] = useState(item.videoUrl ? { url: item.videoUrl, fileName: 'Video hiện tại' } : null)
  const [sourceMode, setSourceMode] = useState('UPLOAD') // 'UPLOAD' | 'LINK'
  const [linkUrl, setLinkUrl] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [error, setError] = useState(null)

  const [html, setHtml] = useState(item.bodyHtml || '')
  const [dirty, setDirty] = useState(false)
  const [theoryError, setTheoryError] = useState(null)
  const [emptyWarning, setEmptyWarning] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  // Cài đặt học thử miễn phí (Video Preview)
  const [isPreview, setIsPreview] = useState(Boolean(item.isPreview))
  const [previewMode, setPreviewMode] = useState(
    item.previewDurationSeconds && item.previewDurationSeconds > 0 ? 'CUSTOM' : 'FULL'
  )
  const [customMinutes, setCustomMinutes] = useState(
    item.previewDurationSeconds && item.previewDurationSeconds > 0
      ? Math.max(0, Math.floor(item.previewDurationSeconds / 60))
      : 3
  )
  const [customSeconds, setCustomSeconds] = useState(
    item.previewDurationSeconds && item.previewDurationSeconds > 0
      ? item.previewDurationSeconds % 60
      : 0
  )
  const [previewSaving, setPreviewSaving] = useState(false)
  const [previewSavedSuccess, setPreviewSavedSuccess] = useState(false)

  const handleSavePreviewSettings = async (overridePreview = null) => {
    setPreviewSaving(true)
    setPreviewSavedSuccess(false)
    const activePreview = overridePreview !== null ? overridePreview : isPreview
    const totalSec =
      previewMode === 'CUSTOM'
        ? Number(customMinutes || 0) * 60 + Number(customSeconds || 0)
        : null

    try {
      await updateItem.mutateAsync({
        id: item.id,
        payload: {
          isPreview: activePreview,
          previewDurationSeconds:
            activePreview && totalSec && totalSec > 0 ? totalSec : null,
        },
      })
      setPreviewSavedSuccess(true)
      setTimeout(() => setPreviewSavedSuccess(false), 3000)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Không thể lưu cài đặt học thử')
    } finally {
      setPreviewSaving(false)
    }
  }

  const handleChange = async (asset) => {
    setVideo(asset)
    if (!asset) return
    setError(null)
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { videoMediaId: asset.id } })
    } catch (err) {
      setError(err.response?.data?.error || 'Không lưu được video, vui lòng thử lại')
      setVideo(item.videoUrl ? { url: item.videoUrl, fileName: 'Video hiện tại' } : null)
    }
  }

  const formatVideoUrl = (raw) => {
    let url = raw.trim()
    // Nếu là Google Drive file view link -> chuyển thành preview nhúng để phát được
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`
    }
    return url
  }

  const handleSaveLink = async (e) => {
    e.preventDefault()
    if (!linkUrl.trim()) return
    setError(null)
    setLinkSaving(true)
    try {
      const formattedUrl = formatVideoUrl(linkUrl)
      const asset = await linkMedia(formattedUrl, 'VIDEO', 'Video liên kết ngoài')
      await updateItem.mutateAsync({ id: item.id, payload: { videoMediaId: asset.id } })
      setVideo({ url: asset.url, fileName: asset.fileName })
      setLinkUrl('')
    } catch (err) {
      console.error('Lỗi lưu link video:', err)
      const msg = err.response?.data?.message || err.response?.data?.error || err.message
      setError(`Lỗi: ${msg || 'Không thể lưu đường dẫn video. Vui lòng đảm bảo Backend đã được restart.'}`)
    } finally {
      setLinkSaving(false)
    }
  }

  const handleTheoryChange = (value) => {
    setHtml(value)
    setDirty(true)
  }

  const handleTheorySave = async () => {
    setTheoryError(null)
    const emptySecs = findEmptySections(html)
    if (emptySecs.length > 0) {
      setEmptyWarning(`Còn ${emptySecs.length} mục chưa điền nội dung: ${emptySecs.join(', ')}`)
    } else {
      setEmptyWarning(null)
    }
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { bodyHtml: html } })
      setDirty(false)
      setSavedAt(new Date())
    } catch (err) {
      setTheoryError(err.response?.data?.error || 'Không lưu được nội dung lý thuyết, vui lòng thử lại')
    }
  }

  return (
    <div className="video-lecture-editor-wrapper">
      <div className="video-source-box">
        <div className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Film size={17} className="text-accent" />
              <span>Video bài giảng</span>
            </h4>
            <p className="text-dim text-xs" style={{ margin: '3px 0 0' }}>
              Chọn tải lên tệp video hoặc gắn đường dẫn trực tiếp (YouTube, Cloudinary, MP4 link...).
            </p>
          </div>

          {/* 2 tabs lựa chọn nguồn video */}
          <div className="video-source-tabs">
            <button
              type="button"
              className={`video-source-tab-btn ${sourceMode === 'UPLOAD' ? 'active' : ''}`}
              onClick={() => setSourceMode('UPLOAD')}
            >
              <UploadCloud size={13} />
              <span>Tải tệp lên</span>
            </button>
            <button
              type="button"
              className={`video-source-tab-btn ${sourceMode === 'LINK' ? 'active' : ''}`}
              onClick={() => setSourceMode('LINK')}
            >
              <LinkIcon size={13} />
              <span>Gắn link</span>
            </button>
          </div>
        </div>

        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Chế độ 1: Tải lên kéo thả */}
        {sourceMode === 'UPLOAD' && (
          <MediaUploader
            type="VIDEO"
            value={video}
            onChange={handleChange}
            label="Kéo-thả hoặc bấm để chọn tệp video bài giảng"
          />
        )}

        {/* Chế độ 2: Gắn đường dẫn URL */}
        {sourceMode === 'LINK' && (
          <div className="video-link-input-card">
            {video ? (
              <div className="media-preview" style={{ marginBottom: 14 }}>
                {video.url.includes('drive.google.com') || video.url.includes('youtube.com') || video.url.includes('youtu.be') ? (
                  <iframe
                    src={video.url}
                    style={{ width: 220, height: 130, borderRadius: 8, border: 'none', background: '#000' }}
                    allow="autoplay; encrypted-media; fullscreen"
                    title="Video preview"
                  />
                ) : (
                  <video src={video.url} controls style={{ width: 160, borderRadius: 8, background: '#000' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm font-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {video.fileName || 'Video bài giảng'}
                  </div>
                  <div className="text-xs text-dim mt-4" style={{ wordBreak: 'break-all' }}>
                    {video.url}
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm mt-8"
                    onClick={() => setVideo(null)}
                  >
                    Thay đổi đường dẫn
                  </button>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSaveLink} className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="url"
                  className="input"
                  placeholder="Dán đường dẫn video (VD: https://.../video.mp4 hoặc link trực tiếp)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34 }}
                  required
                />
                <ExternalLink
                  size={14}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
                />
              </div>
              <button
                type="submit"
                className="btn"
                disabled={linkSaving || !linkUrl.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                {linkSaving ? 'Đang lưu...' : 'Lưu link'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Cài đặt Học thử miễn phí (Video Preview) */}
      <div
        style={{
          background: isPreview ? 'rgba(37, 99, 235, 0.03)' : 'var(--surface)',
          border: isPreview ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 14,
          padding: '16px 20px',
          marginTop: 20,
          transition: 'all 0.2s ease',
          boxShadow: isPreview ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} style={{ color: isPreview ? 'var(--accent)' : 'var(--text-dim)' }} />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Cài đặt Bài giảng học thử miễn phí (Video Preview)
              </h4>
              {isPreview && (
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  ĐANG GHIM HỌC THỬ
                </span>
              )}
            </div>
            <p className="text-dim text-xs" style={{ margin: '4px 0 0' }}>
              Ghim video này lên trang Giới thiệu khóa học để học viên chưa mua có thể xem thử trải nghiệm chất lượng bài giảng.
            </p>
          </div>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              userSelect: 'none',
              background: isPreview ? 'rgba(37, 99, 235, 0.1)' : 'var(--surface-2)',
              padding: '6px 14px',
              borderRadius: 20,
              border: isPreview ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border)',
              color: isPreview ? 'var(--accent)' : 'var(--text-dim)',
            }}
          >
            <input
              type="checkbox"
              checked={isPreview}
              onChange={(e) => {
                const nextVal = e.target.checked
                setIsPreview(nextVal)
                handleSavePreviewSettings(nextVal)
              }}
              style={{ cursor: 'pointer' }}
            />
            <span>{isPreview ? 'Đang mở học thử' : 'Bật học thử cho video này'}</span>
          </label>
        </div>

        {/* Các tuỳ chọn chi tiết khi bật học thử */}
        {isPreview && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Phạm vi bài giảng cho phép học viên xem thử:
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: previewMode === 'FULL' ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: previewMode === 'FULL' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: previewMode === 'FULL' ? 'var(--accent)' : 'var(--text)',
                  fontWeight: previewMode === 'FULL' ? 600 : 500,
                }}
              >
                <input
                  type="radio"
                  name="previewDurationType"
                  checked={previewMode === 'FULL'}
                  onChange={() => setPreviewMode('FULL')}
                />
                <span>Xem toàn bộ bài giảng (100% thời lượng)</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: previewMode === 'CUSTOM' ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: previewMode === 'CUSTOM' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: previewMode === 'CUSTOM' ? 'var(--accent)' : 'var(--text)',
                  fontWeight: previewMode === 'CUSTOM' ? 600 : 500,
                }}
              >
                <input
                  type="radio"
                  name="previewDurationType"
                  checked={previewMode === 'CUSTOM'}
                  onChange={() => setPreviewMode('CUSTOM')}
                />
                <span>Xem đoạn đầu video (từ lúc bắt đầu đến phút thứ...)</span>
              </label>
            </div>

            {/* Ô nhập thời lượng tùy chỉnh */}
            {previewMode === 'CUSTOM' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    maxWidth: 420,
                  }}
                >
                  <Clock size={16} style={{ color: 'var(--text-dim)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>Cho xem từ 00:00 đến:</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="input sm"
                    style={{ width: 64, margin: 0, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>phút</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="input sm"
                    style={{ width: 64, margin: 0, textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>giây của video</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginLeft: 4 }}>
                  Học viên chỉ được xem nội dung từ lúc bắt đầu (00:00) đến phút này, không thể xem các đoạn sau của bài giảng.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => handleSavePreviewSettings()}
                disabled={previewSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Check size={14} />
                <span>{previewSaving ? 'Đang lưu cài đặt...' : 'Lưu cài đặt học thử'}</span>
              </button>

              {previewSavedSuccess && (
                <span style={{ fontSize: 12.5, color: 'var(--good)', fontWeight: 600 }}>
                  Đã cập nhật cài đặt học thử thành công!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nội dung lý thuyết đính kèm */}
      <div className="mt-24">
        <div style={{ marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 15 }}>Nội dung lý thuyết đi kèm video</h4>
          <p className="text-dim text-xs" style={{ margin: '3px 0 0' }}>
            Học viên sẽ xem phần lý thuyết này song song hoặc bên dưới video bài giảng.
          </p>
        </div>
        {theoryError && <div className="form-error">{theoryError}</div>}
        <RichTextEditor
          templates={VIDEO_THEORY_TEMPLATES}
          value={html}
          onChange={handleTheoryChange}
          placeholder="Soạn nội dung lý thuyết chi tiết..."
          minHeight={260}
        />
        {emptyWarning && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            padding: '8px 12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 8,
            fontSize: 12.5,
            color: 'var(--warn)'
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{emptyWarning}</span>
          </div>
        )}
        <div className="flex-row mt-16" style={{ justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
          {!dirty && savedAt && (
            <span className="text-dim text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} className="text-good" />
              <span>Đã lưu lúc {formatVnTime(savedAt)}</span>
            </span>
          )}
          {dirty && <span className="text-dim text-sm">Có thay đổi chưa lưu</span>}
          <button
            type="button"
            className="btn"
            onClick={handleTheorySave}
            disabled={updateItem.isPending || !dirty}
          >
            {updateItem.isPending ? 'Đang lưu...' : 'Lưu lý thuyết'}
          </button>
        </div>
      </div>
    </div>
  )
}