import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@auth/pages/LoginPage.jsx";
import RegisterPage from "@auth/pages/RegisterPage.jsx";
import ForgotPasswordPage from "@auth/pages/ForgotPasswordPage.jsx";
import CourseListPage from "@student/pages/CourseListPage.jsx";
import TestListPage from "@student/pages/TestListPage.jsx";
import TestConfigPage from "@student/pages/TestConfigPage.jsx";
import TestRunnerPage from "@student/pages/TestRunnerPage.jsx";
import TestResultPage from "@student/pages/TestResultPage.jsx";
import CourseDetailPage from "@student/pages/CourseDetailPage.jsx";
import MyCoursesPage from "@student/pages/MyCoursesPage.jsx";
import MyLearningPage from "@student/pages/MyLearningPage.jsx";
import ContentItemPage from "@student/pages/ContentItemPage.jsx";
import FlashcardReviewPage from "@student/pages/FlashcardReviewPage.jsx";
import DailyReportPage from "@student/pages/DailyReportPage.jsx";
import StudentReportsPage from "@student/pages/StudentReportsPage.jsx";
import ProfilePage from "@student/pages/ProfilePage.jsx";
import WalletPage from "@student/pages/WalletPage.jsx";
import TeacherDashboardPage from "@teacher/pages/TeacherDashboardPage.jsx";
import TeacherCourseListPage from "@teacher/pages/TeacherCourseListPage.jsx";
import TeacherCourseEditorPage from "@teacher/pages/TeacherCourseEditorPage.jsx";
import TeacherSectionContentPage from "@teacher/pages/TeacherSectionContentPage.jsx";
import TeacherContentItemEditorPage from "@teacher/pages/TeacherContentItemEditorPage.jsx";
import TeacherVocabLibraryPage from "@teacher/pages/TeacherVocabLibraryPage.jsx";
import TeacherCourseReviewsPage from "@teacher/pages/TeacherCourseReviewsPage.jsx";
import TeacherTestsPage from "@teacher/pages/TeacherTestsPage.jsx";
import TeacherTestBuilderPage from "@teacher/pages/TeacherTestBuilderPage.jsx";
import TeacherQuestionBankPage from "@teacher/pages/TeacherQuestionBankPage.jsx";
import Layout from "@layouts/AppLayout.jsx";
import RequireRole from "@shared/components/RequireRole.jsx";
import AdminLayout from "@admin/pages/AdminLayout.jsx";
import AdminOverviewPage from "@admin/pages/AdminOverviewPage.jsx";
import AdminModerationQueuePage from "@admin/pages/AdminModerationQueuePage.jsx";
import AdminCourseReviewDetailPage from "@admin/pages/AdminCourseReviewDetailPage.jsx";
import AdminUserListPage from "@admin/pages/AdminUserListPage.jsx";
import AdminCourseListPage from "@admin/pages/AdminCourseListPage.jsx";
import AdminAuditLogPage from "@admin/pages/AdminAuditLogPage.jsx";
import AdminReviewsPage from "@admin/pages/AdminReviewsPage.jsx";
import AdminFinancePage from "@admin/pages/AdminFinancePage.jsx";
import AdminLexiconPage from "@admin/pages/AdminLexiconPage.jsx";
import AdminTestModerationPage from "@admin/pages/AdminTestModerationPage.jsx";
import { useAuthStore } from "@auth/store/authStore.js";

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user?.role === "TEACHER") return <Navigate to="/dashboard/teacher" replace />;
  return <CourseListPage />;
}

/**
 * Cấu trúc trang (routing) — Có bảo vệ phân quyền theo Role.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/courses" element={<CourseListPage />} />
        <Route path="/tests" element={<TestListPage />} />
        <Route path="/tests/:testId" element={<TestConfigPage />} />
        <Route path="/tests/attempts/:attemptId" element={<TestRunnerPage />} />
        <Route path="/tests/attempts/:attemptId/result" element={<TestResultPage />} />
        <Route path="/my-courses" element={<Navigate to="/courses" replace />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/courses/:courseId/learn" element={<MyLearningPage />} />
        <Route path="/content-items/:id" element={<ContentItemPage />} />
        <Route path="/flashcards/review" element={<FlashcardReviewPage />} />
        <Route path="/reports" element={<StudentReportsPage />} />
        <Route path="/reports/daily" element={<Navigate to="/reports?tab=diary" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/dashboard/student" element={<Navigate to="/courses" replace />} />

        {/* Khu vực dành riêng cho Quản trị viên (ADMIN) */}
        <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="moderation" element={<AdminModerationQueuePage />} />
            <Route path="moderation/:courseId" element={<AdminCourseReviewDetailPage />} />
            <Route path="users" element={<AdminUserListPage />} />
            <Route path="courses" element={<AdminCourseListPage />} />
            <Route path="tests" element={<AdminTestModerationPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="audit-logs" element={<AdminAuditLogPage />} />
            <Route path="lexicon" element={<AdminLexiconPage />} />
          </Route>
          <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* Khu vực dành riêng cho Giảng viên & Admin */}
        <Route element={<RequireRole allowedRoles={["TEACHER", "ADMIN"]} />}>
          <Route path="/dashboard/teacher" element={<TeacherDashboardPage />} />
          <Route path="/teacher/courses" element={<TeacherCourseListPage />} />
          <Route path="/teacher/tests" element={<TeacherTestsPage />} />
          <Route path="/teacher/tests/:id/builder" element={<TeacherTestBuilderPage />} />
          <Route path="/teacher/question-bank" element={<Navigate to="/teacher/courses?tab=questions" replace />} />
          <Route path="/teacher/courses/new" element={<TeacherCourseEditorPage />} />
          <Route path="/teacher/courses/:courseId/edit" element={<TeacherCourseEditorPage />} />
          <Route
            path="/teacher/courses/:courseId/content"
            element={<TeacherSectionContentPage />}
          />
          <Route
            path="/teacher/courses/:courseId/curriculum"
            element={<TeacherSectionContentPage />}
          />
          <Route
            path="/teacher/courses/:courseId/reviews"
            element={<TeacherCourseReviewsPage />}
          />
          <Route
            path="/teacher/content-items/:id"
            element={<TeacherContentItemEditorPage />}
          />
          <Route
            path="/teacher/vocab-library"
            element={<Navigate to="/teacher/courses?tab=vocab" replace />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
