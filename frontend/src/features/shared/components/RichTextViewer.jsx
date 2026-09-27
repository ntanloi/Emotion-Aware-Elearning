/**
 * RichTextViewer — hiển thị bodyHtml của GRAMMAR_ARTICLE (đọc-chỉ, dùng ở học viên + Preview giảng viên).
 * Không dùng dangerouslySetInnerHTML tuỳ tiện ở nơi khác — chỉ ở đây, vì nội dung do giảng viên
 * (người dùng đã xác thực, có quyền TEACHER) soạn qua RichTextEditor (Tiptap) chứ không phải input tự do.
 */
export default function RichTextViewer({ html }) {
  if (!html) return <p className="text-dim">Chưa có nội dung.</p>
  return <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: html }} />
}
