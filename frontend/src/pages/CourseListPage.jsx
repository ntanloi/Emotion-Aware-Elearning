import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCourses } from '../api/courses.js'

export default function CourseListPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCourses().then(setCourses).finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Đang tải khóa học...</p>

  return (
    <div>
      <h2>Danh sách khóa học</h2>
      <div className="grid">
        {courses.map((c) => (
          <div className="card" key={c.id}>
            <h3 style={{ marginTop: 0 }}>{c.title}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{c.description}</p>
            <Link className="btn" to={`/courses/${c.id}`}>Xem khóa học</Link>
          </div>
        ))}
        {courses.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Chưa có khóa học nào.</p>}
      </div>
    </div>
  )
}
