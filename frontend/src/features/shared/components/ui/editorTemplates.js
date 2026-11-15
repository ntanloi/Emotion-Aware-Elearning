/**
 * editorTemplates.js
 * Đặt tại: src/features/shared/components/ui/editorTemplates.js
 *
 * Nguyên tắc: MẪU CHỈ LÀ BỐ CỤC.
 *  - Tiêu đề mục và TÊN CỘT của bảng là chữ thật (giảng viên có thể sửa).
 *  - Mọi chỗ cần nội dung đều để TRỐNG. Phần mô tả "nên viết gì" là placeholder hiển thị
 *    bằng CSS (data-placeholder) => KHÔNG nằm trong HTML được lưu, không lên trang học viên,
 *    không bị backend đếm ký tự / quét kiểm duyệt.
 *  - Gợi ý được suy ra từ cấu trúc (tên tiêu đề mục / tên cột) nên reload trang vẫn còn.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/* ------------------------------------------------------------------ */
/* 1. Các mẫu (mỗi mẫu = 1 nút trên thanh "Mẫu soạn sẵn")              */
/* ------------------------------------------------------------------ */

const EMPTY_P = '<p></p>'
const EMPTY_LIST = '<ul><li><p></p></li></ul>'
const emptyRows = (cols, rows) =>
  Array.from({ length: rows }, () => `<tr>${'<td><p></p></td>'.repeat(cols)}</tr>`).join('')
const table = (headers, rows = 2) =>
  `<table><tbody><tr>${headers.map((h) => `<th><p>${h}</p></th>`).join('')}</tr>` +
  `${emptyRows(headers.length, rows)}</tbody></table>`

/** ---- Dùng cho: mô tả khoá học (CourseModal + TeacherCourseEditorPage) ---- */
export const COURSE_TEMPLATES = [
  {
    id: 'course-full',
    label: 'Mẫu khóa học',
    icon: 'file',
    title: 'Chèn bố cục mô tả khóa học (Mục tiêu, Đối tượng, Lộ trình, Quyền lợi)',
    html:
      `<h2>Mục tiêu khóa học</h2>${EMPTY_LIST}` +
      `<h2>Đối tượng học viên phù hợp</h2>${EMPTY_LIST}` +
      `<h2>Lộ trình học</h2>${table(['Giai đoạn', 'Nội dung trọng tâm', 'Kết quả đầu ra'], 3)}` +
      `<h2>Quyền lợi và hỗ trợ</h2>${EMPTY_LIST}`,
    hints: {
      'Mục tiêu khóa học':
        'Mỗi gạch đầu dòng 1 mục tiêu (3–5 ý): sau khóa học học viên làm được gì? Nên đo lường được (kỹ năng, dạng bài, mức điểm).',
      'Đối tượng học viên phù hợp':
        'Ai nên học? Nêu trình độ đầu vào, mục tiêu của học viên và kiến thức cần có trước khi học.',
      'Quyền lợi và hỗ trợ':
        'Học viên nhận được gì: tài liệu, bài luyện tập, chấm chữa, kênh hỗ trợ giải đáp...',
    },
    columnHints: {
      'Giai đoạn': 'Tên giai đoạn hoặc khoảng thời gian (tuần / ngày)',
      'Nội dung trọng tâm': 'Chủ đề, kỹ năng hoặc Part sẽ học trong giai đoạn này',
      'Kết quả đầu ra': 'Học viên đạt được gì khi kết thúc giai đoạn này',
    },
  },
  {
    id: 'course-roadmap',
    label: 'Mẫu lộ trình',
    icon: 'table',
    title: 'Chèn bảng lộ trình học theo tuần / buổi',
    html: table(['Tuần / Buổi', 'Chủ đề bài học', 'Kỹ năng rèn luyện', 'Mục tiêu hoàn thành'], 3),
    columnHints: {
      'Tuần / Buổi': 'Mốc thời gian, ví dụ: Tuần 1 hoặc Buổi 1–2',
      'Chủ đề bài học': 'Tên chủ đề / bài học của mốc này',
      'Kỹ năng rèn luyện': 'Kỹ năng chính được luyện (nghe, đọc, từ vựng, ngữ pháp...)',
      'Mục tiêu hoàn thành': 'Điều kiện để xem là hoàn thành mốc này (bài tập, điểm kiểm tra...)',
    },
  },
  {
    id: 'callout',
    label: 'Khung lưu ý',
    icon: 'quote',
    title: 'Chèn khung ghi chú / điểm cần nhấn mạnh',
    html: '<blockquote><p></p></blockquote>',
    calloutHint:
      'Ghi 1–2 câu về điều học viên cần đặc biệt chú ý (yêu cầu, lịch học, lỗi hay gặp...).',
  },
]

