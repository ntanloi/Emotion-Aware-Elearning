import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Audio — Tiptap chưa có extension audio chính thức (chỉ có Image), nên viết node tuỳ chỉnh
 * theo đúng khuôn mẫu của @tiptap/extension-image: một node block render ra thẻ <audio controls>.
 * Lưu trong nội dung dưới dạng HTML nên phía RichTextViewer không cần thay đổi gì (trình duyệt
 * tự render thẻ <audio> gốc).
 */
const Audio = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'audio',
        getAttrs: (el) => ({ src: el.getAttribute('src') }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'audio',
      mergeAttributes(HTMLAttributes, { controls: 'controls', style: 'width: 100%;' }),
    ]
  },

  addCommands() {
    return {
      setAudio:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options })
        },
    }
  },
})

export default Audio