import { useParams, useSearchParams, Link } from 'react-router-dom'
import CourseLearnShell from '@shared/components/CourseLearnShell.jsx'
import { useContentTree } from '@shared/hooks/useContentSection.js'
import { useCourse } from '@shared/hooks/useCourses.js'
import { useCustomSections } from '@shared/hooks/useCustomSections.js'

const SECTION_LABEL = {
  VOCAB: 'Từ vựng TOEIC',
  GRAMMAR: 'Ngữ pháp TOEIC',
  PART1: 'Part 1 - Photographs',
  PART2: 'Part 2 - Question-Response',
  PART3: 'Part 3 - Conversations',
  PART4: 'Part 4 - Talks',
  PART5: 'Part 5 - Incomplete Sentences',
  PART6: 'Part 6 - Text Completion',
  PART7: 'Part 7 - Reading Comprehension',
  DICTATION: 'Luyện nghe chép chính tả',
}

const SECTION_ICON = {
  VOCAB: '📚',
  GRAMMAR: '📖',
  PART1: '🎧',
  PART2: '💬',
  PART3: '🗣️',
  PART4: '📻',
  PART5: '📝',
  PART6: '📄',
  PART7: '📖',
  DICTATION: '✍️',
}

const TYPE_ICON = {
  VIDEO_LECTURE: '▶️',
  VOCAB_SET: '🗂️',
  GRAMMAR_ARTICLE: '📖',
  PRACTICE_TEST: '✏️',
  DICTATION_SET: '🎧',
}

/**
 * MyLearningPage - Trang học chính.
 * Hiển thị TRỰC TIẾP các Nhóm hoạt động (vd "List 1", "Danh từ") và hoạt động con của mục
 * sidebar đang chọn — không còn đi qua tầng "Đơn vị" trung gian như trước (đã gỡ bỏ Unit vì
 * chỉ làm dư 1 cú bấm mà không mang lại giá trị gì, xem bố cục tham khảo study4.com).
 * Hỗ trợ cả 10 mục cố định lẫn các mục tùy chỉnh (CUSTOM_{id}) do giáo viên tạo.
 */
export default function MyLearningPage() {
  const { courseId } = useParams()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section') || 'VOCAB'
  const { data: course } = useCourse(courseId)
  const { data: customSections = [] } = useCustomSections(courseId)
  const { data: tree, isLoading } = useContentTree(courseId, section)

  // Resolve label/icon: dùng map tĩnh cho 10 mục cố định, lookup dynamic cho CUSTOM_*
  const sectionMeta = section.startsWith('CUSTOM_')
    ? customSections.find((s) => s.sectionCode === section)
    : null
  const sectionLabel = sectionMeta?.title ?? SECTION_LABEL[section] ?? section
  const sectionIcon  = sectionMeta?.icon  ?? SECTION_ICON[section]  ?? '📝'

  const groups = tree?.groups || []
  const ungroupedItems = tree?.ungroupedItems || []
  const isEmpty = groups.every((g) => (g.items || []).length === 0) && ungroupedItems.length === 0

  return (
    <CourseLearnShell activeSection={section}>
      <div>
        <div className="flex-row" style={{ gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 32 }}>{sectionIcon}</span>
          <div>
            <h2 style={{ margin: 0 }}>{course?.title || 'Khóa học của tôi'}</h2>
            <p className="text-dim" style={{ margin: '4px 0 0' }}>{sectionLabel}</p>
          </div>
        </div>

        {isLoading && <p className="text-dim">Đang tải...</p>}
        {!isLoading && isEmpty && (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Mục này chưa có hoạt động nào.</p>
          </div>
        )}

        <div className="stack-list mt-16">
          {groups.map((group) => (
            <div key={group.id} className="card content-group">
              <h3 className="content-group-title">{group.title}</h3>
              <div className="stack-list-inner">
                {(group.items || []).map((item) => (
                  <ActivityRow key={item.id} item={item} section={section} courseId={courseId} />
                ))}
              </div>
            </div>
          ))}

          {ungroupedItems.length > 0 && (
            <div className="card content-group">
              <div className="stack-list-inner">
                {ungroupedItems.map((item) => (
                  <ActivityRow key={item.id} item={item} section={section} courseId={courseId} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CourseLearnShell>
  )
}

function ActivityRow({ item, section, courseId }) {
  const icon = TYPE_ICON[item.type] || '📄'
  const colonIdx = item.title.indexOf(':')
  const boldPart = colonIdx === -1 ? item.title : item.title.slice(0, colonIdx + 1)
  const restPart = colonIdx === -1 ? '' : item.title.slice(colonIdx + 1)

  return (
    <Link
      className="activity-row hoverable"
      to={`/content-items/${item.id}?section=${section}&courseId=${courseId}`}
    >
      <span className="activity-row-icon">{icon}</span>
      <span className="activity-row-title">
        <strong>{boldPart}</strong>{restPart}
      </span>
    </Link>
  )
}
