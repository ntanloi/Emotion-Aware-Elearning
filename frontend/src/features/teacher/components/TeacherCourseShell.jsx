import TeacherCourseSidebar from './TeacherCourseSidebar.jsx'

/**
 * TeacherCourseShell — bản sao bố cục của CourseLearnShell (phía học viên): sidebar sát bên
 * trái, cố định xuyên suốt toàn bộ khu vực soạn bài (danh sách Unit, danh sách hoạt động,
 * từng trang soạn 1 hoạt động cụ thể). Dùng cùng class CSS ".course-learn-layout" để thừa
 * hưởng luôn phần CSS đã có, đảm bảo layout giống hệt bên học viên như yêu cầu.
 */
export default function TeacherCourseShell({ activeSection, courseId, children }) {
  return (
    <div className="course-learn-layout">
      <aside className="sidebar">
        <TeacherCourseSidebar activeSection={activeSection} courseId={courseId} />
      </aside>
      <div className="course-learn-content">{children}</div>
    </div>
  )
}
