import { useState } from "react";

/**
 * TranscriptDropdown — Hiển thị transcript hội thoại (Part 3/4) dưới dạng dropdown, ẩn mặc định.
 * Khác với đề bài (passageHtml) luôn hiển thị trực tiếp, transcript chỉ xổ ra khi học viên
 * chủ động bấm xem (tránh lộ đáp án/nội dung nghe trước khi làm bài).
 *
 * Props:
 *  - html: nội dung transcript dạng HTML (string)
 *  - className: CSS class tùy chỉnh (optional)
 */
export default function TranscriptDropdown({ html, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!html || !html.trim()) {
    return null;
  }

  return (
    <div className={`explanation-dropdown transcript-dropdown ${className}`}>
      <button
        type="button"
        className="explanation-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="explanation-toggle-icon">{isOpen ? "▼" : "▶"}</span>
        <span className="explanation-toggle-text">Transcript</span>
      </button>
      {isOpen && (
        <div
          className="explanation-content rich-text-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
