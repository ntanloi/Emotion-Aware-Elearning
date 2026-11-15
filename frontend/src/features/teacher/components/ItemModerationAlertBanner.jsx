import { useState } from 'react'
import { parseRejectReason } from '@teacher/utils/rejectReasonParser.js'
import { auditContentItem } from '@teacher/api/moderation.js'
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react'

/**
 * ItemModerationAlertBanner — Hiển thị lỗi kiểm duyệt trực tiếp bên trong bài học đang chỉnh sửa,
 * và cung cấp nút "Thẩm định lại" để kiểm tra tức thì xem lỗi đã được khắc phục hay chưa.
 */
export default function ItemModerationAlertBanner({ item, course, focusRule }) {
  const [auditState, setAuditState] = useState({}) // { [ruleId]: { loading: boolean, result: { fixed, message, suggestion } } }

  if (!course || course.status !== 'REJECTED' || !course.rejectReason || !item) {
    return null
  }

  const parsed = parseRejectReason(course.rejectReason)
  const itemTitle = (item.title || '').trim().toLowerCase()

  // Lọc các vấn đề kiểm duyệt thuộc về bài học này
  const itemIssues = parsed.issues.filter((iss) => {
    if (focusRule && iss.ruleId === focusRule) return true
    if (iss.targetId && iss.targetId === item.id) return true

    // Kiểm tra tên bài học có trong thông báo (được bọc trong dấu nháy đơn '...')
    const quotedMatches = iss.message.match(/'([^']+)'/g)
    if (quotedMatches) {
      const titles = quotedMatches.map((m) => m.replace(/^'|'$/g, '').trim().toLowerCase())
      if (titles.includes(itemTitle)) return true
    }

    return false
  })

  if (itemIssues.length === 0) {
    return null
  }

  const handleAudit = async (ruleId) => {
    setAuditState((prev) => ({
      ...prev,
      [ruleId]: { loading: true, result: null },
    }))

    try {
      const res = await auditContentItem(item.id, ruleId)
      setAuditState((prev) => ({
        ...prev,
        [ruleId]: { loading: false, result: res },
      }))
    } catch (err) {
      setAuditState((prev) => ({
        ...prev,
        [ruleId]: {
          loading: false,
          result: {
            fixed: false,
            message: err.response?.data?.message || 'Không thể kết nối đến dịch vụ thẩm định.',
          },
        },
      }))
    }
  }

  return (
    <div
      style={{
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)',
          border: '1px solid #fecaca',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#991b1b' }}>
              Bài học này có {itemIssues.length} yêu cầu chỉnh sửa từ Quản trị viên
            </h4>
            <div style={{ fontSize: 12.5, color: '#7f1d1d', marginTop: 2 }}>
              Sau khi chỉnh sửa nội dung bài học, bạn có thể nhấn <strong>"Thẩm định lại"</strong> để hệ thống kiểm tra ngay lập tức.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {itemIssues.map((iss, idx) => {
            const state = auditState[iss.ruleId] || {}
            const isAuditing = state.loading
            const result = state.result
            const isFixed = result?.fixed

            return (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: isFixed ? '#f0fdf4' : '#ffffff',
                  border: `1px solid ${isFixed ? '#bbf7d0' : '#fed7aa'}`,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isFixed ? '#16a34a' : '#dc2626',
                        background: isFixed ? '#dcfce7' : '#fef2f2',
                        border: `1px solid ${isFixed ? '#bbf7d0' : '#fecaca'}`,
                        padding: '2px 7px',
                        borderRadius: 4,
                      }}
                    >
                      {iss.ruleId}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      {iss.ruleName}
                    </span>
                  </div>

                  {/* Nút Thẩm định lại */}
                  <button
                    type="button"
                    onClick={() => handleAudit(iss.ruleId)}
                    disabled={isAuditing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: isFixed ? '#16a34a' : '#0284c7',
                      background: isFixed ? '#dcfce7' : '#f0f9ff',
                      border: `1px solid ${isFixed ? '#86efac' : '#bae6fd'}`,
                      borderRadius: 6,
                      cursor: isAuditing ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Chạy kiểm duyệt tự động để kiểm tra xem lỗi này đã được sửa chưa"
                  >
                    <RefreshCw
                      size={13}
                      style={{
                        animation: isAuditing ? 'spin 1s linear infinite' : 'none',
                      }}
                    />
                    <span>{isAuditing ? 'Đang thẩm định...' : isFixed ? 'Kiểm tra lại' : 'Thẩm định lại lỗi này'}</span>
                  </button>
                </div>

                {/* Thông điệp lỗi hệ thống */}
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 6 }}>
                  {iss.message}
                </div>

                {/* Ghi chú yêu cầu của admin */}
                {iss.adminRequirement && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#92400e',
                      fontWeight: 500,
                      marginBottom: result ? 8 : 0,
                    }}
                  >
                    <Info size={13} style={{ flexShrink: 0 }} />
                    <span><strong>Yêu cầu từ Quản trị viên:</strong> {iss.adminRequirement}</span>
                  </div>
                )}

                {/* Kết quả thẩm định sau khi bấm nút */}
                {result && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isFixed ? '#dcfce7' : '#fee2e2',
                      border: `1px solid ${isFixed ? '#86efac' : '#fca5a5'}`,
                      color: isFixed ? '#15803d' : '#991b1b',
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    {isFixed ? (
                      <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1, color: '#16a34a' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: '#dc2626' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{result.message}</div>
                      {result.suggestion && !isFixed && (
                        <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>
                          Gợi ý khắc phục: {result.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
