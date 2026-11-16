import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import TeacherCourseSidebar from './TeacherCourseSidebar.jsx'

/**
 * TeacherCourseShell — bản sao bố cục của CourseLearnShell (phía học viên): sidebar sát bên
 * trái, cố định xuyên suốt toàn bộ khu vực soạn bài (danh sách Unit, danh sách hoạt động,
 * từng trang soạn 1 hoạt động cụ thể). Dùng cùng class CSS ".course-learn-layout" để thừa
 * hưởng luôn phần CSS đã có.
 * Hỗ trợ co giãn linh hoạt: Trên Desktop là Sidebar ghim cố định bên trái (260px).
 * Trên Tablet & Mobile (< 960px) tự động chuyển sang Drawer trượt off-canvas,
 * giúp khu vực soạn giáo trình đạt 100% độ rộng màn hình.
 */
export default function TeacherCourseShell({ activeSection, courseId, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Tự động đóng drawer khi chuyển mục hoặc đổi route
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
      {/* Thanh điều hướng di động: Nút mở giáo trình khóa học */}
      <div className="course-learn-mobile-topbar">
        <button
          type="button"
          className="course-learn-mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Mở giáo trình khóa học"
        >
          <Menu size={16} />
          <span>Giáo trình khóa học</span>
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
          <span style={{ fontWeight: 700, fontSize: 14 }}>Giáo trình khóa học</span>
          <button
            type="button"
            className="course-sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <TeacherCourseSidebar activeSection={activeSection} courseId={courseId} />
      </aside>

      {/* Vùng hiển thị nội dung chính bài học */}
      <div className="course-learn-content">
        {children}
      </div>
    </div>
  )
}
