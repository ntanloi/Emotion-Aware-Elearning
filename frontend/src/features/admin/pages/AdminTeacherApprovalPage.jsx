import React, { useCallback, useEffect, useState } from 'react'
import * as adminApi from '@admin/api/admin.js'
import AdminActionModal from '@admin/components/AdminActionModal.jsx'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import { useToast } from '@admin/context/AdminUIContext.jsx'
import { CheckCircle2, XCircle, GraduationCap } from 'lucide-react'
import { formatVnDate } from '@shared/utils/dateTime.js'

/**
 * Duyệt hồ sơ giảng viên (PENDING_APPROVAL).
 * Trước đây nằm lẫn trong trang Người dùng; tách ra để kiểm duyệt viên xử lý
 * mà không cần quyền quản lý/khóa tài khoản.
 */
export default function AdminTeacherApprovalPage() {
  const toast = useToast()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
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

  const approve = async (user) => {
    try {
      setProcessing(true)
      await adminApi.approveTeacher(user.id)
      toast.success(`Đã phê duyệt giảng viên "${user.fullName}"`)
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

  return (
    <div className="admin-teacher-approval-page">
      <AdminPageHeader
        title="Duyệt giảng viên"
        badge={
          teachers.length > 0 ? (
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', color: '#b45309' }}>
              {teachers.length} chờ duyệt
            </span>
          ) : null
        }
      />

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)' }}>Đang tải...</div>
      ) : teachers.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
          <GraduationCap size={32} style={{ opacity: 0.5 }} />
          <div style={{ marginTop: 8 }}>Không có hồ sơ giảng viên nào đang chờ duyệt</div>
        </div>
      ) : (
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 18px' }}>Giảng viên</th>
                <th style={{ textAlign: 'left', padding: '12px 18px' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '12px 18px' }}>Ngày đăng ký</th>
                <th style={{ textAlign: 'right', padding: '12px 18px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border, #e2e8f0)' }}>
                  <td data-label="Giảng viên" style={{ padding: '14px 18px', fontWeight: 600 }}>{u.fullName}</td>
                  <td data-label="Email" style={{ padding: '14px 18px' }}>{u.email}</td>
                  <td data-label="Ngày đăng ký" style={{ padding: '14px 18px' }}>
                    {u.createdAt ? formatVnDate(u.createdAt) : '—'}
                  </td>
                  <td data-label="Thao tác" style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => approve(u)}
                        disabled={processing}
                      >
                        <CheckCircle2 size={13} /> Duyệt
                      </button>
                      <button
                        type="button"
                        className="btn secondary sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--c-danger, #dc2626)', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                        onClick={() => setRejectState({ open: true, user: u })}
                        disabled={processing}
                      >
                        <XCircle size={13} /> Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
