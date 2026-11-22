import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as adminApi from '@admin/api/admin.js'
import AdminActionModal from '@admin/components/AdminActionModal.jsx'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import StatusBadge from '@admin/components/ui/StatusBadge.jsx'
import { useToast } from '@admin/context/AdminUIContext.jsx'
import { Search, CheckCircle2, XCircle, GraduationCap, Clock, ShieldCheck } from 'lucide-react'
import { formatVnDate } from '@shared/utils/dateTime.js'

/**
 * Duyệt hồ sơ giảng viên (PENDING_APPROVAL) - dành cho Kiểm duyệt viên.
 * Giao diện đồng bộ với trang Người dùng: thanh tìm kiếm, bảng có avatar, huy hiệu trạng thái.
 */

/** Thời gian đã chờ duyệt, kèm mức độ khẩn để tô màu. */
const waitingInfo = (createdAt) => {
  if (!createdAt) return { text: '—', level: 'none' }
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const hours = Math.max(0, Math.floor(diffMs / 3600000))
  if (hours < 1) return { text: 'Vừa đăng ký', level: 'new' }
  if (hours < 24) return { text: `${hours} giờ`, level: 'new' }
  const days = Math.floor(hours / 24)
  return { text: `${days} ngày`, level: days >= 3 ? 'urgent' : 'normal' }
}

