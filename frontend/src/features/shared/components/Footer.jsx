import React from 'react'

/**
 * Footer - Thiết kế tối giản 1 dòng dành cho ứng dụng học tập nội bộ
 */
export default function Footer() {
  return (
    <footer
      className="app-footer-minimal no-print"
      style={{
        borderTop: '1px solid var(--border, #e2e8f0)',
        background: 'var(--surface, #ffffff)',
        padding: '16px 24px',
        fontSize: 'var(--fs-xs, 12px)',
        color: 'var(--text-dim, #64748b)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          © {new Date().getFullYear()} <strong>E-Learning AI</strong> • Nền tảng luyện thi & thích ứng cảm xúc
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>Chính sách bảo mật</span>
          <span>•</span>
          <span>Hỗ trợ: support@elearning-ai.edu.vn</span>
        </div>
      </div>
    </footer>
  )
}
