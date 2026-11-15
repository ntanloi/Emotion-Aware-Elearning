import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import TeacherCourseShell from '@teacher/components/TeacherCourseShell.jsx'
import AddCardTrigger from '@teacher/components/AddCardTrigger.jsx'
import SortableActivityRow from '@teacher/components/SortableActivityRow.jsx'
import ConfirmDeleteModal from '@teacher/components/ConfirmDeleteModal.jsx'
import ContentGroupModal from '@teacher/components/modals/ContentGroupModal.jsx'
import ContentItemTypeModal from '@teacher/components/modals/ContentItemTypeModal.jsx'
import CourseRejectDetailModal from '@teacher/components/modals/CourseRejectDetailModal.jsx'
import { useContentTree } from '@shared/hooks/useContentSection.js'
import { useCourse, useCourseSections } from '@shared/hooks/useCourses.js'
import { useCustomSections } from '@shared/hooks/useCustomSections.js'
import { getVisibleStandardSections, getDefaultSectionForProfile } from '@shared/utils/courseSections.js'
import { useDeleteContentGroup } from '@teacher/hooks/useTeacherContentGroups.js'
import { useDeleteContentItem, useReorderContentItems } from '@teacher/hooks/useTeacherContentItems.js'
import { SectionIcon } from '@shared/components/ui/AppIcons.jsx'
import { Inbox, Pencil, Trash2, Home, ChevronRight, AlertCircle, Plus, LayoutDashboard, ArrowLeft } from 'lucide-react'

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

