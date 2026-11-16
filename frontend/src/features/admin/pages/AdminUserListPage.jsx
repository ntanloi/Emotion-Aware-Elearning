import React, { useEffect, useState } from 'react'
import * as adminApi from '@admin/api/admin.js'
import AdminActionModal from '@admin/components/AdminActionModal.jsx'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import StatusBadge from '@admin/components/ui/StatusBadge.jsx'
import { useToast } from '@admin/context/AdminUIContext.jsx'
import {
  Search,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

export default function AdminUserListPage() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Phân trang
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Modal hành động khóa/mở khóa
  const [modalState, setModalState] = useState({
    open: false,
    user: null,
    isLocking: true,
  })
  // Modal từ chối duyệt giảng viên
  const [rejectModalState, setRejectModalState] = useState({
    open: false,
    user: null,
  })
  const [actionProcessing, setActionProcessing] = useState(false)

  // Debounce ô tìm kiếm 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        q: debouncedSearch || undefined,
        page,
        size: 15,
      })
      setUsers(data.content || [])
      setTotalPages(data.totalPages || 1)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err)
      toast.error('Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter, statusFilter, debouncedSearch, page])

  const openToggleLockModal = (u) => {
    const isLocking = u.status !== 'LOCKED'
    setModalState({
      open: true,
      user: u,
      isLocking,
    })
  }

  const handleConfirmLockAction = async (inputValue) => {
    const { user, isLocking } = modalState
    if (!user) return

    try {
      setActionProcessing(true)
      const reason = isLocking
        ? (inputValue?.trim() || 'Vi phạm quy chuẩn hệ thống')
        : 'Được mở khóa bởi Quản trị viên'

      await adminApi.updateUserStatus(user.id, {
        status: isLocking ? 'LOCKED' : 'ACTIVE',
        reason,
      })
      toast.success(isLocking ? `Đã khóa tài khoản "${user.email}"` : `Đã mở khóa tài khoản "${user.email}"`)
      setModalState({ open: false, user: null, isLocking: true })
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái tài khoản')
    } finally {
      setActionProcessing(false)
    }
  }

  const handleApproveTeacher = async (user) => {
    try {
      setActionProcessing(true)
      await adminApi.approveTeacher(user.id)
      toast.success(`Đã phê duyệt tài khoản giảng viên cho "${user.fullName}" thành ACTIVE.`)
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi phê duyệt tài khoản giảng viên')
    } finally {
      setActionProcessing(false)
    }
  }

  const handleConfirmRejectTeacher = async (inputValue) => {
    const user = rejectModalState.user
    if (!user) return
    try {
      setActionProcessing(true)
      const reason = inputValue?.trim() || 'Hồ sơ chưa đáp ứng tiêu chí giảng viên'
      await adminApi.rejectTeacher(user.id, reason)
      toast.success(`Đã từ chối giảng viên "${user.fullName}". Tài khoản đã chuyển về vai trò Học viên.`)
      setRejectModalState({ open: false, user: null })
      await loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối hồ sơ giảng viên')
    } finally {
      setActionProcessing(false)
    }
  }

  return (
    <div className="admin-user-list-page">
      <AdminPageHeader
        title="Người dùng"
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
              {totalElements} người dùng
            </span>
          ) : null
        }
      />

      {/* Bộ lọc & Tìm kiếm */}
      <div className="admin-filter-bar mb-16" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: 260 }}>
          <Search size={15} style={{ color: 'var(--c-muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Tìm theo họ tên hoặc email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="filter-select-wrap" style={{ display: 'flex', gap: 10 }}>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="STUDENT">Học viên</option>
            <option value="TEACHER">Giảng viên</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            <option value="PENDING_APPROVAL">Chờ duyệt (PENDING_APPROVAL)</option>
            <option value="LOCKED">Bị khóa (LOCKED)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-24 text-center" style={{ color: 'var(--c-muted, #64748b)', padding: 48 }}>
          Đang tải danh sách người dùng...
        </div>
      ) : users.length === 0 ? (
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
          Không tìm thấy tài khoản người dùng nào phù hợp.
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
                <th style={{ padding: '12px 14px' }}>Người dùng</th>
                <th style={{ padding: '12px 14px' }}>Vai trò</th>
                <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                <th style={{ padding: '12px 14px' }}>Khóa học</th>
                <th style={{ padding: '12px 14px' }}>Ngày tạo</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--c-border, #f1f5f9)', fontSize: 13 }}>
                  <td data-label="Người dùng" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="admin-user-avatar">
                        {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text, #0f172a)' }}>{u.fullName}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-muted, #64748b)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Vai trò" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor:
                          u.role === 'ADMIN'
                            ? 'rgba(126, 34, 206, 0.1)'
                            : u.role === 'TEACHER'
                            ? 'rgba(3, 105, 161, 0.1)'
                            : 'rgba(16, 185, 129, 0.1)',
                        color:
                          u.role === 'ADMIN'
                            ? '#7e22ce'
                            : u.role === 'TEACHER'
                            ? '#0369a1'
                            : 'var(--c-success, #15803d)',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      {u.role === 'TEACHER' ? <GraduationCap size={13} /> : u.role === 'ADMIN' ? <ShieldCheck size={13} /> : <UserCheck size={13} />}
                      <span>{u.role === 'TEACHER' ? 'Giảng viên' : u.role === 'STUDENT' ? 'Học viên' : 'Quản trị viên'}</span>
                    </span>
                  </td>
                  <td data-label="Trạng thái" style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <StatusBadge status={u.status} />
                      {u.statusReason && (
                        <div
                          style={{ fontSize: 11, color: 'var(--c-danger, #dc2626)', marginTop: 4, maxWidth: 220 }}
                          title={u.statusReason}
                        >
                          Lý do: {u.statusReason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td data-label="Khóa học" style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text-dim, #475569)', whiteSpace: 'nowrap' }}>
                    {u.role === 'STUDENT'
                      ? `${u.enrolledCoursesCount || 0} đã ghi danh`
                      : u.role === 'TEACHER'
                      ? `${u.createdCoursesCount || 0} đã tạo`
                      : '—'}
                  </td>
                  <td data-label="Ngày tạo" style={{ padding: '14px 18px', fontSize: 12, color: 'var(--c-muted, #64748b)', whiteSpace: 'nowrap' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td data-label="Hành động" style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {u.role === 'TEACHER' && u.status === 'PENDING_APPROVAL' ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn primary sm"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'var(--c-success, #16a34a)',
                            borderColor: 'var(--c-success, #16a34a)',
                            color: '#fff',
                          }}
                          onClick={() => handleApproveTeacher(u)}
                          disabled={actionProcessing}
                          title="Phê duyệt quyền giảng viên"
                        >
                          <CheckCircle2 size={13} /> Duyệt
                        </button>
                        <button
                          type="button"
                          className="btn secondary sm"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--c-danger, #dc2626)',
                            borderColor: 'rgba(220, 38, 38, 0.3)',
                          }}
                          onClick={() => setRejectModalState({ open: true, user: u })}
                          disabled={actionProcessing}
                          title="Từ chối phê duyệt (hạ về học viên)"
                        >
                          <XCircle size={13} /> Từ chối
                        </button>
                      </div>
                    ) : u.role !== 'ADMIN' && (
                      <button
                        type="button"
                        className={u.status === 'LOCKED' ? 'admin-action-btn-success' : 'admin-action-btn-danger'}
                        onClick={() => openToggleLockModal(u)}
                        title={u.status === 'LOCKED' ? 'Mở khóa tài khoản này' : 'Khóa truy cập của tài khoản này'}
                      >
                        {u.status === 'LOCKED' ? (
                          <>
                            <Unlock size={14} /> <span>Mở khóa</span>
                          </>
                        ) : (
                          <>
                            <Lock size={14} /> <span>Khóa</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Thanh phân trang */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--c-muted, #64748b)' }}>
            Hiển thị trang {page + 1} / {totalPages} (Tổng số {totalElements} người dùng)
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

      {/* Modal khóa / mở khóa tài khoản */}
      <AdminActionModal
        open={modalState.open}
        type={modalState.isLocking ? 'prompt' : 'confirm'}
        title={modalState.isLocking ? 'Khóa tài khoản người dùng' : 'Mở khóa tài khoản người dùng'}
        message={
          modalState.isLocking
            ? `Bạn có chắc muốn khóa tài khoản "${modalState.user?.email}" (${modalState.user?.fullName})? Người dùng này sẽ bị thu hồi phiên đăng nhập ngay lập tức.`
            : `Xác nhận mở khóa tài khoản "${modalState.user?.email}" (${modalState.user?.fullName}) để người dùng tiếp tục học tập và làm việc trên hệ thống?`
        }
        confirmText={modalState.isLocking ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
        confirmVariant={modalState.isLocking ? 'danger' : 'primary'}
        inputLabel="Lý do khóa tài khoản"
        inputPlaceholder="Nhập lý do khóa tài khoản..."
        defaultValue="Vi phạm tiêu chuẩn cộng đồng và quy chế sử dụng dịch vụ"
        loading={actionProcessing}
        onClose={() => setModalState({ open: false, user: null, isLocking: true })}
        onConfirm={handleConfirmLockAction}
      />

      {/* Modal từ chối phê duyệt giảng viên */}
      <AdminActionModal
        open={rejectModalState.open}
        type="prompt"
        title="Từ chối phê duyệt giảng viên"
        message={`Từ chối phê duyệt quyền giảng viên cho "${rejectModalState.user?.fullName}" (${rejectModalState.user?.email})? Tài khoản sẽ được chuyển về vai trò Học viên (STUDENT) ở trạng thái hoạt động.`}
        confirmText="Xác nhận từ chối"
        confirmVariant="danger"
        inputLabel="Lý do từ chối"
        inputPlaceholder="Nhập lý do từ chối hồ sơ giảng viên..."
        defaultValue="Hồ sơ giảng viên chưa đáp ứng đủ tiêu chuẩn chuyên môn"
        loading={actionProcessing}
        onClose={() => setRejectModalState({ open: false, user: null })}
        onConfirm={handleConfirmRejectTeacher}
      />
    </div>
  )
}
