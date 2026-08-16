import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import CourseListPage from './pages/CourseListPage.jsx'
import LessonPlayerPage from './pages/LessonPlayerPage.jsx'
import StudentDashboardPage from './pages/StudentDashboardPage.jsx'
import TeacherDashboardPage from './pages/TeacherDashboardPage.jsx'
import Layout from './components/Layout.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/lessons/:lessonId" element={<LessonPlayerPage />} />
        <Route path="/dashboard/student" element={<StudentDashboardPage />} />
        <Route path="/dashboard/teacher" element={<TeacherDashboardPage />} />
      </Route>
    </Routes>
  )
}
