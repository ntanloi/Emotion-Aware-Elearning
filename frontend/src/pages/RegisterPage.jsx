import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'STUDENT' })
  const [error, setError] = useState('')

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(form)
      navigate('/courses')
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng ký thất bại')
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <h2>Đăng ký</h2>
        <input className="input" placeholder="Họ tên" value={form.fullName} onChange={update('fullName')} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} required />
        <input className="input" type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)"
               value={form.password} onChange={update('password')} required minLength={6} />
        <select className="input" value={form.role} onChange={update('role')}>
          <option value="STUDENT">Học viên</option>
          <option value="TEACHER">Giảng viên</option>
        </select>
        {error && <p style={{ color: 'var(--bad)', fontSize: 13 }}>{error}</p>}
        <button className="btn" type="submit" style={{ width: '100%' }}>Tạo tài khoản</button>
        <p style={{ fontSize: 13, marginTop: 12, color: 'var(--text-dim)' }}>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  )
}
