import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { useEffect, useState, useMemo } from 'react'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table2,
  ImageIcon,
  Music2,
  Undo2,
  Redo2,
  Eraser,
  Trash2,
  Loader2,
  Sparkles,
  Rows,
  Columns,
  Palette,
  Highlighter,
  FileText,
} from 'lucide-react'
import Audio from './tiptap-audio-extension.js'
import { uploadMedia } from '@shared/api/media.js'
import { createHintExtension } from './editorTemplates.js'

/**
 * Chèn 1 file ảnh/audio (đã kéo-thả hoặc dán) vào editor: upload lên server qua endpoint
 * chung POST /api/media rồi chèn node với URL thật trả về — không nhúng base64 vào nội dung.
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
  } catch {
    window.alert('Tải tệp lên thất bại, vui lòng thử lại.')
  } finally {
    onUploadingChange(false)
  }
  return true
}

/** Bảng màu chữ thông dụng */
const TEXT_COLORS = [
  { color: '#111827', label: 'Đen đậm' },
  { color: '#dc2626', label: 'Đỏ nổi bật' },
  { color: '#ea580c', label: 'Cam' },
  { color: '#ca8a04', label: 'Vàng đất' },
  { color: '#16a34a', label: 'Xanh lá' },
  { color: '#2563eb', label: 'Xanh dương' },
  { color: '#7c3aed', label: 'Tím' },
  { color: '#db2777', label: 'Hồng' },
  { color: '#4b5563', label: 'Xám ghi' },
]

/** Bảng màu tô sáng (Highlight) */
const HIGHLIGHT_COLORS = [
  { color: '#fef08a', label: 'Vàng dịu' },
  { color: '#bbf7d0', label: 'Xanh lá nhạt' },
  { color: '#bfdbfe', label: 'Xanh dương nhạt' },
  { color: '#fed7aa', label: 'Cam đào' },
  { color: '#fbcfe8', label: 'Hồng phấn' },
  { color: '#ddd6fe', label: 'Tím nhạt' },
]

