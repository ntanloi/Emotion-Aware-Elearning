/**
 * passageTitle — tên hiển thị cho 1 đoạn văn/hội thoại. Dùng số thứ tự đơn giản
 * "Đoạn văn #1", "Đoạn văn #2"... (đã thử đặt tên theo vài chữ đầu nội dung nhưng đổi lại
 * dùng số thứ tự theo yêu cầu).
 */
export function passageTitle(passage, index) {
  return `Đoạn văn #${index + 1}`
}