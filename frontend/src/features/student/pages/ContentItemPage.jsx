import { useParams, useSearchParams, Link } from 'react-router-dom'
import CourseLearnShell from '@shared/components/CourseLearnShell.jsx'
import ContentItemRenderer from '@shared/components/ContentItemRenderer.jsx'
import { useContentItem } from '@shared/hooks/useContentSection.js'
import { Home, ChevronRight, ArrowLeft } from 'lucide-react'

const SECTION_LABELS = {
  VOCAB: 'Từ vựng',
  GRAMMAR: 'Ngữ pháp',
  PART1: 'Part 1',
  PART2: 'Part 2',
  PART3: 'Part 3',
  PART4: 'Part 4',
  PART5: 'Part 5',
  PART6: 'Part 6',
  PART7: 'Part 7',
  DICTATION: 'Luyện nghe chép chính tả',
}

export default function ContentItemPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const paramSection = searchParams.get('section')
  const paramCourseId = searchParams.get('courseId')

  const { data: item } = useContentItem(id)

  const effectiveCourseId = paramCourseId || item?.courseId
  const effectiveSection = paramSection || item?.sectionCode
  const sectionLabel = SECTION_LABELS[effectiveSection] || effectiveSection || 'Bài học'

  return (
    <CourseLearnShell activeSection={effectiveSection === 'PART' ? 'PART' : effectiveSection} courseId={effectiveCourseId}>
      {/* Thanh điều hướng đường dẫn phân cấp (Breadcrumbs Trail) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--surface-1)',
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        marginBottom: 20
      }}>
        {/* Đường dẫn phân cấp trực quan */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-dim)'
          }}
        >
          {/* Cấp 1: Trang chủ */}
          <Link
            to="/courses"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--text-dim)',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            title="Trang chủ khóa học"
          >
            <Home size={15} />
            <span>Trang chủ</span>
          </Link>

          <ChevronRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />

          {/* Cấp 2: Tên khóa học */}
          {effectiveCourseId ? (
            <Link
              to={`/courses/${effectiveCourseId}`}
              style={{
                color: 'var(--text-dim)',
                textDecoration: 'none',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              title={item?.courseTitle || 'Xem thông tin khóa học'}
            >
              {item?.courseTitle || 'Khóa học'}
            </Link>
          ) : (
            <span>Khóa học</span>
          )}

          <ChevronRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />

          {/* Cấp 3: Mục nội dung (Section, ví dụ: Ngữ pháp, Từ vựng) */}
          {effectiveCourseId ? (
            <Link
              to={`/courses/${effectiveCourseId}/learn?section=${effectiveSection || ''}`}
              style={{
                color: 'var(--text-dim)',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              title={`Mục ${sectionLabel}`}
            >
              {sectionLabel}
            </Link>
          ) : (
            <span>{sectionLabel}</span>
          )}

          {/* Cấp 4: Nhóm hoạt động (nếu có, ví dụ: "Chủ điểm 1: Danh từ") */}
          {item?.groupTitle && (
            <>
              <ChevronRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
              <Link
                to={`/courses/${effectiveCourseId}/learn?section=${effectiveSection || ''}`}
                style={{
                  color: 'var(--text-dim)',
                  textDecoration: 'none',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                title={`Nhóm: ${item.groupTitle}`}
              >
                {item.groupTitle}
              </Link>
            </>
          )}

          <ChevronRight size={14} style={{ opacity: 0.5, flexShrink: 0 }} />

          {/* Cấp 5: Hoạt động hiện tại (Đang học) */}
          <span
            style={{
              color: 'var(--accent)',
              fontWeight: 700,
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={item?.title || 'Hoạt động hiện tại'}
          >
            {item?.title || 'Đang tải...'}
          </span>
        </nav>

        {/* Nút quay lại danh sách hoạt động */}
        {effectiveCourseId && (
          <Link
            to={`/courses/${effectiveCourseId}/learn?section=${effectiveSection || ''}`}
            className="btn sm secondary flex-row"
            style={{ gap: 6, fontSize: 12, padding: '5px 12px', borderRadius: 8 }}
            title="Quay lại danh sách bài học của mục này"
          >
            <ArrowLeft size={13} />
            <span>Quay lại danh sách</span>
          </Link>
        )}
      </div>

      <div>
        <ContentItemRenderer contentItemId={id} contentItem={item} />
      </div>
    </CourseLearnShell>
  )
}
