import React, { useState, useMemo } from 'react'
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Check,
  X,
  Wrench,
  ExternalLink,
  Eye,
  Lightbulb,
} from 'lucide-react'
import RiskBadge from '@admin/components/ui/RiskBadge.jsx'
import { RULE_NAMES } from '@teacher/utils/rejectReasonParser.js'

// Bổ sung các rule name thường gặp trong moderation
const EXTENDED_RULE_NAMES = {
  ...RULE_NAMES,
  'P1-01': 'Hình ảnh câu hỏi Part 1',
  'P1_01': 'Hình ảnh câu hỏi Part 1',
  'P2-01': 'File âm thanh câu hỏi Part 2',
  'P3-01': 'Audio đoạn hội thoại Part 3',
  'P4-01': 'Audio bài nói Part 4',
  'P5-01': 'Định dạng câu hỏi Part 5',
  'P6-01': 'Đoạn văn đọc hiểu Part 6',
  'P7-01': 'Đoạn văn đọc hiểu Part 7',
  'FORMAT': 'Định dạng chuẩn TOEIC',
  'STRUCTURE': 'Cấu trúc khóa học',
  'SYS-01': 'Kiểm tra hệ thống',
}

const PRESET_QUICK_NOTES = [
  'Bổ sung lời giải thích chi tiết cho câu hỏi',
  'Thời lượng video bài giảng chưa đạt chuẩn',
  'Bổ sung hình ảnh mô tả chuẩn Part 1',
  'Sửa lại nội dung bài học để tránh trùng lặp',
  'Kiểm tra lại đáp án đúng và các lựa chọn',
]