/** ---- Dùng cho: bài viết ngữ pháp (GrammarArticleEditor) ---- */
export const GRAMMAR_TEMPLATES = [
  {
    id: 'grammar-full',
    label: 'Mẫu bài ngữ pháp',
    icon: 'file',
    title: 'Chèn bố cục bài ngữ pháp (Cấu trúc, Cách dùng, Ví dụ, Lưu ý)',
    html:
      `<h2>Cấu trúc / Công thức</h2>${EMPTY_P}` +
      `<h2>Cách dùng</h2>${EMPTY_LIST}` +
      `<h2>Ví dụ minh họa</h2>${table(['Câu tiếng Anh', 'Nghĩa tiếng Việt', 'Giải thích'], 3)}` +
      `<h2>Lưu ý và bẫy thường gặp</h2>${EMPTY_LIST}`,
    hints: {
      'Cấu trúc / Công thức':
        'Viết công thức bằng ký hiệu (S + V...) kèm tên cấu trúc. Dùng nút Code để làm nổi bật công thức.',
      'Cách dùng':
        'Mỗi gạch đầu dòng 1 trường hợp dùng. Nêu rõ khi nào dùng và dấu hiệu nhận biết.',
      'Lưu ý và bẫy thường gặp':
        'Các lỗi học viên hay mắc, bẫy trong đề TOEIC, ngoại lệ cần nhớ.',
    },
    columnHints: {
      'Câu tiếng Anh': 'Câu ví dụ hoàn chỉnh dùng đúng cấu trúc vừa nêu',
      'Nghĩa tiếng Việt': 'Dịch nghĩa câu ví dụ',
      'Giải thích': 'Chỉ ra phần nào trong câu thể hiện cấu trúc / vì sao dùng như vậy',
    },
  },
  {
    id: 'grammar-compare',
    label: 'Bảng so sánh',
    icon: 'table',
    title: 'Chèn bảng so sánh hai cấu trúc / hai thì dễ nhầm lẫn',
    html: table(['Tiêu chí', 'Cấu trúc A', 'Cấu trúc B'], 3),
    columnHints: {
      'Tiêu chí': 'Điểm so sánh: ý nghĩa, công thức, vị trí trong câu, dấu hiệu nhận biết...',
      'Cấu trúc A': 'Đặc điểm của cấu trúc thứ nhất theo tiêu chí ở cột trái',
      'Cấu trúc B': 'Đặc điểm của cấu trúc thứ hai theo tiêu chí ở cột trái',
    },
  },
  CALLOUT_FOR('Ghi điều cần nhớ / mẹo làm bài của phần ngữ pháp này.'),
]

/** ---- Dùng cho: lý thuyết đi kèm video (VideoLectureEditor) ---- */
export const VIDEO_THEORY_TEMPLATES = [
  {
    id: 'video-theory',
    label: 'Mẫu lý thuyết kèm video',
    icon: 'file',
    title: 'Chèn bố cục lý thuyết đi kèm video (Nội dung chính, Từ vựng, Mẹo làm bài)',
    html:
      `<h2>Nội dung chính của video</h2>${EMPTY_LIST}` +
      `<h2>Từ vựng và cấu trúc cần nhớ</h2>${table(['Từ / Cấu trúc', 'Nghĩa', 'Ví dụ trong video'], 3)}` +
      `<h2>Mẹo và lưu ý khi làm bài</h2>${EMPTY_LIST}`,
    hints: {
      'Nội dung chính của video':
        'Tóm tắt các ý chính theo thứ tự xuất hiện trong video, mỗi gạch đầu dòng 1 ý.',
      'Mẹo và lưu ý khi làm bài': 'Mẹo xử lý dạng bài, bẫy thường gặp, điều cần ghi nhớ.',
    },
    columnHints: {
      'Từ / Cấu trúc': 'Từ hoặc cấu trúc quan trọng được nhắc trong video',
      Nghĩa: 'Nghĩa tiếng Việt ngắn gọn',
      'Ví dụ trong video': 'Câu / tình huống ví dụ xuất hiện trong video',
    },
  },
  CALLOUT_FOR('Ghi điều học viên cần đặc biệt chú ý khi xem video này.'),
]

