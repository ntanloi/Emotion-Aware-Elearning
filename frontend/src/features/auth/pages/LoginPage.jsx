import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Zap,
  BarChart3,
  Headphones,
} from 'lucide-react'

export default function LoginPage() {
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Nếu đã đăng nhập thì chuyển hướng thẳng về dashboard tương ứng với role
  if (user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
    if (user.role === 'TEACHER') return <Navigate to="/dashboard/teacher" replace />
    return <Navigate to="/courses" replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      const currentUser = useAuthStore.getState().user
      if (currentUser?.role === 'ADMIN') {
        navigate('/admin')
      } else if (currentUser?.role === 'TEACHER') {
        navigate('/dashboard/teacher')
      } else {
        navigate('/courses')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modern-page">
      {/* SVG Sóng uốn lượn phân chia 2 nửa: Trái xanh dương, Phải trắng */}
      <svg
        className="auth-modern-wave-divider"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="waveBlueSoft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="waveLightBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="whiteRightBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        {/* Lớp sóng 1: Xanh nhạt mềm mại */}
        <path
          d="M 710,0 
             C 630,170 760,330 690,520 
             C 630,680 740,810 680,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#waveBlueSoft)"
        />

        {/* Lớp sóng 2: Trắng xanh chuyển tiếp */}
        <path
          d="M 750,0 
             C 670,180 800,340 730,530 
             C 670,690 780,820 720,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#waveLightBlue)"
        />

        {/* Lớp sóng 3: Nửa bên phải màu trắng hoàn toàn */}
        <path
          d="M 790,0 
             C 710,190 830,350 770,540 
             C 710,700 810,830 760,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#whiteRightBody)"
        />

        {/* Sóng hữu cơ trang trí góc trên bên phải */}
        <path
          d="M 1150,0 
             C 1210,110 1320,150 1440,90 
             L 1440,0 Z"
          fill="#e0f2fe"
          opacity="0.65"
        />

        {/* Sóng hữu cơ trang trí góc dưới bên phải */}
        <path
          d="M 1250,900 
             C 1290,810 1370,790 1440,830 
             L 1440,900 Z"
          fill="#e0e7ff"
          opacity="0.5"
        />
      </svg>

      {/* Chấm bi trang trí góc trên bên trái */}
      <div className="auth-modern-dot-grid" />

      <div className="auth-modern-container">
        {/* Cột trái: Nửa xanh dương - Thương hiệu & Thông điệp cân đối */}
        <div className="auth-modern-left">
          <div className="auth-modern-brand">
            <div className="auth-modern-brand-logo">
              <GraduationCap size={26} strokeWidth={2.4} color="#ffffff" />
            </div>
            <span className="auth-modern-brand-name">E-Learning AI</span>
          </div>

          <div className="auth-modern-hero">
            <h1 className="auth-modern-hero-title">
              Hệ thống học <span className="text-cyan">TOEIC</span> &amp;
              <br />
              Nhận diện cảm xúc
            </h1>
            <p className="auth-modern-hero-desc">
              Nền tảng học trực tuyến thông minh giúp bạn luyện thi TOEIC hiệu quả và nâng cao hiệu quả học tập thông qua công nghệ AI.
            </p>

            <div className="auth-modern-pills">
              <span className="auth-modern-pill">
                <Zap size={14} style={{ color: '#fef08a' }} />
                <span>Phân tích cảm xúc AI</span>
              </span>
              <span className="auth-modern-pill">
                <BarChart3 size={14} style={{ color: '#93c5fd' }} />
                <span>Luyện thi TOEIC 7 Parts</span>
              </span>
              <span className="auth-modern-pill">
                <Headphones size={14} style={{ color: '#a7f3d0' }} />
                <span>Cá nhân hóa lộ trình</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cột phải: Nửa màu trắng - Khối đăng nhập nổi bật (Floating Card) */}
        <div className="auth-modern-right">
          <div className="auth-modern-card">
            {/* Huy hiệu nón cử nhân ở giữa */}
            <div className="auth-modern-card-badge">
              <GraduationCap size={34} strokeWidth={2.2} />
            </div>

            <h2 className="auth-modern-card-title">Đăng nhập</h2>
            <p className="auth-modern-card-subtitle">Dành cho học viên và giảng viên hệ thống</p>
            <div className="auth-modern-card-bar" />

            {error && (
              <div className="auth-error-box">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit}>
              {/* Trường Email hoặc tài khoản */}
              <div className="auth-modern-field">
                <label className="auth-modern-label">
                  <Mail size={15} style={{ color: '#475569' }} />
                  <span>Email hoặc tài khoản</span>
                </label>
                <div className="auth-modern-input-wrap">
                  <span className="auth-modern-input-icon">
                    <Mail size={16} />
                  </span>
                  <input
                    className="auth-modern-input"
                    type="email"
                    placeholder="admin@elearning.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Trường Mật khẩu */}
              <div className="auth-modern-field">
                <label className="auth-modern-label">
                  <Lock size={15} style={{ color: '#475569' }} />
                  <span>Mật khẩu</span>
                </label>
                <div className="auth-modern-input-wrap">
                  <span className="auth-modern-input-icon">
                    <Lock size={16} />
                  </span>
                  <input
                    className="auth-modern-input has-toggle"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-modern-toggle-pwd"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Ghi nhớ & Quên mật khẩu */}
              <div className="auth-modern-extra">
                <label className="auth-modern-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>

                <Link to="/forgot-password" className="auth-modern-forgot">
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Nút Đăng nhập */}
              <button className="auth-modern-submit" type="submit" disabled={loading}>
                {loading ? (
                  'Đang đăng nhập...'
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              {/* Liên kết Đăng ký */}
              <div className="auth-modern-register-row">
                <span>Chưa có tài khoản?</span>
                <Link to="/register">Đăng ký ngay</Link>
              </div>

              {/* Khối bảo mật và vai trò */}
              <div className="auth-modern-security-note">
                <ShieldCheck size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
                <span className="note-text">
                  Tài khoản được phân quyền theo vai trò: Học viên - Giảng viên phục vụ theo dõi cảm xúc và kết quả học tập.
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}