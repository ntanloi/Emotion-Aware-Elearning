import React, { useEffect, useState } from 'react'
import * as adminApi from '@admin/api/admin.js'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  Flag,
  Eye,
  X,
} from 'lucide-react'

import { useAuthStore } from '@auth/store/authStore.js'
import { formatVnDate, formatVnDateTime, formatVnTime } from '@shared/utils/dateTime.js'
const ACTION_MAP = {
  CREATE_MODERATOR: { label: 'Tạo kiểm duyệt viên', bg: 'rgba(126, 34, 206, 0.12)', text: '#7e22ce', icon: Shield },
  APPROVE_COURSE: { label: 'Phê duyệt khóa học', bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', icon: CheckCircle2 },
  REJECT_COURSE: { label: 'Từ chối khóa học', bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', icon: XCircle },
  SUSPEND_COURSE: { label: 'Tạm gỡ khóa học', bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', icon: AlertTriangle },
  RESTORE_COURSE: { label: 'Khôi phục khóa học', bg: 'rgba(37, 99, 235, 0.12)', text: '#1d4ed8', icon: RotateCcw },
  CHANGE_USER_STATUS: { label: 'Đổi trạng thái tài khoản', bg: 'rgba(126, 34, 206, 0.12)', text: '#7e22ce', icon: Shield },
  AI_REAUDIT_COURSE: { label: 'Chạy lại kiểm tra AI', bg: 'rgba(37, 99, 235, 0.12)', text: '#2563eb', icon: Sparkles },
  RESOLVE_REVIEW_REPORT: { label: 'Xử lý báo cáo', bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', icon: Flag },
  HIDE_REVIEW: { label: 'Ẩn đánh giá', bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', icon: Eye },
  RESTORE_REVIEW: { label: 'Hiện lại đánh giá', bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', icon: Eye },
  HIDE_REVIEW_IMAGE: { label: 'Ẩn ảnh đánh giá', bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', icon: Eye },
  RESTORE_REVIEW_IMAGE: { label: 'Hiện lại ảnh đánh giá', bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', icon: Eye },
}

const parseDetailJson = (raw) => {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch (e) {}
  return null
}

function formatAuditSentence(log, detailObj) {
  const actorName = log.actor?.fullName || 'Hệ thống'
  const rawId = log.targetId || ''
  const shortId = rawId.length > 12 ? `${rawId.slice(0, 8)}…` : rawId
  const idBadge = rawId ? (
    <code className="audit-id-tag" title={`ID đối tượng: ${rawId}`}>
      #{shortId}
    </code>
  ) : null

  switch (log.action) {
    case 'APPROVE_COURSE':
      return (
        <span>
          <strong>{actorName}</strong> đã phê duyệt xuất bản khóa học {idBadge}
        </span>
      )
    case 'REJECT_COURSE':
      return (
        <span>
          <strong>{actorName}</strong> đã từ chối khóa học {idBadge}
          {detailObj?.note && <span style={{ color: 'var(--c-danger, #dc2626)' }}> — "{detailObj.note}"</span>}
        </span>
      )
    case 'SUSPEND_COURSE':
      return (
        <span>
          <strong>{actorName}</strong> đã tạm gỡ khóa học {idBadge}
          {detailObj?.reason && <span style={{ color: 'var(--c-warning, #b45309)' }}> (Lý do: {detailObj.reason})</span>}
        </span>
      )
    case 'RESTORE_COURSE':
      return (
        <span>
          <strong>{actorName}</strong> đã khôi phục hiển thị khóa học {idBadge}
        </span>
      )
    case 'CHANGE_USER_STATUS': {
      const isLock = detailObj?.newStatus === 'LOCKED'
      return (
        <span>
          <strong>{actorName}</strong> đã {isLock ? 'khóa' : 'mở khóa'} tài khoản người dùng {idBadge}
        </span>
      )
    }
    case 'APPROVE_TEACHER':
      return (
        <span>
          <strong>{actorName}</strong> đã phê duyệt quyền giảng viên cho tài khoản {idBadge}
        </span>
      )
    case 'REJECT_TEACHER':
      return (
        <span>
          <strong>{actorName}</strong> đã từ chối quyền giảng viên cho tài khoản {idBadge}
          {detailObj?.reason && <span style={{ color: 'var(--c-danger, #dc2626)' }}> (Lý do: {detailObj.reason})</span>}
        </span>
      )
    case 'AI_REAUDIT_COURSE':
      return (
        <span>
          <strong>{actorName}</strong> đã yêu cầu quét lại tự động & AI cho khóa học {idBadge}
        </span>
      )
    case 'RESOLVE_REVIEW_REPORT': {
      const actionName = detailObj?.action === 'DISMISS' ? 'bác bỏ' : 'xử lý ẩn vi phạm'
      return (
        <span>
          <strong>{actorName}</strong> đã {actionName} báo cáo {idBadge}
        </span>
      )
    }
    case 'HIDE_REVIEW':
      return (
        <span>
          <strong>{actorName}</strong> đã ẩn đánh giá {idBadge}
        </span>
      )
    case 'RESTORE_REVIEW':
      return (
        <span>
          <strong>{actorName}</strong> đã khôi phục hiển thị đánh giá {idBadge}
        </span>
      )
    case 'HIDE_REVIEW_IMAGE':
      return (
        <span>
          <strong>{actorName}</strong> đã ẩn hình ảnh trong đánh giá {idBadge}
        </span>
      )
    case 'RESTORE_REVIEW_IMAGE':
      return (
        <span>
          <strong>{actorName}</strong> đã khôi phục hình ảnh trong đánh giá {idBadge}
        </span>
      )
    default:
      return (
        <span>
          <strong>{actorName}</strong> đã thực hiện {log.action} trên {log.targetType || 'đối tượng'} {idBadge}
        </span>
      )
  }
}

export default function AdminAuditLogPage() {
  const isAdmin = useAuthStore((st) => st.user?.role) === 'ADMIN'
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Bộ lọc
  const [actionFilter, setActionFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Phân trang
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Modal xem chi tiết
  const [detailModal, setDetailModal] = useState({ open: false, log: null })

  // Debounce tìm kiếm 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getAuditLogs({
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        q: debouncedSearch || undefined,
        page,
        size: 20,
      })
      setLogs(data.content || [])
      setTotalPages(data.totalPages || 1)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error('Lỗi nạp nhật ký kiểm toán:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [actionFilter, targetTypeFilter, debouncedSearch, page])

  return (
    <div className="admin-audit-log-page" style={{ paddingBottom: 40 }}>
      {/* 1. Header chuẩn hóa */}
      <AdminPageHeader
        title={isAdmin ? 'Nhật ký' : 'Nhật ký hoạt động của tôi'}
        badge={
          totalElements > 0 ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--accent, #6366f1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              {totalElements} bản ghi
            </span>
          ) : null
        }
      />

      {/* 2. Thanh lọc & tìm kiếm */}
      <div className="admin-filter-bar mb-16" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: 260 }}>
          <Search size={15} style={{ color: 'var(--c-muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên/email admin, ID đối tượng hoặc chi tiết..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="filter-select-wrap" style={{ display: 'flex', gap: 10 }}>
          <select
            className="admin-select"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Tất cả hành động</option>
            <option value="APPROVE_COURSE">Phê duyệt khóa học</option>
            <option value="REJECT_COURSE">Từ chối khóa học</option>
            <option value="SUSPEND_COURSE">Tạm gỡ khóa học</option>
            <option value="RESTORE_COURSE">Khôi phục khóa học</option>
            <option value="CHANGE_USER_STATUS">Đổi trạng thái tài khoản</option>
            <option value="AI_REAUDIT_COURSE">Chạy lại kiểm tra AI</option>
            <option value="RESOLVE_REVIEW_REPORT">Xử lý báo cáo đánh giá</option>
            <option value="HIDE_REVIEW">Ẩn đánh giá học viên</option>
            <option value="RESTORE_REVIEW">Hiện lại đánh giá</option>
          </select>

          <select
            className="admin-select"
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Tất cả đối tượng</option>
            <option value="COURSE">Khóa học (COURSE)</option>
            <option value="USER">Người dùng (USER)</option>
            <option value="REVIEW">Đánh giá (REVIEW)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-24 text-center" style={{ color: 'var(--c-muted, #64748b)', padding: 48 }}>
          Đang tải nhật ký kiểm toán...
        </div>
      ) : logs.length === 0 ? (
        <div
          className="p-24 text-center"
          style={{
            background: 'var(--surface, #fff)',
            borderRadius: 8,
            border: '1px solid var(--c-border, #e2e8f0)',
            color: 'var(--c-muted, #64748b)',
            padding: 48,
          }}
        >
          Không có bản ghi nhật ký kiểm toán nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div
          className="admin-table-wrap admin-table-wrap-cards"
          style={{
            background: 'var(--surface, #fff)',
            borderRadius: 8,
            border: '1px solid var(--c-border, #e2e8f0)',
            overflowX: 'auto',
          }}
        >
          <table className="admin-table admin-table-card-mobile" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'var(--surface-2, #f8fafc)',
                  borderBottom: '1px solid var(--c-border, #e2e8f0)',
                  textAlign: 'left',
                  fontSize: 13,
                  color: 'var(--text-dim, #475569)',
                }}
              >
                <th style={{ padding: '13px 18px', minWidth: 280 }}>Hành động & Diễn giải</th>
                <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Loại thao tác</th>
                <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Đối tượng</th>
                <th style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>Thời gian</th>
                <th style={{ padding: '13px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actionMeta = ACTION_MAP[log.action] || {
                  label: log.action,
                  bg: 'var(--surface-2, #f1f5f9)',
                  text: 'var(--text-dim, #475569)',
                  icon: Info,
                }
                const ActionIcon = actionMeta.icon
                const detailObj = parseDetailJson(log.detail)
                const sentence = formatAuditSentence(log, detailObj)

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--c-border, #f1f5f9)', fontSize: 13 }}>
                    <td data-label="Hành động & Diễn giải" style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: 13.5, color: '#0f172a', lineHeight: 1.5 }}>
                        {sentence}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                        Người thực hiện: <strong>{log.actor?.fullName || 'Hệ thống'}</strong> ({log.actor?.email || 'system'})
                      </div>
                    </td>

                    <td data-label="Loại thao tác" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: actionMeta.bg,
                          color: actionMeta.text,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ActionIcon size={13} />
                        <span>{actionMeta.label}</span>
                      </span>
                    </td>

                    <td data-label="Đối tượng" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            display: 'inline-block',
                            marginBottom: 3,
                          }}
                        >
                          {log.targetType}
                        </span>
                        <code className="audit-id-tag" title={`ID: ${log.targetId}`}>
                          #{log.targetId?.slice(0, 8)}…
                        </code>
                      </div>
                    </td>

                    <td data-label="Thời gian" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>
                          {formatVnTime(log.createdAt, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {formatVnDate(log.createdAt)}
                        </div>
                      </div>
                    </td>

                    <td data-label="Chi tiết" style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn secondary sm"
                        style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6 }}
                        onClick={() => setDetailModal({ open: true, log })}
                        title="Xem toàn bộ thông tin bản ghi"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Thanh phân trang */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--c-muted, #64748b)' }}>
            Trang {page + 1} / {totalPages} (Tổng số {totalElements} bản ghi kiểm toán)
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn secondary sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              type="button"
              className="btn secondary sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal chi tiết bản ghi Audit Log */}
      {detailModal.open && detailModal.log && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setDetailModal({ open: false, log: null })}
        >
          <div
            style={{
              background: 'var(--surface, #fff)',
              borderRadius: 10,
              maxWidth: 580,
              width: '100%',
              padding: 24,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              border: '1px solid var(--c-border, #e2e8f0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                borderBottom: '1px solid var(--c-border, #e2e8f0)',
                paddingBottom: 12,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                Chi tiết bản ghi kiểm toán
              </h4>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setDetailModal({ open: false, log: null })}
                aria-label="Đóng chi tiết"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, marginBottom: 16 }}>
              <div>
                <strong>Hành động:</strong> {detailModal.log.action}
              </div>
              <div>
                <strong>Người thực hiện:</strong> {detailModal.log.actor?.fullName} ({detailModal.log.actor?.email})
              </div>
              <div>
                <strong>Đối tượng:</strong> {detailModal.log.targetType} (ID: <code>{detailModal.log.targetId}</code>)
              </div>
              <div>
                <strong>IP Client:</strong> <code>{detailModal.log.ip || '127.0.0.1'}</code>
              </div>
              <div>
                <strong>Thời gian:</strong> {formatVnDateTime(detailModal.log.createdAt)}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 12, color: 'var(--text-dim, #475569)' }}>Dữ liệu chi tiết (Detail JSON):</strong>
              <pre
                style={{
                  background: 'var(--surface-2, #f8fafc)',
                  border: '1px solid var(--c-border, #e2e8f0)',
                  borderRadius: 6,
                  padding: 12,
                  fontSize: 12,
                  marginTop: 6,
                  maxHeight: 220,
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                }}
              >
                {(() => {
                  try {
                    return JSON.stringify(
                      typeof detailModal.log.detail === 'string'
                        ? JSON.parse(detailModal.log.detail || '{}')
                        : detailModal.log.detail || {},
                      null,
                      2
                    )
                  } catch (e) {
                    return detailModal.log.detail || '—'
                  }
                })()}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
