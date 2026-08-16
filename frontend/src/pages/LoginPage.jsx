import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/courses')
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại')
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <h2>Đăng nhập</h2>
        <input className="input" type="email" placeholder="Email" value={email}
               onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Mật khẩu" value={password}
               onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={{ color: 'var(--bad)', fontSize: 13 }}>{error}</p>}
        <button className="btn" type="submit" style={{ width: '100%' }}>Đăng nhập</button>
        <p style={{ fontSize: 13, marginTop: 12, color: 'var(--text-dim)' }}>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </form>
    </div>
  )
}
