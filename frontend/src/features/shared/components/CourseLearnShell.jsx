import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import CourseSidebar from '@shared/components/CourseSidebar.jsx'

/**
 * CourseLearnShell — Layout học với sidebar sát bên trái.
 * Hỗ trợ co giãn linh hoạt: Trên Desktop là Sidebar ghim cố định bên trái (260px).
 * Trên Tablet & Mobile (< 960px) tự động chuyển sang Drawer trượt off-canvas,
 * giúp vùng hiển thị bài học đạt 100% độ rộng màn hình.
 */
export default function CourseLearnShell({ activeSection, courseId, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Tự động đóng drawer khi chọn bài học hoặc chuyển mục
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.search, location.pathname])

  // Khóa cuộn nền khi sidebar mở trên màn hình nhỏ
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="course-learn-layout">
      {/* Thanh điều hướng di động: Nút mở danh mục bài học */}
      <div className="course-learn-mobile-topbar">
        <button
          type="button"
          className="course-learn-mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Mở danh mục bài học"
        >
          <Menu size={16} />
          <span>Danh mục bài học</span>
        </button>
      </div>

      {/* Lớp nền mờ khi mở Sidebar trên Mobile/Tablet */}
      <div
        className={`course-sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar nội dung khóa học */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="course-sidebar-mobile-header">
          <span style={{ fontWeight: 700, fontSize: 14 }}>Nội dung khóa học</span>
          <button
            type="button"
            className="course-sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <CourseSidebar activeSection={activeSection} courseId={courseId} />
      </aside>

      {/* Vùng hiển thị nội dung chính bài học */}
      <div className="course-learn-content">
        {children}
      </div>
    </div>
  )
}
