import React, { useEffect, useState } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import * as adminApi from '@admin/api/admin.js'

/**
 * Modal tạo tài khoản Kiểm duyệt viên (chỉ ADMIN dùng).
 * Kiểm duyệt viên không có luồng tự đăng ký nên admin đặt email và mật khẩu ban đầu.
 */
export default function CreateModeratorModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm({ fullName: '', email: '', password: '' })
      setError('')
    }
  }, [open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Mật khẩu tối thiểu 8 ký tự')
      return
    }
    try {
      setSubmitting(true)
      const created = await adminApi.createModerator({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      onCreated?.(created)
    } catch (err) {
      const data = err.response?.data
      setError(data?.message || data?.error || 'Không thể tạo tài khoản kiểm duyệt viên')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title="Tạo kiểm duyệt viên" onClose={submitting ? undefined : onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim, #64748b)' }}>
          Kiểm duyệt viên chỉ được duyệt khóa học, đề thi, đánh giá, hồ sơ giảng viên và quản lý từ điển.
          Không truy cập được Người dùng và Tài chính.
        </p>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
          Họ và tên
          <input type="text" required maxLength={100} value={form.fullName} onChange={set('fullName')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
          Email đăng nhập
          <input type="email" required maxLength={150} value={form.email} onChange={set('email')} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
          Mật khẩu ban đầu (tối thiểu 8 ký tự)
          <input type="text" required minLength={8} maxLength={72} value={form.password} onChange={set('password')} autoComplete="off" />
        </label>
        {error && <div style={{ color: 'var(--c-danger, #dc2626)', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn secondary sm" onClick={onClose} disabled={submitting}>Hủy</button>
          <button type="submit" className="btn sm" disabled={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
