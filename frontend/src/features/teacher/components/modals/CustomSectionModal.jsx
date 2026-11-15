import { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import { useCreateCustomSection, useUpdateCustomSection } from '@teacher/hooks/useCustomSections.js'
import { useCreateContentGroup } from '@teacher/hooks/useTeacherContentGroups.js'
import { ALL_STANDARD_SECTIONS } from '@shared/utils/courseSections.js'
import { SectionIcon } from '@shared/components/ui/AppIcons.jsx'
import { useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Layers,
  Sparkles,
  Pin,
  BookOpen,
  FileText,
  Target,
  Lightbulb,
  Bookmark,
  ClipboardList,
  Folder,
  Pencil,
  Puzzle,
  Star,
  BarChart3,
} from 'lucide-react'

// Icon gợi ý cho mục tùy chỉnh
const ICON_SUGGESTIONS = [
  { id: 'pin', label: 'Ghim', Icon: Pin },
  { id: 'book', label: 'Sách', Icon: BookOpen },
  { id: 'file-text', label: 'Tài liệu', Icon: FileText },
  { id: 'target', label: 'Mục tiêu', Icon: Target },
  { id: 'lightbulb', label: 'Ý tưởng', Icon: Lightbulb },
  { id: 'bookmark', label: 'Đánh dấu', Icon: Bookmark },
  { id: 'clipboard', label: 'Công việc', Icon: ClipboardList },
  { id: 'folder', label: 'Thư mục', Icon: Folder },
  { id: 'pencil', label: 'Ghi chép', Icon: Pencil },
  { id: 'puzzle', label: 'Mảnh ghép', Icon: Puzzle },
  { id: 'star', label: 'Nổi bật', Icon: Star },
  { id: 'bar-chart', label: 'Thống kê', Icon: BarChart3 },
]

/**
 * CustomSectionModal — thêm phần học TOEIC chuẩn hoặc tạo/sửa mục tùy chỉnh trong sidebar khóa học.
 * Props:
 *  - open, onClose
 *  - courseId: string
 *  - section: object | null  — null = tạo mới, có object = sửa mục tùy chỉnh
 *  - existingSectionCodes: string[] — danh sách các mã sectionCode đã có trên sidebar
 *  - onSelectSection: (sectionCode) => void — callback sau khi thêm phần TOEIC chuẩn
 */
export default function CustomSectionModal({
  open,
  courseId,
  section,
  existingSectionCodes = [],
  onSelectSection,
  onClose,
}) {
  const isEdit = Boolean(section)
  const qc = useQueryClient()

  // Tab: 'STANDARD' (Phần học TOEIC chuẩn) | 'CUSTOM' (Mục tùy chỉnh)
  const [tab, setTab] = useState('STANDARD')

  // State phần TOEIC chuẩn
  const [selectedStandardCode, setSelectedStandardCode] = useState(null)
  const [initialGroupTitle, setInitialGroupTitle] = useState('Nhóm hoạt động 1')

  // State mục tùy chỉnh
  const [customTitle, setCustomTitle] = useState('')
  const [customIcon, setCustomIcon] = useState('pin')

  const [error, setError] = useState(null)
  const [submittingStandard, setSubmittingStandard] = useState(false)

  const createCustom = useCreateCustomSection(courseId)
  const updateCustom = useUpdateCustomSection(courseId)
  const createGroup = useCreateContentGroup(courseId, selectedStandardCode || '')

  const saving = createCustom.isPending || updateCustom.isPending || submittingStandard

  useEffect(() => {
    if (!open) return
    setError(null)
    if (isEdit) {
      setTab('CUSTOM')
      setCustomTitle(section?.title || '')
      setCustomIcon(section?.icon || 'pin')
    } else {
      setTab('STANDARD')
      setSelectedStandardCode(null)
      setInitialGroupTitle('Nhóm hoạt động 1')
      setCustomTitle('')
      setCustomIcon('pin')
    }
  }, [open, section, isEdit])

  const existingSet = new Set((existingSectionCodes || []).map((c) => (c || '').toUpperCase()))

  // Xử lý thêm phần TOEIC chuẩn
  const handleAddStandard = async (e) => {
    e.preventDefault()
    if (!selectedStandardCode) {
      setError('Vui lòng chọn một phần học TOEIC bạn muốn thêm vào khóa học')
      return
    }
    setError(null)
    setSubmittingStandard(true)
    try {
      const groupTitle = initialGroupTitle.trim() || 'Nhóm hoạt động 1'
      await createGroup.mutateAsync(groupTitle)
      qc.invalidateQueries({ queryKey: ['course-sections', courseId] })
      qc.invalidateQueries({ queryKey: ['course-progress', courseId] })
      onSelectSection?.(selectedStandardCode)
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Có lỗi xảy ra khi tạo phần học')
    } finally {
      setSubmittingStandard(false)
    }
  }

  // Xử lý lưu mục tùy chỉnh
  const handleCustomSubmit = async (e) => {
    e.preventDefault()
    if (!customTitle.trim()) {
      setError('Vui lòng nhập tên mục nội dung')
      return
    }
    setError(null)
    try {
      if (isEdit) {
        await updateCustom.mutateAsync({ id: section.id, payload: { title: customTitle.trim(), icon: customIcon } })
      } else {
        const created = await createCustom.mutateAsync({ title: customTitle.trim(), icon: customIcon })
        qc.invalidateQueries({ queryKey: ['course-sections', courseId] })
        if (created?.sectionCode) {
          onSelectSection?.(created.sectionCode)
        }
      }
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại')
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Sửa mục nội dung' : 'Thêm nội dung khóa học'}
      onClose={onClose}
      width={tab === 'STANDARD' && !isEdit ? 560 : 460}
    >
      {/* Tab chuyển đổi khi tạo mới */}
      {!isEdit && (
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-2, #f3f4f6)',
            padding: 4,
            borderRadius: 8,
            marginBottom: 16,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => { setTab('STANDARD'); setError(null) }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: tab === 'STANDARD' ? '#fff' : 'transparent',
              color: tab === 'STANDARD' ? 'var(--accent, #0284c7)' : 'var(--text-dim, #64748b)',
              boxShadow: tab === 'STANDARD' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={14} />
            <span>Phần học TOEIC chuẩn</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('CUSTOM'); setError(null) }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: tab === 'CUSTOM' ? '#fff' : 'transparent',
              color: tab === 'CUSTOM' ? 'var(--accent, #0284c7)' : 'var(--text-dim, #64748b)',
              boxShadow: tab === 'CUSTOM' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={14} />
            <span>Mục tùy chỉnh</span>
          </button>
        </div>
      )}

      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      {/* NỘI DUNG TAB 1: PHẦN TOEIC CHUẨN */}
      {tab === 'STANDARD' && !isEdit && (
        <form onSubmit={handleAddStandard}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px 0' }}>
            Chọn phần học bạn muốn đưa vào khóa học:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              maxHeight: 280,
              overflowY: 'auto',
              paddingRight: 4,
              marginBottom: 16,
            }}
          >
            {ALL_STANDARD_SECTIONS.map((sec) => {
              const alreadyExists = existingSet.has(sec.code)
              const isSelected = selectedStandardCode === sec.code

              return (
                <div
                  key={sec.code}
                  onClick={() => {
                    if (!alreadyExists) setSelectedStandardCode(sec.code)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: isSelected
                      ? '2px solid var(--accent, #0284c7)'
                      : '1px solid var(--border, #e2e8f0)',
                    background: isSelected
                      ? 'rgba(2, 132, 199, 0.06)'
                      : alreadyExists
                      ? '#f8fafc'
                      : '#ffffff',
                    cursor: alreadyExists ? 'not-allowed' : 'pointer',
                    opacity: alreadyExists ? 0.6 : 1,
                    position: 'relative',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                >
                  <SectionIcon code={sec.code} size={18} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                      {sec.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        marginTop: 2,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={sec.desc}
                    >
                      {sec.desc}
                    </div>
                  </div>

                  {alreadyExists && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: '#64748b',
                        background: '#e2e8f0',
                        padding: '1px 6px',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    >
                      Đã có
                    </span>
                  )}

                  {isSelected && (
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'var(--accent, #0284c7)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedStandardCode && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tên nhóm hoạt động đầu tiên</label>
              <input
                type="text"
                value={initialGroupTitle}
                onChange={(e) => setInitialGroupTitle(e.target.value)}
                placeholder="VD: Nhóm hoạt động 1, Bài 1..."
              />
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: 12 }}>
            <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>
              Huỷ
            </button>
            <button
              type="submit"
              className="btn"
              disabled={!selectedStandardCode || saving}
              style={{ minWidth: 120 }}
            >
              {saving ? 'Đang thêm...' : 'Thêm vào khóa'}
            </button>
          </div>
        </form>
      )}

      {/* NỘI DUNG TAB 2: MỤC TÙY CHỈNH */}
      {(tab === 'CUSTOM' || isEdit) && (
        <form onSubmit={handleCustomSubmit}>
          <div className="field">
            <label>Biểu tượng mục</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 12 }}>
              {ICON_SUGGESTIONS.map(({ id, label, Icon }) => {
                const isSelected = customIcon === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCustomIcon(id)}
                    title={label}
                    aria-label={label}
                    style={{
                      height: 40,
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: isSelected ? '2px solid var(--accent, #2563eb)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent-soft, rgba(37, 99, 235, 0.08))' : 'var(--surface-1)',
                      color: isSelected ? 'var(--accent, #2563eb)' : 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="field">
            <label>Tên mục *</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="VD: Luyện đề thi thử, Bổ sung kiến thức..."
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>
              Huỷ
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo mục mới'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
