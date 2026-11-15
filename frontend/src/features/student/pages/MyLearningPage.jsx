import { useParams, useSearchParams, Link } from 'react-router-dom'
import CourseLearnShell from '@shared/components/CourseLearnShell.jsx'
import { useContentTree } from '@shared/hooks/useContentSection.js'
import { useCourse } from '@shared/hooks/useCourses.js'
import { useCustomSections } from '@shared/hooks/useCustomSections.js'
import { useCourseProgress } from '@student/hooks/useCourseProgress.js'
import { SectionIcon, ActivityTypeIcon } from '@shared/components/ui/AppIcons.jsx'
import { Inbox, CheckCircle2, CircleDashed } from 'lucide-react'
import RewardProgressCard from '@student/components/RewardProgressCard.jsx'

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

/**
 * MyLearningPage - Trang học chính của học viên.
 * Hiển thị các Nhóm hoạt động cùng thanh tiến độ Level 1 chi tiết và trạng thái hoàn thành Level 0.
 */
export default function MyLearningPage() {
  const { courseId } = useParams()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section') || 'VOCAB'
  const { data: course } = useCourse(courseId)
  const { data: customSections = [] } = useCustomSections(courseId)
  const { data: tree, isLoading } = useContentTree(courseId, section)
  const { getGroupProgress, getItemProgress, getSectionProgress } = useCourseProgress(courseId)

  // Resolve label/icon: dùng map tĩnh cho 10 mục cố định, lookup dynamic cho CUSTOM_*
  const sectionMeta = section.startsWith('CUSTOM_')
    ? customSections.find((s) => s.sectionCode === section)
    : null
  const sectionLabel = sectionMeta?.title ?? SECTION_LABEL[section] ?? section
  const sectionProgress = getSectionProgress(section)

  const groups = tree?.groups || []
  const ungroupedItems = tree?.ungroupedItems || []
  const isEmpty = groups.every((g) => (g.items || []).length === 0) && ungroupedItems.length === 0

  return (
    <CourseLearnShell activeSection={section}>
      <div>
        {/* Banner tiêu đề mục kèm tiến độ Part/Section */}
        <div className="section-overview-banner">
          <div className="flex-row" style={{ gap: 14, alignItems: 'center' }}>
            <SectionIcon
              code={section}
              fallbackEmoji={sectionMeta?.icon}
              size={24}
              withBadge
              style={{ width: 48, height: 48, borderRadius: 12 }}
            />
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>{course?.title || 'Khóa học của tôi'}</h2>
              <div className="flex-row" style={{ gap: 8, alignItems: 'center', marginTop: 4 }}>
                <span className="text-dim" style={{ fontSize: 14, fontWeight: 500 }}>{sectionLabel}</span>
                {sectionProgress && !sectionProgress.isEmpty && (
                  <span className={`section-pill-tag ${sectionProgress.isCompleted ? 'done' : ''}`}>
                    {sectionProgress.isCompleted ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Hoàn thành mục
                      </span>
                    ) : `Tiến độ: ${Math.round(sectionProgress.progressPercent)}%`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thẻ tiến độ chương trình học thưởng 10% */}
        <RewardProgressCard courseId={courseId} />

        {isLoading && <p className="text-dim mt-16">Đang tải nội dung...</p>}
        {!isLoading && isEmpty && (
          <div className="empty-state">
            <div className="icon">
              <Inbox size={24} />
            </div>
            <p>Mục này chưa có hoạt động nào.</p>
          </div>
        )}

        <div className="stack-list mt-16">
          {groups.map((group) => {
            const grpProg = getGroupProgress(group.id)
            const childItems = group.items || []
            const groupPct = grpProg ? Math.round(grpProg.progressPercent) : 0
            const isCompleted = grpProg?.isCompleted || (childItems.length > 0 && groupPct >= 100)

            return (
              <div key={group.id} className="card content-group">
                {/* Header nhóm hoạt động có thanh tiến độ Level 1 */}
                <div className="content-group-header">
                  <div className="content-group-info">
                    <h3 className="content-group-title">{group.title}</h3>
                    {childItems.length > 0 && grpProg && (
                      <span className="content-group-sub">
                        {grpProg.completedItems}/{grpProg.totalItems} hoạt động hoàn thành
                      </span>
                    )}
                  </div>

                  {childItems.length > 0 && (
                    <div className="content-group-progress-box">
                      <div className="content-group-progress-track">
                        <div
                          className={`content-group-progress-fill ${isCompleted ? 'is-complete' : ''}`}
                          style={{ width: `${Math.min(100, Math.max(0, groupPct))}%` }}
                        />
                      </div>
                      <span className={`content-group-progress-num ${isCompleted ? 'is-complete' : ''}`}>
                        {groupPct}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="stack-list-inner">
                  {childItems.map((item) => (
                    <ActivityRow
                      key={item.id}
                      item={item}
                      section={section}
                      courseId={courseId}
                      itemProgress={getItemProgress(item.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {ungroupedItems.length > 0 && (
            <div className="card content-group">
              <div className="content-group-header">
                <h3 className="content-group-title">Các hoạt động khác</h3>
              </div>
              <div className="stack-list-inner">
                {ungroupedItems.map((item) => (
                  <ActivityRow
                    key={item.id}
                    item={item}
                    section={section}
                    courseId={courseId}
                    itemProgress={getItemProgress(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CourseLearnShell>
  )
}

function ActivityRow({ item, section, courseId, itemProgress }) {
  const colonIdx = item.title.indexOf(':')
  const boldPart = colonIdx === -1 ? item.title : item.title.slice(0, colonIdx + 1)
  const restPart = colonIdx === -1 ? '' : item.title.slice(colonIdx + 1)

  const isCompleted = itemProgress?.isCompleted || (itemProgress?.progressPercent >= 100)
  const pct = Math.round(itemProgress?.progressPercent || 0)

  let badgeContent = null
  if (isCompleted) {
    badgeContent = (
      <span className="activity-status-badge completed">
        <CheckCircle2 size={13} strokeWidth={2.5} />
        <span>Hoàn thành</span>
      </span>
    )
  } else if (pct > 0) {
    if (itemProgress?.totalQuestions > 0) {
      badgeContent = (
        <span className="activity-status-badge in-progress">
          <CircleDashed size={12} className="spin-slow" />
          <span>{itemProgress.answeredQuestions}/{itemProgress.totalQuestions} câu ({pct}%)</span>
        </span>
      )
    } else {
      badgeContent = (
        <span className="activity-status-badge in-progress">
          <span>{pct}%</span>
        </span>
      )
    }
  } else {
    badgeContent = (
      <span className="activity-status-badge not-started">
        <span>Chưa học</span>
      </span>
    )
  }

  return (
    <Link
      className={`activity-row hoverable ${isCompleted ? 'is-item-completed' : ''}`}
      to={`/content-items/${item.id}?section=${section}&courseId=${courseId}`}
    >
      <div className="activity-row-left">
        <span className="activity-row-icon">
          <ActivityTypeIcon type={item.type} size={15} withBadge />
        </span>
        <span className="activity-row-title">
          <strong>{boldPart}</strong>{restPart}
        </span>
      </div>

      <div className="activity-row-right">
        {badgeContent}
      </div>
    </Link>
  )
}
