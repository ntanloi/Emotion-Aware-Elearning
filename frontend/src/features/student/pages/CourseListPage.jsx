import { useState, useMemo } from 'react'
import { useCourses } from '@shared/hooks/useCourses.js'
import CourseCard from '@shared/components/CourseCard.jsx'
import EmptyState from '@shared/components/ui/EmptyState.jsx'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import HomeBanner from '@student/components/home/HomeBanner.jsx'
import HomeHighlights from '@student/components/home/HomeHighlights.jsx'
import HomeMyCoursesSection from '@student/components/home/HomeMyCoursesSection.jsx'
import '@student/components/home/home.css'
import { Search, SlidersHorizontal, X, AlertCircle, RefreshCw, BookOpen } from 'lucide-react'

/**
 * Trang chủ học viên (CourseListPage / route / và /courses)
 * Thiết kế gọn gàng gồm:
 * 1. Banner dạng slide (3 slide: chào học viên, học thích ứng AI, ngân hàng đề/ưu đãi)
 * 2. Dải giới thiệu gọn (3 ô tính năng nổi bật)
 * 3. Mục "Tất cả khóa học" với bộ lọc, tìm kiếm và số lượng dạng 3/12 khi lọc.
 */
export default function CourseListPage() {
  const { data: courses, isLoading, isError, error, refetch } = useCourses()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('ALL')
  const [sortBy, setSortBy] = useState('DEFAULT')

  // Lọc và sắp xếp khóa học
  const filteredCourses = useMemo(() => {
    let list = courses || []

    // 1. Tìm kiếm theo tên, mô tả, giảng viên
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.teacherName?.toLowerCase().includes(q),
      )
    }

    // 2. Lọc theo Level
    if (selectedLevel !== 'ALL') {
      list = list.filter((c) => {
        const lvl = (c.level || '').toUpperCase()
        if (selectedLevel === 'BEGINNER') return lvl.includes('BEGIN') || lvl.includes('450')
        if (selectedLevel === 'INTERMEDIATE') return lvl.includes('INTER') || lvl.includes('650')
        if (selectedLevel === 'ADVANCED') return lvl.includes('ADV') || lvl.includes('800') || lvl.includes('900')
        return true
      })
    }

    // 3. Sắp xếp
    if (sortBy === 'PRICE_ASC') {
      list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    } else if (sortBy === 'PRICE_DESC') {
      list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    } else if (sortBy === 'RATING') {
      list = [...list].sort((a, b) => (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0))
    }

    return list
  }, [courses, searchTerm, selectedLevel, sortBy])

  const courseCount = (courses || []).length
  const isFiltering = searchTerm.trim() !== '' || selectedLevel !== 'ALL' || sortBy !== 'DEFAULT'

  // Hàm hỗ trợ cuộn mượt xuống danh mục khóa học & lọc theo level nếu có
  const handleExploreCourses = (level = null) => {
    if (level) setSelectedLevel(level)
    document.getElementById('course-list-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="home-container">
      {/* 1. Banner dạng slide (3 slide) */}
      <HomeBanner />

      {/* 2. Trạm học tập hôm nay (Today's Learning Command Center) */}
      <HomeMyCoursesSection onExploreCourses={() => handleExploreCourses()} />

      {/* 3. Lối tắt học nhanh (Smart Action Hubs) */}
      <HomeHighlights onExploreCourses={() => handleExploreCourses()} />

      {/* 4. Mục "Khám phá khóa học TOEIC" */}
      <section id="course-list-section" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="home-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="home-section-heading">Khám phá khóa học TOEIC</h2>
            <span className="home-course-counter-pill">
              {isFiltering && filteredCourses.length !== courseCount
                ? `${filteredCourses.length}/${courseCount} khóa học`
                : `${courseCount} khóa học`}
            </span>
          </div>
        </div>

        {/* Thanh tìm kiếm & Bộ lọc */}
        <div className="home-filter-bar">
          {/* Ô tìm kiếm */}
          <div className="home-search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="home-search-input"
              placeholder="Tìm theo tên khóa học, giảng viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Nhóm Level Pills */}
          <div className="home-level-tabs">
            <button
              type="button"
              className={`level-tab-btn ${selectedLevel === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedLevel('ALL')}
            >
              Tất cả ({courseCount})
            </button>
            <button
              type="button"
              className={`level-tab-btn ${selectedLevel === 'BEGINNER' ? 'active' : ''}`}
              onClick={() => setSelectedLevel('BEGINNER')}
            >
              Cơ bản (450+)
            </button>
            <button
              type="button"
              className={`level-tab-btn ${selectedLevel === 'INTERMEDIATE' ? 'active' : ''}`}
              onClick={() => setSelectedLevel('INTERMEDIATE')}
            >
              Trung cấp (650+)
            </button>
            <button
              type="button"
              className={`level-tab-btn ${selectedLevel === 'ADVANCED' ? 'active' : ''}`}
              onClick={() => setSelectedLevel('ADVANCED')}
            >
              Nâng cao (800+)
            </button>
          </div>

          {/* Sắp xếp */}
          <div className="home-sort-wrap">
            <SlidersHorizontal size={14} className="text-dim" />
            <select
              className="home-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="DEFAULT">Sắp xếp: Mặc định</option>
              <option value="RATING">Đánh giá cao nhất</option>
              <option value="PRICE_ASC">Giá: Thấp đến Cao</option>
              <option value="PRICE_DESC">Giá: Cao đến Thấp</option>
            </select>
          </div>
        </div>

        {/* Lưới khóa học */}
        {isLoading ? (
          <div className="home-courses-grid">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  borderRadius: 'var(--radius-lg, 12px)',
                  padding: 'var(--sp-4, 16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <Skeleton height={140} borderRadius="var(--radius-md, 10px)" />
                <Skeleton height={20} width="75%" />
                <Skeleton height={14} width="50%" />
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Skeleton height={16} width="30%" />
                  <Skeleton height={32} width="40%" borderRadius="var(--radius, 8px)" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            className="card"
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--bad-soft)',
                color: 'var(--bad)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={24} />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Không thể tải danh sách khóa học
            </h3>
            <p className="text-dim text-sm" style={{ margin: 0, maxWidth: 440 }}>
              {error?.message || 'Đã có lỗi xảy ra khi kết nối máy chủ. Vui lòng kiểm tra lại kết nối và thử lại.'}
            </p>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => refetch()}
              style={{ minHeight: 38, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}
            >
              <RefreshCw size={14} />
              <span>Thử lại</span>
            </button>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="home-courses-grid">
            {filteredCourses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : courseCount === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Chưa có khóa học nào"
            description="Hiện tại hệ thống đang cập nhật các khóa học mới. Vui lòng quay lại sau."
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Không tìm thấy khóa học phù hợp"
            description="Thử tìm kiếm với từ khóa khác hoặc chuyển sang cấp độ khác."
            actionText="Đặt lại bộ lọc"
            onAction={() => {
              setSearchTerm('')
              setSelectedLevel('ALL')
              setSortBy('DEFAULT')
            }}
          />
        )}
      </section>
    </div>
  )
}
