import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { useEffect, useState } from 'react'
import Audio from './tiptap-audio-extension.js'
import { uploadMedia } from '@shared/api/media.js'

/**
 * Chèn 1 file ảnh/audio (đã kéo-thả hoặc dán) vào editor: upload lên server qua endpoint
 * chung POST /api/media rồi chèn node với URL thật trả về — không nhúng base64 vào nội dung
 * để tránh phình dữ liệu lý thuyết lưu trong DB.
 */
async function insertUploadedFile(view, file, pos, onUploadingChange) {
  const isImage = file.type.startsWith('image/')
  const isAudio = file.type.startsWith('audio/')
  if (!isImage && !isAudio) return false

  onUploadingChange(true)
  try {
    const asset = await uploadMedia(file, isImage ? 'IMAGE' : 'AUDIO')
    const nodeType = isImage ? 'image' : 'audio'
    const node = view.state.schema.nodes[nodeType].create({ src: asset.url })
    const tr = view.state.tr.insert(Math.min(pos, view.state.doc.content.size), node)
    view.dispatch(tr)
    view.focus()
  } catch (err) {
    window.alert('Tải tệp lên thất bại, vui lòng thử lại.')
  } finally {
    onUploadingChange(false)
  }
  return true
}

/**
 * RichTextEditor — Giai đoạn 5, component #8 (wrapper Tiptap).
 * Dùng ở form Ngữ pháp phía giảng viên và Video bài giảng (lý thuyết đi kèm video).
 *
 * Hỗ trợ: in đậm/nghiêng, danh sách, heading, chèn ảnh, chèn audio, kẻ bảng.
 *
 * Dán/kéo-thả nội dung có sẵn ảnh/audio:
 * - Copy nguyên khối nội dung từ 1 trang web khác (chọn text kèm ảnh/audio rồi Ctrl+C) rồi dán vào
 *   đây: trình duyệt dán kèm HTML gốc, nếu thẻ <img>/<audio> trong đó trỏ tới URL công khai thì
 *   TipTap tự nhận diện qua parseHTML của từng extension và hiển thị ngay — không cần làm gì thêm.
 * - Dán ảnh chép trực tiếp (chuột phải "Copy image", ảnh chụp màn hình, hoặc kéo-thả file ảnh/audio
 *   từ máy) không có URL kèm theo: xử lý riêng bên dưới (handlePaste/handleDrop) — tự động upload
 *   file lên server (POST /api/media, dùng lại uploadMedia có sẵn) rồi chèn bằng URL thật trả về,
 *   không cần giảng viên tự nhập URL.
 *
 * Props: value (html string), onChange(html), placeholder
 */
export default function RichTextEditor({ value, onChange, placeholder }) {
  const [uploadingCount, setUploadingCount] = useState(0)
  const onUploadingChange = (isUploading) =>
    setUploadingCount((c) => Math.max(0, c + (isUploading ? 1 : -1)))

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Audio,
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files || [])
        const mediaFiles = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('audio/'))
        if (mediaFiles.length === 0) return false // không có file thô -> để trình duyệt dán HTML mặc định
        event.preventDefault()
        const pos = view.state.selection.to
        mediaFiles.forEach((file) => insertUploadedFile(view, file, pos, onUploadingChange))
        return true
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files || [])
        const mediaFiles = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('audio/'))
        if (mediaFiles.length === 0) return false
        event.preventDefault()
        const coords = { left: event.clientX, top: event.clientY }
        const dropPos = view.posAtCoords(coords)?.pos ?? view.state.selection.to
        mediaFiles.forEach((file) => insertUploadedFile(view, file, dropPos, onUploadingChange))
        return true
      },
    },
  })

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  const inTable = editor.isActive('table')

  return (
    <div className="rich-text-editor">
      <div className="toolbar">
        <button type="button" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
        <button type="button" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
        <button type="button" className={editor.isActive('bulletList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" className={editor.isActive('orderedList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" className={editor.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL ảnh minh hoạ:')
            if (url) editor.chain().focus().setImage({ src: url }).run()
          }}
        >
          🖼️ Ảnh
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL audio (mp3, wav, ...):')
            if (url) editor.chain().focus().setAudio({ src: url }).run()
          }}
        >
          🎵 Audio
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          ▦ Bảng
        </button>
        {inTable && (
          <>
            <span className="toolbar-divider" />
            <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()}>+Cột trái</button>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Cột phải</button>
            <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>-Cột</button>
            <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()}>+Hàng trên</button>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>+Hàng dưới</button>
            <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>-Hàng</button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()}>🗑 Xoá bảng</button>
          </>
        )}
        {uploadingCount > 0 && <span className="toolbar-uploading">⏳ Đang tải lên...</span>}
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  )
}