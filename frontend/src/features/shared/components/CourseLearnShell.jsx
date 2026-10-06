import CourseSidebar from '@shared/components/CourseSidebar.jsx'

/**
 * CourseLearnShell — Layout học với sidebar sát bên trái.
 * Sidebar nằm sát sườn trái màn hình, content có padding riêng.
 * BẮT BUỘC bọc TẤT CẢ các trang thuộc phạm vi khóa học (danh sách Đơn vị, danh sách
 * Hoạt động, VÀ từng Hoạt động cụ thể) bằng component này để sidebar cố định xuyên suốt,
 * chỉ biến mất khi người dùng thực sự rời khỏi phạm vi khóa học (vd: /courses, /profile...).
 *
 * `courseId` truyền vào cho những trang KHÔNG có :courseId trong route (vd trang
 * /content-items/:id lấy courseId từ query string) — nếu không truyền, CourseSidebar tự
 * lấy từ useParams() của route hiện tại như trước.
 */
export default function CourseLearnShell({ activeSection, courseId, children }) {
  return (
    <div className="course-learn-layout">
      <aside className="sidebar">
        <CourseSidebar activeSection={activeSection} courseId={courseId} />
      </aside>
      <div className="course-learn-content">
        {children}
      </div>
    </div>
  )
}