export default function AiReportPanel({
  moderationData,
  readinessData,
  aiReport,
  isModifiedAfterPublish,
  course,
  onJumpToIssue,
  onReAudit,
  reAuditing,
  onDecision,
  decidingIssueId,
}) {
  const [filterTab, setFilterTab] = useState('ALL') // ALL | ERROR | WARNING | UNDECIDED | NEED_FIX | READINESS
  const [activeNoteInputId, setActiveNoteInputId] = useState(null)
  const [noteText, setNoteText] = useState('')

  // Dữ liệu điều kiện gửi duyệt (Readiness)
  const readiness = useMemo(() => {
    if (readinessData) return readinessData
    if (moderationData?.readinessSnapshot) {
      try {
        return typeof moderationData.readinessSnapshot === 'string'
          ? JSON.parse(moderationData.readinessSnapshot)
          : moderationData.readinessSnapshot
      } catch (e) {
        return null
      }
    }
    return null
  }, [readinessData, moderationData])

  // Danh sách issues ưu tiên từ hệ thống mới (moderationData) hoặc fallback từ aiReport
  const issues = useMemo(() => {
    if (moderationData?.issues && moderationData.issues.length > 0) {
      return moderationData.issues
    }
    if (aiReport?.issues) {
      return aiReport.issues.map((i, idx) => ({
        id: `legacy-${idx}`,
        ruleId: i.checkType || 'FORMAT',
        category: i.section || 'CONTENT',
        severity: i.level || 'WARNING',
        message: i.message,
        suggestion: i.suggestion,
        targetId: i.targetId,
      }))
    }
    return []
  }, [moderationData, aiReport])

  // Lọc theo tab
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const sev = issue.severity?.toUpperCase()
      const dec = issue.decision?.decision?.toUpperCase()
      if (filterTab === 'ERROR') return sev === 'ERROR' || sev === 'BLOCKER'
      if (filterTab === 'WARNING') return sev === 'WARNING'
      if (filterTab === 'UNDECIDED') return (sev === 'ERROR' || sev === 'BLOCKER') && !dec
      if (filterTab === 'NEED_FIX') return dec === 'NEED_FIX'
      return true
    })
  }, [issues, filterTab])

  const riskLevel = moderationData?.riskLevel || aiReport?.riskLevel || 'LOW'
  const riskScore = moderationData?.riskScore ?? aiReport?.riskScore ?? 0
  const errorCount = moderationData?.errorCount ?? aiReport?.errorCount ?? 0
  const warningCount = moderationData?.warningCount ?? aiReport?.warningCount ?? 0
  const undecidedErrors = moderationData?.undecidedErrorCount ?? 0
  const needFixCount = moderationData?.needFixCount ?? 0

  const handleOpenNoteInput = (issueId, currentNote) => {
    setActiveNoteInputId(issueId)
    setNoteText(currentNote || '')
  }

  const handleConfirmDecision = (issueId, decisionType) => {
    if (onDecision) {
      onDecision(issueId, decisionType, noteText.trim())
    }
    setActiveNoteInputId(null)
    setNoteText('')
  }

  return (
    <div className="action-card" style={{ marginBottom: 0 }}>
      {/* Cảnh báo đã sửa sau duyệt */}
      {isModifiedAfterPublish && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--c-warning)',
            marginBottom: 12,
            padding: '10px 12px',
            background: 'var(--warn-soft)',
            borderRadius: 8,
            border: '1px solid var(--warn-border)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--c-warning)' }} />
          <div>
            <strong>Đã sửa sau duyệt:</strong> Giảng viên đã cập nhật nội dung vào{' '}
            {new Date(course.contentChangedAt).toLocaleString('vi-VN')} (sau lần duyệt ngày{' '}
            {new Date(course.reviewedAt).toLocaleString('vi-VN')}). Hãy kiểm tra kỹ các nội dung mới.
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'var(--info-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--info)',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              Kiểm duyệt chuẩn TOEIC & AI
            </h4>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RiskBadge level={riskLevel} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              background: riskScore >= 40 ? 'var(--bad-soft)' : 'var(--surface-2)',
              color: riskScore >= 40 ? 'var(--c-danger)' : 'var(--text-dim)',
              border: `1px solid ${riskScore >= 40 ? 'var(--bad-border)' : 'var(--border)'}`,
            }}
          >
            Điểm: {riskScore}
          </span>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 12,
          padding: 3,
          background: 'var(--surface-2)',
          borderRadius: 8,
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setFilterTab('ALL')}
          style={{
            border: 'none',
            background: filterTab === 'ALL' ? 'var(--surface)' : 'transparent',
            color: filterTab === 'ALL' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: filterTab === 'ALL' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            padding: '5px 9px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: filterTab === 'ALL' ? 700 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Tất cả ({issues.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('ERROR')}
          style={{
            border: 'none',
            background: filterTab === 'ERROR' ? 'var(--surface)' : 'transparent',
            color: errorCount > 0 ? 'var(--c-danger)' : filterTab === 'ERROR' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: filterTab === 'ERROR' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            padding: '5px 9px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: filterTab === 'ERROR' ? 700 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Lỗi ({errorCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('WARNING')}
          style={{
            border: 'none',
            background: filterTab === 'WARNING' ? 'var(--surface)' : 'transparent',
            color: warningCount > 0 ? 'var(--c-warning)' : filterTab === 'WARNING' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: filterTab === 'WARNING' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            padding: '5px 9px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: filterTab === 'WARNING' ? 700 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Lưu ý ({warningCount})
        </button>

        {undecidedErrors > 0 && (
          <button
            type="button"
            onClick={() => setFilterTab('UNDECIDED')}
            style={{
              border: 'none',
              background: filterTab === 'UNDECIDED' ? 'var(--c-danger)' : 'var(--bad-soft)',
              color: filterTab === 'UNDECIDED' ? 'var(--surface)' : 'var(--c-danger)',
              padding: '5px 9px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            Chưa duyệt ({undecidedErrors})
          </button>
        )}

        {needFixCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterTab('NEED_FIX')}
            style={{
              border: 'none',
              background: filterTab === 'NEED_FIX' ? 'var(--emotion-noface)' : 'var(--emotion-noface-soft)',
              color: filterTab === 'NEED_FIX' ? 'var(--surface)' : 'var(--emotion-noface)',
              padding: '5px 9px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            Cần sửa ({needFixCount})
          </button>
        )}

        <button
          type="button"
          onClick={() => setFilterTab('READINESS')}
          style={{
            border: 'none',
            background: filterTab === 'READINESS' ? 'var(--surface)' : 'transparent',
            color: filterTab === 'READINESS' ? 'var(--info)' : 'var(--text-muted)',
            boxShadow: filterTab === 'READINESS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            padding: '5px 9px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: filterTab === 'READINESS' ? 700 : 500,
            cursor: 'pointer',
            marginLeft: 'auto',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          Điều kiện
        </button>
      </div>

      {filterTab === 'READINESS' ? (
        <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
          {readiness?.sections && readiness.sections.length > 0 ? (
            readiness.sections.map((sec) => (
              <div
                key={sec.code}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ color: 'var(--text)', fontSize: 14 }}>{sec.label || sec.code}</strong>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: sec.status === 'MET' ? 'var(--good-soft)' : 'var(--bad-soft)',
                      color: sec.status === 'MET' ? 'var(--c-success)' : 'var(--c-danger)',
                      border: `1px solid ${sec.status === 'MET' ? 'var(--good-border)' : 'var(--bad-border)'}`,
                    }}
                  >
                    {sec.status === 'MET' ? 'ĐẠT' : 'CHƯA ĐẠT'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sec.requirements?.map((req) => (
                    <div
                      key={req.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '4px 0',
                        borderBottom: '1px dashed var(--surface-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {req.met ? (
                          <CheckCircle2 size={14} style={{ color: 'var(--c-success)', flexShrink: 0 }} />
                        ) : req.severity === 'BLOCKER' ? (
                          <XCircle size={14} style={{ color: 'var(--c-danger)', flexShrink: 0 }} />
                        ) : (
                          <AlertTriangle size={14} style={{ color: 'var(--c-warning)', flexShrink: 0 }} />
                        )}
                        <span style={{ color: req.met ? 'var(--text-dim)' : 'var(--c-danger)', fontSize: 12 }}>
                          {req.label}
                        </span>
                      </div>

                      <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {req.actual !== undefined && req.required !== undefined ? `${req.actual} / ${req.required}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              Chưa có dữ liệu điều kiện gửi duyệt của khóa học này.
            </div>
          )}
        </div>
      ) : (
        /* Danh sách Issues */
        <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredIssues.map((issue) => {
            const isError = issue.severity === 'ERROR' || issue.severity === 'BLOCKER'
            const isWarning = issue.severity === 'WARNING'
            const decision = issue.decision?.decision
            const isDeciding = decidingIssueId === issue.id
            const ruleName = EXTENDED_RULE_NAMES[issue.ruleId] || issue.ruleName || issue.ruleId

            return (
              <div
                key={issue.id}
                style={{
                  border: `1px solid ${isError ? 'var(--bad-border)' : isWarning ? 'var(--emotion-noface-border)' : 'var(--border)'}`,
                  background: 'var(--surface)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Header dòng issue */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: 'var(--surface-2)',
                        padding: '2px 7px',
                        borderRadius: 5,
                        fontWeight: 700,
                        fontSize: 10.5,
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {issue.ruleId}
                    </span>

                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                      {ruleName}
                    </span>

                    <span
                      style={{
                        background: isError ? 'var(--bad-soft)' : isWarning ? 'var(--warn-soft)' : 'var(--info-soft)',
                        color: isError ? 'var(--c-danger)' : isWarning ? 'var(--c-warning)' : 'var(--info)',
                        border: `1px solid ${isError ? 'var(--bad-border)' : isWarning ? 'var(--warn-border)' : 'var(--info-soft)'}`,
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 10,
                      }}
                    >
                      {issue.severity}
                    </span>

                    {issue.source && (
                      <span
                        style={{
                          background: issue.source === 'LLM' ? 'rgba(37, 99, 235, 0.08)' : issue.source === 'TOOL' ? 'var(--info-soft)' : 'var(--bg)',
                          color: issue.source === 'LLM' ? 'var(--accent)' : issue.source === 'TOOL' ? 'var(--info)' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          padding: '1px 5px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        {issue.source === 'LLM' ? 'AI' : issue.source === 'TOOL' ? 'CÔNG CỤ' : 'LUẬT'}
                      </span>
                    )}
                  </div>

                  {issue.targetId && (
                    <button
                      type="button"
                      onClick={() => onJumpToIssue(issue)}
                      title="Xem vị trí nội dung"
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--bg)',
                        color: 'var(--info)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        padding: '3px 7px',
                        borderRadius: 5,
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    >
                      <Eye size={12} />
                      <span>Xem</span>
                    </button>
                  )}
                </div>

                {/* Thông điệp lỗi */}
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.5, marginBottom: 4 }}>
                  {issue.message}
                </div>

                {/* Gợi ý xử lý */}
                {issue.suggestion && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--info)',
                      background: 'var(--info-soft)',
                      border: '1px solid var(--info-soft)',
                      borderRadius: 6,
                      padding: '5px 8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                      lineHeight: 1.4,
                      marginTop: 6,
                    }}
                  >
                    <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--info)' }} />
                    <div>{issue.suggestion}</div>
                  </div>
                )}

                {/* Trạng thái quyết định hiện tại & Các nút hành động */}
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px solid var(--surface-2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    {decision ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: decision === 'ACCEPT' ? 'var(--good-soft)' : decision === 'DISMISS' ? 'var(--surface-2)' : 'var(--emotion-noface-soft)',
                          color: decision === 'ACCEPT' ? 'var(--c-success)' : decision === 'DISMISS' ? 'var(--text-dim)' : 'var(--emotion-noface)',
                          border: `1px solid ${decision === 'ACCEPT' ? 'var(--good-border)' : decision === 'DISMISS' ? 'var(--border)' : 'var(--emotion-noface-border)'}`,
                        }}
                      >
                        {decision === 'ACCEPT' && <Check size={12} />}
                        {decision === 'DISMISS' && <X size={12} />}
                        {decision === 'NEED_FIX' && <Wrench size={12} />}
                        {decision === 'ACCEPT' ? 'CHẤP NHẬN NGOẠI LỆ' : decision === 'DISMISS' ? 'ĐÃ BỎ QUA' : 'YÊU CẦU SỬA'}
                      </span>
                    ) : isError ? (
                      <span style={{ fontSize: 12, color: 'var(--c-danger)', fontWeight: 600 }}>Chờ kiểm duyệt viên quyết định</span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa có quyết định</span>
                    )}

                    {issue.decision?.note && (
                      <div style={{ fontSize: 12, color: 'var(--emotion-noface)', marginTop: 3, fontStyle: 'italic' }}>
                        Yêu cầu: "{issue.decision.note}"
                      </div>
                    )}
                  </div>

                  {/* 3 Nút quyết định thẩm định */}
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      type="button"
                      disabled={isDeciding}
                      onClick={() => handleConfirmDecision(issue.id, 'ACCEPT')}
                      title="Chấp nhận ngoại lệ (Bỏ qua cảnh báo, không bắt buộc giảng viên phải sửa)"
                      style={{
                        border: `1px solid ${decision === 'ACCEPT' ? 'var(--c-success)' : 'var(--good-border)'}`,
                        background: decision === 'ACCEPT' ? 'var(--c-success)' : 'var(--good-soft)',
                        color: decision === 'ACCEPT' ? 'var(--surface)' : 'var(--c-success)',
                        padding: '4px 9px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Chấp nhận ngoại lệ
                    </button>

                    <button
                      type="button"
                      disabled={isDeciding}
                      onClick={() => handleConfirmDecision(issue.id, 'DISMISS')}
                      title="Bỏ qua cảnh báo này"
                      style={{
                        border: `1px solid ${decision === 'DISMISS' ? 'var(--text-muted)' : 'var(--border)'}`,
                        background: decision === 'DISMISS' ? 'var(--text-muted)' : 'var(--bg)',
                        color: decision === 'DISMISS' ? 'var(--surface)' : 'var(--text-dim)',
                        padding: '4px 9px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Bỏ qua
                    </button>

                    <button
                      type="button"
                      disabled={isDeciding}
                      onClick={() => handleOpenNoteInput(issue.id, issue.decision?.note)}
                      title="Yêu cầu giảng viên sửa nội dung này"
                      style={{
                        border: `1px solid ${decision === 'NEED_FIX' ? 'var(--emotion-noface)' : 'var(--emotion-noface-border)'}`,
                        background: decision === 'NEED_FIX' ? 'var(--emotion-noface)' : 'var(--emotion-noface-soft)',
                        color: decision === 'NEED_FIX' ? 'var(--surface)' : 'var(--emotion-noface)',
                        padding: '4px 9px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Yêu cầu sửa
                    </button>
                  </div>
                </div>

                {/* Form nhập ghi chú cho yêu cầu sửa */}
                {activeNoteInputId === issue.id && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: 'var(--emotion-noface-soft)',
                      borderRadius: 8,
                      border: '1px solid var(--emotion-noface-border)',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--emotion-noface)', marginBottom: 6 }}>
                      Ghi chú hướng dẫn giảng viên khắc phục:
                    </div>

                    {/* Preset chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {PRESET_QUICK_NOTES.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNoteText(preset)}
                          style={{
                            fontSize: 10.5,
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: 'var(--surface)',
                            border: '1px solid var(--emotion-noface-border)',
                            color: 'var(--emotion-noface)',
                            cursor: 'pointer',
                          }}
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Nhập ghi chú yêu cầu chi tiết..."
                      style={{
                        width: '100%',
                        fontSize: 12,
                        padding: '6px 8px',
                        border: '1px solid var(--emotion-noface-border)',
                        borderRadius: 6,
                        boxSizing: 'border-box',
                        marginBottom: 8,
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setActiveNoteInputId(null)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px 8px',
                        }}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDecision(issue.id, 'NEED_FIX')}
                        style={{
                          border: 'none',
                          background: 'var(--emotion-noface)',
                          color: 'var(--surface)',
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '5px 12px',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        Lưu yêu cầu sửa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {filteredIssues.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--c-success)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '24px 0',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Không có vấn đề nào trong danh mục này.</span>
            </div>
          )}
        </div>
      )}

      {/* Nút chạy lại kiểm tra tự động */}
      <button
        type="button"
        style={{
          width: '100%',
          marginTop: 12,
          padding: '8px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-dim)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: reAuditing ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        onClick={onReAudit}
        disabled={reAuditing}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface)')}
      >
        <RefreshCw size={13} className={reAuditing ? 'spin' : ''} />
        <span>{reAuditing ? 'Đang phân tích lại...' : 'Chạy lại toàn bộ kiểm tra'}</span>
      </button>
    </div>
  )
}