/**
 * RichTextEditor — Bộ soạn thảo văn bản phong phú (Tiptap).
 * Hỗ trợ: Undo/Redo, In đậm/nghiêng/gạch ngang/code, Tiêu đề H2/H3/Paragraph,
 * Màu chữ & Màu highlight, Danh sách, Trích dẫn, Bảng biểu, Ảnh, Audio, Mẫu soạn nhanh.
 */
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 180, templates = [] }) {
  const [uploadingCount, setUploadingCount] = useState(0)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const onUploadingChange = (isUploading) =>
    setUploadingCount((c) => Math.max(0, c + (isUploading ? 1 : -1)))

  const hintExt = useMemo(() => createHintExtension(templates, placeholder), [templates, placeholder])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image,
      Audio,
      TableKit.configure({ table: { resizable: true } }),
      hintExt,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files || [])
        const mediaFiles = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('audio/'))
        if (mediaFiles.length === 0) return false
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

  const insertTemplate = (tpl) => {
    const from = editor.state.selection.from
    editor.chain().focus().insertContent(tpl.html).run()
    let target = null
    editor.state.doc.nodesBetween(from, editor.state.doc.content.size, (n, pos) => {
      if (target === null && n.isTextblock && n.content.size === 0) target = pos + 1
    })
    if (target !== null) editor.commands.setTextSelection(target)
  }

  return (
    <div className="rich-text-editor">
      {/* Thanh công cụ hiện đại phân nhóm rõ ràng */}
      <div className="toolbar">
        {/* Nhóm 1: Hoàn tác */}
        <div className="toolbar-btn-group">
          <button
            type="button"
            title="Hoàn tác (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            title="Làm lại (Ctrl+Y)"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={15} />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* Nhóm 2: Tiêu đề */}
        <div className="toolbar-btn-group">
          <button
            type="button"
            title="Tiêu đề lớn (H2)"
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 size={15} />
            <span className="btn-label">H2</span>
          </button>
          <button
            type="button"
            title="Tiêu đề nhỏ (H3)"
            className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 size={15} />
            <span className="btn-label">H3</span>
          </button>
          <button
            type="button"
            title="Đoạn văn thường"
            className={editor.isActive('paragraph') ? 'active' : ''}
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Pilcrow size={15} />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* Nhóm 3: Định dạng chữ */}
        <div className="toolbar-btn-group">
          <button
            type="button"
            title="In đậm (Ctrl+B)"
            className={editor.isActive('bold') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            title="In nghiêng (Ctrl+I)"
            className={editor.isActive('italic') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            title="Gạch ngang chữ"
            className={editor.isActive('strike') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={15} />
          </button>
          <button
            type="button"
            title="Mã / Từ khóa inline"
            className={editor.isActive('code') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code size={15} />
          </button>

          {/* Màu chữ (Text Color) */}
          <div className="toolbar-color-picker-wrap">
            <button
              type="button"
              title="Đổi màu chữ"
              className={`color-trigger-btn ${editor.getAttributes('textStyle').color ? 'active' : ''}`}
              onClick={() => {
                setShowColorPicker((v) => !v)
                setShowHighlightPicker(false)
              }}
            >
              <Palette size={15} />
              <span
                className="color-indicator-bar"
                style={{ backgroundColor: editor.getAttributes('textStyle').color || 'currentColor' }}
              />
            </button>
            {showColorPicker && (
              <div className="toolbar-color-popover">
                <div className="popover-title">Màu chữ</div>
                <div className="color-swatches-grid">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      className="color-swatch-circle"
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                      onClick={() => {
                        editor.chain().focus().setColor(c.color).run()
                        setShowColorPicker(false)
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="popover-clear-btn"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run()
                    setShowColorPicker(false)
                  }}
                >
                  Mặc định
                </button>
              </div>
            )}
          </div>

          {/* Màu nền highlight */}
          <div className="toolbar-color-picker-wrap">
            <button
              type="button"
              title="Tô sáng nền chữ (Highlight)"
              className={`color-trigger-btn ${editor.isActive('highlight') ? 'active' : ''}`}
              onClick={() => {
                setShowHighlightPicker((v) => !v)
                setShowColorPicker(false)
              }}
            >
              <Highlighter size={15} />
              <span
                className="color-indicator-bar"
                style={{ backgroundColor: editor.getAttributes('highlight').color || '#fde047' }}
              />
            </button>
            {showHighlightPicker && (
              <div className="toolbar-color-popover">
                <div className="popover-title">Màu tô sáng</div>
                <div className="color-swatches-grid">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      className="color-swatch-circle"
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                      onClick={() => {
                        editor.chain().focus().toggleHighlight({ color: c.color }).run()
                        setShowHighlightPicker(false)
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="popover-clear-btn"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run()
                    setShowHighlightPicker(false)
                  }}
                >
                  Xoá tô sáng
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            title="Xóa định dạng"
            onClick={() => {
              editor.chain().focus().unsetAllMarks().clearNodes().unsetColor().unsetHighlight().run()
            }}
          >
            <Eraser size={15} />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* Nhóm 4: Danh sách & Khối */}
        <div className="toolbar-btn-group">
          <button
            type="button"
            title="Danh sách gạch đầu dòng"
            className={editor.isActive('bulletList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={15} />
          </button>
          <button
            type="button"
            title="Danh sách số thứ tự"
            className={editor.isActive('orderedList') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            title="Trích dẫn / Khung ghi chú"
            className={editor.isActive('blockquote') ? 'active' : ''}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            title="Đường kẻ ngang phân cách"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus size={15} />
          </button>
        </div>

        <span className="toolbar-divider" />

        {/* Nhóm 5: Chèn Bảng, Ảnh, Audio */}
        <div className="toolbar-btn-group">
          <button
            type="button"
            title="Chèn bảng biểu 3x3"
            className={inTable ? 'active' : ''}
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <Table2 size={15} />
            <span className="btn-label">Bảng</span>
          </button>
          <button
            type="button"
            title="Chèn ảnh minh họa"
            onClick={() => {
              const url = window.prompt('Nhập URL ảnh minh hoạ:')
              if (url) editor.chain().focus().setImage({ src: url }).run()
            }}
          >
            <ImageIcon size={15} />
            <span className="btn-label">Ảnh</span>
          </button>
          <button
            type="button"
            title="Chèn file âm thanh"
            onClick={() => {
              const url = window.prompt('Nhập URL audio (mp3, wav...):')
              if (url) editor.chain().focus().setAudio({ src: url }).run()
            }}
          >
            <Music2 size={15} />
            <span className="btn-label">Audio</span>
          </button>
        </div>

        {uploadingCount > 0 && (
          <span className="toolbar-uploading">
            <Loader2 size={13} className="animate-spin" />
            <span>Đang tải lên...</span>
          </span>
        )}
      </div>

      {/* Thanh bố cục gợi ý chuyên biệt (Templates bar) */}
      {templates && templates.length > 0 && (
        <div className="toolbar templates-toolbar">
          <span className="templates-toolbar-label">
            <Sparkles size={13} className="text-accent" />
            <span>Bố cục gợi ý:</span>
          </span>
          {templates.map((tpl) => {
            let IconComponent = FileText
            if (tpl.icon === 'table') IconComponent = Table2
            else if (tpl.icon === 'quote') IconComponent = Quote
            return (
              <button
                key={tpl.id}
                type="button"
                className="toolbar-template-btn"
                title={tpl.title}
                onClick={() => insertTemplate(tpl)}
              >
                <IconComponent size={12} />
                <span>{tpl.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Thanh công cụ phụ khi đang thao tác trong bảng */}
      {inTable && (
        <div className="toolbar table-toolbar">
          <span className="table-toolbar-hint">
            <Table2 size={13} />
            <strong>Thao tác bảng:</strong>
          </span>
          <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()}>
            <Columns size={13} /> +Cột trái
          </button>
          <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <Columns size={13} /> +Cột phải
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()}>
            -Cột
          </button>
          <span className="toolbar-divider" />
          <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()}>
            <Rows size={13} /> +Hàng trên
          </button>
          <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Rows size={13} /> +Hàng dưới
          </button>
          <button type="button" onClick={() => editor.chain().focus().deleteRow().run()}>
            -Hàng
          </button>
          <span className="toolbar-divider" />
          <button
            type="button"
            className="delete-table-btn"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            <Trash2 size={13} /> Xoá bảng
          </button>
        </div>
      )}

      <div style={{ minHeight }}>
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  )
}