function CALLOUT_FOR(calloutHint) {
  return {
    id: 'callout',
    label: 'Khung lưu ý',
    icon: 'quote',
    title: 'Chèn khung ghi chú / điểm cần nhấn mạnh',
    html: '<blockquote><p></p></blockquote>',
    calloutHint,
  }
}

/** PassageModal (bài đọc / transcript): không cần mẫu -> truyền templates={[]} (mặc định) */
export const NO_TEMPLATES = []

/* ------------------------------------------------------------------ */
/* 2. Extension hiển thị gợi ý trong các ô / đoạn còn TRỐNG            */
/* ------------------------------------------------------------------ */

/**
 * Vì sao không dùng extension `Placeholder` có sẵn của Tiptap?
 * Callback của nó chỉ nhận `editor` (đọc editor.state có thể chưa phải doc mới nhất khi tính
 * decoration) nên không đáng tin để tra "đang ở dưới tiêu đề nào / cột nào". Extension này đọc
 * thẳng `state.doc` do ProseMirror truyền vào nên luôn đúng.
 *
 * Gợi ý chỉ là DECORATION (thuộc tính data-hint trên DOM) -> không bao giờ vào getHTML().
 */
export function createHintExtension(templates = [], emptyDocText = '') {
  const sectionHints = Object.assign({}, ...templates.map((t) => t.hints || {}))
  const columnHints = Object.assign({}, ...templates.map((t) => t.columnHints || {}))
  const calloutHint = templates.find((t) => t.calloutHint)?.calloutHint ?? ''

  const resolve = (doc, node, pos) => {
    if (node.type.name === 'heading') return 'Nhập tiêu đề mục'
    const $pos = doc.resolve(pos)

    // 1) Ô trong bảng -> gợi ý theo TÊN CỘT (lấy từ hàng đầu tiên)
    for (let d = $pos.depth; d > 0; d--) {
      const name = $pos.node(d).type.name
      if (name === 'tableHeader') return 'Tên cột'
      if (name === 'tableCell') {
        const table = $pos.node(d - 2)
        const header = table.child(0)?.maybeChild($pos.index(d - 1))?.textContent.trim()
        return columnHints[header] ?? ''
      }
      if (name === 'blockquote') return calloutHint
    }

    // 2) Đoạn / list nằm dưới 1 tiêu đề mục -> gợi ý theo TÊN MỤC gần nhất phía trên
    for (let i = $pos.index(0); i >= 0; i--) {
      const sibling = doc.child(i)
      if (sibling.type.name === 'heading') return sectionHints[sibling.textContent.trim()] ?? ''
    }
    return ''
  }

  return Extension.create({
    name: 'structureHints',
    addProseMirrorPlugins() {
      const editor = this.editor
      return [
        new Plugin({
          key: new PluginKey('structureHints'),
          props: {
            decorations(state) {
              if (!editor.isEditable) return null
              const { doc } = state
              const decorations = []
              const docIsEmpty = doc.childCount === 1 && doc.firstChild.content.size === 0
              doc.descendants((node, pos) => {
                if (!node.isTextblock || node.content.size > 0) return
                const hint = docIsEmpty ? emptyDocText : resolve(doc, node, pos)
                if (!hint) return
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: 'has-hint', 'data-hint': hint }),
                )
              })
              return DecorationSet.create(doc, decorations)
            },
          },
        }),
      ]
    },
  })
}

/* ------------------------------------------------------------------ */
/* 3. Tiện ích: tìm các mục còn bỏ trống (dùng để cảnh báo trước khi lưu) */
/* ------------------------------------------------------------------ */

/** Trả về tên các tiêu đề h2/h3 mà bên dưới (tới tiêu đề kế tiếp) không có chữ nào. Bỏ qua ô tiêu đề cột <th>. */
export function findEmptySections(html) {
  if (!html) return []
  const body = new DOMParser().parseFromString(html, 'text/html').body
  const result = []
  const kids = Array.from(body.children)
  kids.forEach((el, i) => {
    if (!/^H[23]$/.test(el.tagName)) return
    let hasContent = false
    for (let j = i + 1; j < kids.length && !/^H[23]$/.test(kids[j].tagName); j++) {
      const clone = kids[j].cloneNode(true)
      clone.querySelectorAll('th').forEach((th) => th.remove())
      if (clone.textContent.trim() || clone.querySelector('img,audio')) {
        hasContent = true
        break
      }
    }
    if (!hasContent) result.push(el.textContent.trim())
  })
  return result
}