const WAIT_COLORS = {
  none: { bg: 'transparent', text: 'var(--c-muted, #64748b)' },
  new: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669' },
  normal: { bg: 'rgba(245, 158, 11, 0.12)', text: '#b45309' },
  urgent: { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626' },
}

export default function AdminTeacherApprovalPage() {
  const toast = useToast()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState('oldest') // oldest = chờ lâu nhất trước
  const [approveState, setApproveState] = useState({ open: false, user: null })
  const [rejectState, setRejectState] = useState({ open: false, user: null })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await adminApi.getPendingTeachers()
      setTeachers(Array.isArray(data) ? data : data?.content ?? [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách hồ sơ giảng viên')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = teachers.filter(
      (t) => !q || t.fullName?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)
    )
    list.sort((a, b) => {
      const diff = new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      return sortOrder === 'oldest' ? diff : -diff
    })
    return list
  }, [teachers, search, sortOrder])

  const urgentCount = useMemo(
    () => teachers.filter((t) => waitingInfo(t.createdAt).level === 'urgent').length,
    [teachers]
  )

  const confirmApprove = async () => {
    const user = approveState.user
    if (!user) return
    try {
      setProcessing(true)
      await adminApi.approveTeacher(user.id)
      toast.success(`Đã phê duyệt giảng viên "${user.fullName}"`)
      setApproveState({ open: false, user: null })
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi phê duyệt giảng viên')
    } finally {
      setProcessing(false)
    }
  }

  const confirmReject = async (inputValue) => {
    const user = rejectState.user
    if (!user) return
    try {
      setProcessing(true)
      const reason = inputValue?.trim() || 'Hồ sơ chưa đáp ứng tiêu chí giảng viên'
      await adminApi.rejectTeacher(user.id, reason)
      toast.success(`Đã từ chối giảng viên "${user.fullName}". Tài khoản chuyển về Học viên.`)
      setRejectState({ open: false, user: null })
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối hồ sơ giảng viên')
    } finally {
      setProcessing(false)
    }
  }

  const cardStyle = {
    background: 'var(--surface, #fff)',
    borderRadius: 8,
    border: '1px solid var(--c-border, #e2e8f0)',
  }

  return (
    <div className="admin-teacher-approval-page">
      <AdminPageHeader
        title="Duyệt giảng viên"
        badge={
          teachers.length > 0 ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 12,
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#b45309',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {teachers.length} hồ sơ chờ duyệt
            </span>
          ) : null
        }
      />

      {/* Dải thông tin nhanh */}
      {teachers.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ ...cardStyle, flex: '1 1 220px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={19} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{teachers.length}</div>
              <div style={{ fontSize: 12, color: 'var(--c-muted, #64748b)' }}>Hồ sơ đang chờ duyệt</div>
            </div>
          </div>
          <div style={{ ...cardStyle, flex: '1 1 220px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: urgentCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: urgentCount > 0 ? '#dc2626' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={19} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>{urgentCount}</div>
              <div style={{ fontSize: 12, color: 'var(--c-muted, #64748b)' }}>Chờ từ 3 ngày trở lên</div>
            </div>
          </div>
        </div>
      )}

      {/* Bộ lọc & tìm kiếm */}
      <div className="admin-filter-bar mb-16" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: 260 }}>
          <Search size={15} style={{ color: 'var(--c-muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Tìm theo họ tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-select-wrap" style={{ display: 'flex', gap: 10 }}>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="oldest">Chờ lâu nhất trước</option>
            <option value="newest">Mới đăng ký trước</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ ...cardStyle, color: 'var(--c-muted, #64748b)', padding: 48, textAlign: 'center' }}>
          Đang tải danh sách hồ sơ giảng viên...
        </div>
      ) : teachers.length === 0 ? (
        <div style={{ ...cardStyle, padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={28} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Không còn hồ sơ nào chờ duyệt</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'var(--c-muted, #64748b)' }}>
            Hồ sơ giảng viên mới đăng ký sẽ xuất hiện tại đây.
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ ...cardStyle, color: 'var(--c-muted, #64748b)', padding: 48, textAlign: 'center' }}>
          Không tìm thấy hồ sơ nào phù hợp với "{search}".
        </div>
      ) : (
        <div className="admin-table-wrap admin-table-wrap-cards" style={{ ...cardStyle, overflowX: 'auto' }}>
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
                <th style={{ padding: '12px 14px' }}>Giảng viên</th>
                <th style={{ padding: '12px 14px' }}>Vai trò đăng ký</th>
                <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                <th style={{ padding: '12px 14px' }}>Đã chờ</th>
                <th style={{ padding: '12px 14px' }}>Ngày đăng ký</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const wait = waitingInfo(u.createdAt)
                const color = WAIT_COLORS[wait.level]
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--c-border, #f1f5f9)', fontSize: 13 }}>
                    <td data-label="Giảng viên" style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="admin-user-avatar">
                          {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'G'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text, #0f172a)' }}>{u.fullName}</div>
                          <div style={{ fontSize: 12, color: 'var(--c-muted, #64748b)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Vai trò đăng ký" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(3, 105, 161, 0.1)',
                          color: '#0369a1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <GraduationCap size={13} />
                        <span>Giảng viên</span>
                      </span>
                    </td>
                    <td data-label="Trạng thái" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={u.status || 'PENDING_APPROVAL'} />
                    </td>
                    <td data-label="Đã chờ" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: 12,
                          background: color.bg,
                          color: color.text,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Clock size={12} /> {wait.text}
                      </span>
                    </td>
                    <td data-label="Ngày đăng ký" style={{ padding: '14px 18px', whiteSpace: 'nowrap', color: 'var(--text-dim, #475569)' }}>
                      {u.createdAt ? formatVnDate(u.createdAt) : '—'}
                    </td>
                    <td data-label="Hành động" style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn primary sm"
                          style={{
                            padding: '5px 12px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'var(--c-success, #16a34a)',
                            borderColor: 'var(--c-success, #16a34a)',
                            color: '#fff',
                          }}
                          onClick={() => setApproveState({ open: true, user: u })}
                          disabled={processing}
                          title="Phê duyệt quyền giảng viên"
                        >
                          <CheckCircle2 size={13} /> Duyệt
                        </button>
                        <button
                          type="button"
                          className="btn secondary sm"
                          style={{
                            padding: '5px 12px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--c-danger, #dc2626)',
                            borderColor: 'rgba(220, 38, 38, 0.3)',
                          }}
                          onClick={() => setRejectState({ open: true, user: u })}
                          disabled={processing}
                          title="Từ chối (hạ về học viên)"
                        >
                          <XCircle size={13} /> Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminActionModal
        open={approveState.open}
        type="confirm"
        title="Phê duyệt giảng viên"
        message={`Phê duyệt "${approveState.user?.fullName}" (${approveState.user?.email}) làm giảng viên? Tài khoản sẽ chuyển sang trạng thái hoạt động và có thể tạo khóa học.`}
        confirmText="Xác nhận duyệt"
        confirmVariant="primary"
        loading={processing}
        onClose={() => setApproveState({ open: false, user: null })}
        onConfirm={confirmApprove}
      />

      <AdminActionModal
        open={rejectState.open}
        type="prompt"
        title="Từ chối phê duyệt giảng viên"
        message={`Từ chối quyền giảng viên của "${rejectState.user?.fullName}" (${rejectState.user?.email})? Tài khoản sẽ chuyển về vai trò Học viên.`}
        confirmText="Xác nhận từ chối"
        confirmVariant="danger"
        inputLabel="Lý do từ chối"
        inputPlaceholder="Nhập lý do từ chối hồ sơ giảng viên..."
        defaultValue="Hồ sơ giảng viên chưa đáp ứng đủ tiêu chuẩn chuyên môn"
        loading={processing}
        onClose={() => setRejectState({ open: false, user: null })}
        onConfirm={confirmReject}
      />
    </div>
  )
}