export default function TeacherSectionContentPage() {
  const { courseId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { data: course } = useCourse(courseId)
  const { data: activeSectionCodes = [] } = useCourseSections(courseId)
  const { data: customSections = [] } = useCustomSections(courseId)

  const visibleStandard = getVisibleStandardSections(course?.profile, activeSectionCodes)
  const defaultSection = getDefaultSectionForProfile(course?.profile, visibleStandard)
  const rawSection = searchParams.get('section')
  const fromParam = searchParams.get('from')
  const isFromDashboard = fromParam === 'dashboard'

  // Nếu URL chưa có section hoặc section không hợp lệ với profile khóa học
  const section = rawSection || defaultSection

  // Tự động điều chỉnh URL nếu section hiện tại không thuộc danh sách hiển thị
  useEffect(() => {
    if (!rawSection && defaultSection) {
      const nextParams = { section: defaultSection }
      if (fromParam) nextParams.from = fromParam
      setSearchParams(nextParams, { replace: true })
    }
  }, [rawSection, defaultSection, fromParam, setSearchParams])

  const { data: tree, isLoading } = useContentTree(courseId, section)

  const sectionMeta = section.startsWith('CUSTOM_')
    ? customSections.find((s) => s.sectionCode === section)
    : null
  const sectionLabel = sectionMeta?.title ?? SECTION_LABEL[section] ?? section

  const groups = tree?.groups || []
  const ungroupedItems = tree?.ungroupedItems || []
  const isEmpty = groups.every((g) => (g.items || []).length === 0) && ungroupedItems.length === 0

  const isNoSectionCourse =
    (course?.profile || 'TOPIC').toUpperCase() === 'TOPIC' &&
    visibleStandard.length === 0 &&
    customSections.length === 0

  const deleteGroup = useDeleteContentGroup(courseId, section)
  const deleteItem = useDeleteContentItem(courseId, section)
  const reorderItems = useReorderContentItems(courseId, section)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (items, groupId) => (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((it) => it.id === active.id)
    const newIndex = items.findIndex((it) => it.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(items, oldIndex, newIndex)
    reorderItems.mutate({ groupId, orderedItemIds: newOrder.map((it) => it.id) })
  }

  // Modal state
  const [groupModal, setGroupModal] = useState({ open: false, group: null })
  const [itemModal, setItemModal] = useState({ open: false, groupId: null })
  const [deletingGroup, setDeletingGroup] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)

  const openAddGroup = () => setGroupModal({ open: true, group: null })
  const openEditGroup = (group) => setGroupModal({ open: true, group })
  const openAddItem = (groupId) => setItemModal({ open: true, groupId })

  return (
    <TeacherCourseShell activeSection={section} courseId={courseId}>
      {/* Thanh điều hướng đường dẫn phân cấp (Breadcrumbs Trail) cho Giảng viên */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        fontSize: 13,
        color: 'var(--text-dim)',
        padding: '10px 16px',
        background: 'var(--surface-1)',
        borderRadius: 10,
        border: '1px solid var(--border-subtle)',
        marginBottom: 20
      }}>
        {isFromDashboard ? (
          <Link
            to="/dashboard/teacher?tab=courses"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            title="Quay lại Dashboard Giảng viên — Tab Khóa học của tôi"
          >
            <LayoutDashboard size={14} />
            <span>Dashboard (Khóa học của tôi)</span>
          </Link>
        ) : (
          <Link
            to="/teacher/courses"
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
            title="Danh sách khóa học của tôi"
          >
            <Home size={15} />
            <span>Khóa học</span>
          </Link>
        )}

        <ChevronRight size={14} style={{ opacity: 0.5 }} />

        <Link
          to={`/teacher/courses/${courseId}/edit${isFromDashboard ? '?from=dashboard' : ''}`}
          style={{
            color: 'var(--text-dim)',
            textDecoration: 'none',
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
          title="Cài đặt khóa học"
        >
          {course?.title || 'Khoá học'}
        </Link>

        <ChevronRight size={14} style={{ opacity: 0.5 }} />

        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
          {isNoSectionCourse ? 'Bắt đầu tạo nội dung' : sectionLabel}
        </span>
      </div>

      <div className="flex-row" style={{ gap: 14, marginBottom: 24, alignItems: 'center' }}>
        <SectionIcon code={section} fallbackEmoji={sectionMeta?.icon} size={24} withBadge style={{ width: 44, height: 44, borderRadius: 10 }} />
        <div>
          <h2 style={{ margin: 0 }}>{course?.title || 'Khoá học'}</h2>
          <p className="text-dim" style={{ margin: '4px 0 0' }}>
            {isNoSectionCourse ? 'Khóa học chuyên đề / Linh hoạt' : sectionLabel}
          </p>
        </div>
      </div>

      {course?.status === 'PENDING_REVIEW' && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(234, 88, 12, 0.08)',
          border: '1px solid rgba(234, 88, 12, 0.3)',
          borderRadius: 8,
          color: '#c2410c',
          marginBottom: 20,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Khoá học đang chờ phê duyệt:</strong> Nội dung khoá học đang được khóa để Quản trị viên kiểm duyệt. Bạn không thể thêm, sửa hoặc xoá hoạt động lúc này. Nếu cần chỉnh sửa, vui lòng quay lại <Link to="/teacher/courses" style={{ color: '#c2410c', textDecoration: 'underline', fontWeight: 600 }}>Khóa học của tôi</Link> và bấm <strong>Rút lại</strong> để đưa khoá học về Bản nháp.
          </div>
        </div>
      )}

      {course?.status === 'REJECTED' && (
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(to right, #fef2f2, #fff1f2)',
          border: '1px solid #fecaca',
          borderRadius: 12,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.06)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0
            }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b' }}>
                Khóa học cần chỉnh sửa theo phản hồi từ Quản trị viên
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 2 }}>
                Sau khi sửa các lỗi theo yêu cầu, bạn có thể quay lại danh sách khóa học để gửi duyệt lại.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRejectModalOpen(true)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: '#dc2626',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
          >
            Xem chi tiết lý do từ chối
          </button>
        </div>
      )}

      {/* Trường hợp khóa học linh hoạt hoàn toàn mới, chưa thêm phần học nào */}
      {isNoSectionCourse ? (
        <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--surface-1)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <div className="icon" style={{ marginBottom: 12 }}>
            <Inbox size={32} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Khóa học chuyên đề chưa có phần học nào</h3>
          <p className="text-dim" style={{ maxWidth: 500, margin: '0 auto 16px', fontSize: 13.5, lineHeight: 1.5 }}>
            Khóa học linh hoạt cho phép bạn tự do chọn các phần cần dạy mà không bị áp cứng 10 mục. Hãy bấm nút <strong>"+ Thêm nội dung khóa học"</strong> ở thanh bên trái để chọn phần học đầu tiên (ví dụ Part 1, Part 5, hoặc Từ vựng).
          </p>
        </div>
      ) : (
        <>
          {isLoading && <p className="text-dim">Đang tải...</p>}
          {!isLoading && isEmpty && (
            <div className="empty-state">
              <div className="icon">
                <Inbox size={24} />
              </div>
              <p>Mục này chưa có hoạt động nào. Bắt đầu bằng cách thêm Nhóm hoạt động bên dưới.</p>
            </div>
          )}

          <div className="stack-list mt-16">
            {groups.map((group) => (
              <div key={group.id} className="card content-group">
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <h3 className="content-group-title" style={{ margin: 0 }}>{group.title}</h3>
                  <div className="flex-row" style={{ gap: 4 }}>
                    <button type="button" className="icon-btn" onClick={() => openEditGroup(group)} title="Sửa tên Nhóm">
                      <Pencil size={13} />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setDeletingGroup(group)} title="Xoá Nhóm">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="stack-list-inner">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(group.items || [], group.id)}>
                    <SortableContext items={(group.items || []).map((it) => it.id)} strategy={verticalListSortingStrategy}>
                      {(group.items || []).map((item) => (
                        <SortableActivityRow key={item.id} item={item} onDelete={setDeletingItem} />
                      ))}
                    </SortableContext>
                  </DndContext>

                  <AddCardTrigger compact label="Thêm nội dung" onClick={() => openAddItem(group.id)} />
                </div>
              </div>
            ))}

            {ungroupedItems.length > 0 && (
              <div className="card content-group">
                <div className="stack-list-inner">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(ungroupedItems, null)}>
                    <SortableContext items={ungroupedItems.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                      {ungroupedItems.map((item) => (
                        <SortableActivityRow key={item.id} item={item} onDelete={setDeletingItem} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}

            <AddCardTrigger label="Thêm nhóm hoạt động" onClick={openAddGroup} />
          </div>
        </>
      )}

      <ContentGroupModal
        open={groupModal.open}
        courseId={courseId}
        section={section}
        group={groupModal.group}
        onClose={() => setGroupModal({ open: false, group: null })}
      />

      <ContentItemTypeModal
        open={itemModal.open}
        courseId={courseId}
        groupId={itemModal.groupId}
        section={section}
        onClose={() => setItemModal({ open: false, groupId: null })}
        onCreated={(created) => navigate(`/teacher/content-items/${created.id}`)}
      />

      <ConfirmDeleteModal
        open={!!deletingGroup}
        title="Xoá Nhóm hoạt động"
        description={`Xoá "${deletingGroup?.title}"? Nếu Nhóm còn hoạt động bên trong, bạn cần xoá hết trước.`}
        onClose={() => setDeletingGroup(null)}
        onConfirm={() => deleteGroup.mutateAsync(deletingGroup.id)}
      />

      <ConfirmDeleteModal
        open={!!deletingItem}
        title="Xoá hoạt động"
        description={`Xoá "${deletingItem?.title}"? Toàn bộ nội dung/câu hỏi bên trong sẽ bị xoá vĩnh viễn.`}
        onClose={() => setDeletingItem(null)}
        onConfirm={() => deleteItem.mutateAsync(deletingItem.id)}
      />

      <CourseRejectDetailModal
        isOpen={rejectModalOpen}
        course={course}
        onClose={() => setRejectModalOpen(false)}
      />
    </TeacherCourseShell>
  )
}
