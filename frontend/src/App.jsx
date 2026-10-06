import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@auth/pages/LoginPage.jsx";
import RegisterPage from "@auth/pages/RegisterPage.jsx";
import CourseListPage from "@student/pages/CourseListPage.jsx";
import CourseDetailPage from "@student/pages/CourseDetailPage.jsx";
import MyLearningPage from "@student/pages/MyLearningPage.jsx";
import ContentItemPage from "@student/pages/ContentItemPage.jsx";
import FlashcardReviewPage from "@student/pages/FlashcardReviewPage.jsx";
import DailyReportPage from "@student/pages/DailyReportPage.jsx";
import ProfilePage from "@student/pages/ProfilePage.jsx";
import StudentDashboardPage from "@student/pages/StudentDashboardPage.jsx";
import TeacherDashboardPage from "@teacher/pages/TeacherDashboardPage.jsx";
import TeacherCourseListPage from "@teacher/pages/TeacherCourseListPage.jsx";
import TeacherSectionContentPage from "@teacher/pages/TeacherSectionContentPage.jsx";
import TeacherContentItemEditorPage from "@teacher/pages/TeacherContentItemEditorPage.jsx";
import TeacherVocabLibraryPage from "@teacher/pages/TeacherVocabLibraryPage.jsx";
import Layout from "@layouts/AppLayout.jsx";

/**
 * Cấu trúc trang (routing) — theo đúng mục 2.2 lộ trình Giai đoạn 6.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/courses/:courseId/learn" element={<MyLearningPage />} />
        <Route path="/content-items/:id" element={<ContentItemPage />} />
        <Route path="/flashcards/review" element={<FlashcardReviewPage />} />
        <Route path="/reports/daily" element={<DailyReportPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard/student" element={<StudentDashboardPage />} />
        <Route path="/dashboard/teacher" element={<TeacherDashboardPage />} />

        {/* Khu vực soạn bài của giáo viên — mỗi mục sidebar hiển thị thẳng Nhóm hoạt động */}
        <Route path="/teacher/courses" element={<TeacherCourseListPage />} />
        <Route
          path="/teacher/courses/:courseId/content"
          element={<TeacherSectionContentPage />}
        />
        <Route
          path="/teacher/content-items/:id"
          element={<TeacherContentItemEditorPage />}
        />
        <Route
          path="/teacher/vocab-library"
          element={<TeacherVocabLibraryPage />}
        />
      </Route>
    </Routes>
  );
}
