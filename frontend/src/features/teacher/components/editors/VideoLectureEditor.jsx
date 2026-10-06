import { useState } from 'react'
import MediaUploader from '@shared/components/ui/MediaUploader.jsx'
import RichTextEditor from '@shared/components/ui/RichTextEditor.jsx'
import { useUpdateContentItem } from '@teacher/hooks/useTeacherContentItems.js'

/**
 * VideoLectureEditor — tải lên/thay video bài giảng + soạn nội dung lý thuyết đi kèm video
 * (dùng chung field bodyHtml với GRAMMAR_ARTICLE, xem ContentItem.java). Học viên sẽ thấy phần
 * lý thuyết này bên cạnh/bên dưới video (xem VideoLecturePlayer.jsx).
 *
 * Video: lưu ngay khi upload xong (không cần bấm nút Lưu riêng) vì MediaUploader chỉ trả kết quả
 * SAU KHI đã upload thành công lên server.
 * Lý thuyết: lưu thủ công qua nút "Lưu lý thuyết" (không auto-save mỗi phím gõ), giống
 * GrammarArticleEditor.
 *
 * LƯU Ý: ContentItemUpdateRequest coi field null = "giữ nguyên giá trị cũ" (không phải "xoá"),
 * nên khi giáo viên bấm "Xoá / chọn file khác" trên MediaUploader (trả về null), form CHỈ xoá
 * video ở màn hình hiện tại — bản đã lưu vẫn còn cho tới khi giáo viên upload video MỚI để
 * thay thế. Đây là giới hạn tạm thời, sẽ cải thiện khi bổ sung field "clear" riêng ở DTO.
 */
export default function VideoLectureEditor({ item }) {
  const updateItem = useUpdateContentItem(item.courseId, item.sectionCode)
  const [video, setVideo] = useState(item.videoUrl ? { url: item.videoUrl, fileName: 'Video hiện tại' } : null)
  const [error, setError] = useState(null)

  const [html, setHtml] = useState(item.bodyHtml || '')
  const [dirty, setDirty] = useState(false)
  const [theoryError, setTheoryError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  const handleChange = async (asset) => {
    setVideo(asset)
    if (!asset) return // giao vien bam "xoa/chon file khac" - chi go tren man hinh, xem ghi chu tren
    setError(null)
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { videoMediaId: asset.id } })
    } catch (err) {
      setError(err.response?.data?.error || 'Không lưu được video, vui lòng thử lại')
      setVideo(item.videoUrl ? { url: item.videoUrl, fileName: 'Video hiện tại' } : null)
    }
  }

  const handleTheoryChange = (value) => {
    setHtml(value)
    setDirty(true)
  }

  const handleTheorySave = async () => {
    setTheoryError(null)
    try {
      await updateItem.mutateAsync({ id: item.id, payload: { bodyHtml: html } })
      setDirty(false)
      setSavedAt(new Date())
    } catch (err) {
      setTheoryError(err.response?.data?.error || 'Không lưu được nội dung lý thuyết, vui lòng thử lại')
    }
  }

  return (
    <div>
      <p className="text-dim text-sm">Tải lên video lý thuyết cho hoạt động này. Học viên sẽ xem đúng video bên dưới.</p>
      {error && <div className="form-error">{error}</div>}
      <MediaUploader type="VIDEO" value={video} onChange={handleChange} label="Kéo-thả hoặc bấm để chọn video bài giảng" />

      <div className="mt-24">
        <p className="text-dim text-sm">
          Nhập nội dung lý thuyết đi kèm video (tuỳ chọn). Học viên sẽ thấy phần này cùng với video bài giảng.
        </p>
        {theoryError && <div className="form-error">{theoryError}</div>}
        <RichTextEditor value={html} onChange={handleTheoryChange} placeholder="Soạn nội dung lý thuyết..." />
        <div className="flex-row mt-16" style={{ justifyContent: 'flex-end', gap: 12 }}>
          {!dirty && savedAt && <span className="text-dim text-sm">Đã lưu lúc {savedAt.toLocaleTimeString('vi-VN')}</span>}
          {dirty && <span className="text-dim text-sm">Có thay đổi chưa lưu</span>}
          <button type="button" className="btn" onClick={handleTheorySave} disabled={updateItem.isPending || !dirty}>
            {updateItem.isPending ? 'Đang lưu...' : 'Lưu lý thuyết'}
          </button>
        </div>
      </div>
    </div>
  )
}