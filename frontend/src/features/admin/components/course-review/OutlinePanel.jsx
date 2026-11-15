import React from 'react'
import {
  BookOpen,
  PlayCircle,
  FileText,
  Layers,
  Folder,
  HelpCircle,
  Headphones,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'

function getItemIcon(item) {
  if (item.hasVideo || item.type === 'VIDEO_LECTURE') {
    return <PlayCircle size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
  }
  if (item.type === 'PRACTICE_TEST') {
    return <HelpCircle size={14} style={{ color: '#16a34a', flexShrink: 0 }} />
  }
  if (item.type === 'GRAMMAR_ARTICLE') {
    return <FileText size={14} style={{ color: '#7c3aed', flexShrink: 0 }} />
  }
  if (item.type === 'VOCAB_SET') {
    return <Layers size={14} style={{ color: '#ea580c', flexShrink: 0 }} />
  }
  if (item.type === 'DICTATION_SET') {
    return <Headphones size={14} style={{ color: '#0d9488', flexShrink: 0 }} />
  }
  return <Layers size={14} style={{ color: '#64748b', flexShrink: 0 }} />
}

export default function OutlinePanel({
  previewData,
  selectedItem,
  onSelectItem,
  issueMap = {},
}) {
  return (
    <aside className="admin-workspace-col-left">
      <div className="workspace-col-header">
        <h4>Mục lục khóa học</h4>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: '#64748b',
            background: '#f1f5f9',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          {previewData?.totalItems || 0} bài • {previewData?.totalQuestions || 0} câu
        </span>
      </div>

      <div className="workspace-outline-scroll">
        <button
          type="button"
          className={`outline-overview-btn ${selectedItem === null ? 'active' : ''}`}
          onClick={() => onSelectItem(null)}
        >
          <BookOpen size={16} style={{ color: selectedItem === null ? '#0284c7' : '#64748b' }} />
          <span>Thông tin chung khóa học</span>
        </button>

        {previewData?.sections?.map((sec) => (
          <div key={sec.sectionCode} className="outline-section-block">
            <div className="outline-section-title">
              <span>{sec.title}</span>
            </div>

            {/* Groups */}
            {sec.groups?.map((g) => (
              <div key={g.id} style={{ marginBottom: 4 }}>
                <div className="outline-group-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Folder size={13} style={{ color: '#94a3b8' }} />
                  <span>{g.title}</span>
                </div>
                {g.items?.map((item) => {
                  const issueLevel = issueMap[item.id]
                  const isActive = selectedItem?.id === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`outline-item-btn ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectItem(item)}
                    >
                      <div className="outline-item-left">
                        {getItemIcon(item)}
                        <span className="outline-item-title" title={item.title}>
                          {item.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {item.questionCount > 0 && (
                          <span
                            style={{
                              fontSize: 10.5,
                              color: '#64748b',
                              background: '#f1f5f9',
                              padding: '1px 5px',
                              borderRadius: 4,
                              fontWeight: 500,
                            }}
                          >
                            {item.questionCount}c
                          </span>
                        )}
                        {issueLevel === 'ERROR' && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#b91c1c',
                              background: '#fee2e2',
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                            title="Có lỗi bắt buộc sửa"
                          >
                            Lỗi
                          </span>
                        )}
                        {issueLevel === 'WARNING' && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#b45309',
                              background: '#fef3c7',
                              padding: '1px 5px',
                              borderRadius: 4,
                            }}
                            title="Có cảnh báo"
                          >
                            Lưu ý
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}

            {/* Ungrouped items */}
            {sec.ungroupedItems?.map((item) => {
              const issueLevel = issueMap[item.id]
              const isActive = selectedItem?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`outline-item-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectItem(item)}
                >
                  <div className="outline-item-left">
                    {getItemIcon(item)}
                    <span className="outline-item-title" title={item.title}>
                      {item.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {item.questionCount > 0 && (
                      <span
                        style={{
                          fontSize: 10.5,
                          color: '#64748b',
                          background: '#f1f5f9',
                          padding: '1px 5px',
                          borderRadius: 4,
                          fontWeight: 500,
                        }}
                      >
                        {item.questionCount}c
                      </span>
                    )}
                    {issueLevel === 'ERROR' && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#b91c1c',
                          background: '#fee2e2',
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                        title="Có lỗi bắt buộc sửa"
                      >
                        Lỗi
                      </span>
                    )}
                    {issueLevel === 'WARNING' && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#b45309',
                          background: '#fef3c7',
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                        title="Có cảnh báo"
                      >
                        Lưu ý
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}
