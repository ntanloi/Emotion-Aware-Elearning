import React from 'react'
import WrongQuestionsNotebook from '@student/components/WrongQuestionsNotebook.jsx'

export default function ReportPracticeTab({
  practiceData,
  courseId,
  enrolledCourses = [],
  onRefresh,
}) {
  if (!practiceData) return null

  const wrongQuestions = practiceData.wrongQuestions || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Danh sách Sổ câu sai cá nhân */}
      <WrongQuestionsNotebook
        wrongQuestions={wrongQuestions}
        enrolledCourses={enrolledCourses}
        onRefresh={onRefresh}
      />
    </div>
  )
}
