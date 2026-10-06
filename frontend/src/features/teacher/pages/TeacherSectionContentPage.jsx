import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import TeacherCourseShell from '@teacher/components/TeacherCourseShell.jsx'
import AddCardTrigger from '@teacher/components/AddCardTrigger.jsx'
import SortableActivityRow from '@teacher/components/SortableActivityRow.jsx'
import ConfirmDeleteModal from '@teacher/components/ConfirmDeleteModal.jsx'
import ContentGroupModal from '@teacher/components/modals/ContentGroupModal.jsx'
import ContentItemTypeModal from '@teacher/components/modals/ContentItemTypeModal.jsx'
import { useContentTree } from '@shared/hooks/useContentSection.js'
import { useCourse } from '@shared/hooks/useCourses.js'
import { useCustomSections } from '@shared/hooks/useCustomSections.js'
import { useDeleteContentGroup } from '@teacher/hooks/useTeacherContentGroups.js'
import { useDeleteContentItem, useReorderContentItems } from '@teacher/hooks/useTeacherContentItems.js'

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
  VOCAB: '📚', GRAMMAR: '📖', PART1: '🎧', PART2: '💬', PART3: '🗣️',
  PART4: '📻', PART5: '📝', PART6: '📄', PART7: '📖', DICTATION: '✍️',
}

/**
 * TeacherSectionContentPage — bản gộp của TeacherUnitListPage + TeacherUnitContentPage cũ.
 * Trước đây bấm 1 mục sidebar phải đi qua danh sách "Đơn vị" (Unit) rồi mới vào được Nhóm
 * hoạt động/hoạt động; tầng Unit đó chỉ làm dư 1 cú bấm mà không mang lại giá trị gì (giáo
 * viên vẫn phải tạo Nhóm hoạt động bên trong Đơn vị mới soạn được nội dung thật). Trang này
 * bấm 1 mục sidebar là vào THẲNG danh sách Nhóm hoạt động + hoạt động con — giống bố cục
 * study4.com và giống hệt những gì MyLearningPage phía học viên hiển thị.
 */
export default function TeacherSectionContentPage() {
  const { courseId } = useParams()
  const [searchParams] = useSearchParams()
  const section = searchParams.get('section') || 'VOCAB'
  const navigate = useNavigate()

  const { data: course } = useCourse(courseId)
  const { data: customSections = [] } = useCustomSections(courseId)
  const { data: tree, isLoading } = useContentTree(courseId, section)

  const sectionMeta = section.startsWith('CUSTOM_')
    ? customSections.find((s) => s.sectionCode === section)
    : null
  const sectionLabel = sectionMeta?.title ?? SECTION_LABEL[section] ?? section
  const sectionIcon  = sectionMeta?.icon  ?? SECTION_ICON[section]  ?? '📝'

  const groups = tree?.groups || []
  const ungroupedItems = tree?.ungroupedItems || []
  const isEmpty = groups.every((g) => (g.items || []).length === 0) && ungroupedItems.length === 0

  const deleteGroup = useDeleteContentGroup(courseId, section)
  const deleteItem = useDeleteContentItem(courseId, section)
  const reorderItems = useReorderContentItems(courseId, section)

  // distance: 5 -> tránh vô tình kích hoạt kéo-thả chỉ vì rung tay khi bấm (dù tay cầm ⠿ đã
  // tách riêng khỏi phần click-để-sửa của hàng, vẫn nên có ngưỡng nhỏ cho mượt).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // groupId = null nghĩa là đang sắp xếp trong danh sách "hoạt động lẻ" (ungroupedItems)
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

  const openAddGroup = () => setGroupModal({ open: true, group: null })
  const openEditGroup = (group) => setGroupModal({ open: true, group })
  const openAddItem = (groupId) => setItemModal({ open: true, groupId })

  return (
    <TeacherCourseShell activeSection={section} courseId={courseId}>
      <div className="flex-row" style={{ gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>{sectionIcon}</span>
        <div>
          <h2 style={{ margin: 0 }}>{course?.title || 'Khoá học'}</h2>
          <p className="text-dim" style={{ margin: '4px 0 0' }}>{sectionLabel}</p>
        </div>
      </div>

      {isLoading && <p className="text-dim">Đang tải...</p>}
      {!isLoading && isEmpty && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>Mục này chưa có hoạt động nào. Bắt đầu bằng cách thêm Nhóm hoạt động bên dưới.</p>
        </div>
      )}

      <div className="stack-list mt-16">
        {groups.map((group) => (
          <div key={group.id} className="card content-group">
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <h3 className="content-group-title" style={{ margin: 0 }}>{group.title}</h3>
              <div className="flex-row" style={{ gap: 4 }}>
                <button type="button" className="icon-btn" onClick={() => openEditGroup(group)} title="Sửa tên Nhóm">✏️</button>
                <button type="button" className="icon-btn" onClick={() => setDeletingGroup(group)} title="Xoá Nhóm">🗑️</button>
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
    </TeacherCourseShell>
  )
}