import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@auth/store/authStore.js'
import * as authApi from '@auth/api/auth.js'
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Zap,
  BarChart3,
  Headphones,
} from 'lucide-react'

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'STUDENT' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Quản lý các bước xác thực Email bằng OTP: 'INFO' | 'OTP'
  const [step, setStep] = useState('INFO')
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [sendingOtp, setSendingOtp] = useState(false)

  // Đếm ngược 60s cho nút gửi lại mã
  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [countdown])

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Bước 1: Gửi mã xác thực OTP qua Gmail
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setInfoMsg('')

    if (!form.fullName.trim()) {
      setError('Vui lòng nhập họ và tên của bạn')
      return
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setError('Vui lòng nhập địa chỉ Gmail/Email hợp lệ')
      return
    }
    if (!form.password || form.password.length < 6) {
      setError('Mật khẩu bảo mật phải có tối thiểu 6 ký tự')
      return
    }

    try {
      setSendingOtp(true)
      const res = await authApi.sendRegisterOtp({
        email: form.email.trim(),
        fullName: form.fullName.trim(),
      })
      setInfoMsg(res.message || `Mã xác thực đã được gửi đến ${form.email}`)
      if (res.devOtp) {
        setOtp(res.devOtp)
      }
      setStep('OTP')
      setCountdown(60)
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Không thể gửi mã xác thực. Vui lòng kiểm tra lại email.'
      )
    } finally {
      setSendingOtp(false)
    }
  }

  // Bước 2: Xác nhận OTP & Hoàn tất tạo tài khoản
  const handleCompleteRegister = async (e) => {
    e.preventDefault()
    if (!otp.trim() || otp.trim().length < 4) {
      setError('Vui lòng nhập đầy đủ mã OTP đã nhận qua Gmail')
      return
    }

    setError('')
    setLoading(true)
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        otp: otp.trim(),
      })

      if (form.role === 'TEACHER') {
        navigate('/teacher/courses')
      } else {
        navigate('/courses')
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Đăng ký tài khoản thất bại. Vui lòng kiểm tra lại mã OTP.'
      )
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
          <linearGradient id="waveBlueSoftReg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="waveLightBlueReg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="whiteRightBodyReg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        <path
          d="M 710,0 
             C 630,170 760,330 690,520 
             C 630,680 740,810 680,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#waveBlueSoftReg)"
        />
        <path
          d="M 750,0 
             C 670,180 800,340 730,530 
             C 670,690 780,820 720,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#waveLightBlueReg)"
        />
        <path
          d="M 790,0 
             C 710,190 830,350 770,540 
             C 710,700 810,830 760,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#whiteRightBodyReg)"
        />
        <path
          d="M 1150,0 
             C 1210,110 1320,150 1440,90 
             L 1440,0 Z"
          fill="#e0f2fe"
          opacity="0.65"
        />
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
        {/* Cột trái: Nửa xanh dương - Thương hiệu & Thông điệp */}
        <div className="auth-modern-left">
          <div className="auth-modern-brand">
            <div className="auth-modern-brand-logo">
              <GraduationCap size={26} strokeWidth={2.4} color="#ffffff" />
            </div>
            <span className="auth-modern-brand-name">E-Learning AI</span>
          </div>

          <div className="auth-modern-hero">
            <h1 className="auth-modern-hero-title">
              Bắt đầu hành trình
              <br />
              Chinh phục <span className="text-cyan">TOEIC &amp; AI</span>
            </h1>
            <p className="auth-modern-hero-desc">
              Tạo tài khoản để trải nghiệm học tập thông minh với hệ thống tự động nhận diện cảm xúc, hỗ trợ nhắc nhở khi mất tập trung và đề xuất bài tập thích ứng.
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

        {/* Cột phải: Form Đăng ký nổi bật (Floating Card) */}
        <div className="auth-modern-right">
          <div className="auth-modern-card card-wide">
            {/* Huy hiệu nón cử nhân ở giữa */}
            <div className="auth-modern-card-badge">
              <GraduationCap size={34} strokeWidth={2.2} />
            </div>

            <h2 className="auth-modern-card-title">
              {step === 'INFO' ? 'Đăng ký tài khoản' : 'Xác thực mã OTP'}
            </h2>
            <p className="auth-modern-card-subtitle">
              {step === 'INFO'
                ? 'Đăng ký bằng Gmail với mã xác thực an toàn'
                : `Nhập mã 6 chữ số đã gửi tới ${form.email}`}
            </p>
            <div className="auth-modern-card-bar" />

            {error && (
              <div className="auth-error-box">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {infoMsg && (
              <div className="auth-modern-success-box">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* GIAI ĐOẠN 1: ĐIỀN THÔNG TIN CÁ NHÂN & EMAIL */}
            {step === 'INFO' && (
              <form onSubmit={handleRequestOtp}>
                <div className="auth-modern-field">
                  <label className="auth-modern-label">
                    <User size={15} style={{ color: '#475569' }} />
                    <span>Họ và tên</span>
                  </label>
                  <div className="auth-modern-input-wrap">
                    <span className="auth-modern-input-icon">
                      <User size={16} />
                    </span>
                    <input
                      className="auth-modern-input"
                      placeholder="Nguyễn Văn A"
                      value={form.fullName}
                      onChange={update('fullName')}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="auth-modern-field">
                  <label className="auth-modern-label">
                    <Mail size={15} style={{ color: '#475569' }} />
                    <span>Địa chỉ Gmail</span>
                  </label>
                  <div className="auth-modern-input-wrap">
                    <span className="auth-modern-input-icon">
                      <Mail size={16} />
                    </span>
                    <input
                      className="auth-modern-input"
                      type="email"
                      placeholder="tenban@gmail.com"
                      value={form.email}
                      onChange={update('email')}
                      required
                    />
                  </div>
                </div>

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
                      placeholder="Tối thiểu 6 ký tự"
                      value={form.password}
                      onChange={update('password')}
                      required
                      minLength={6}
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

                <div className="auth-modern-field">
                  <label className="auth-modern-label">
                    <ShieldCheck size={15} style={{ color: '#475569' }} />
                    <span>Vai trò trong hệ thống</span>
                  </label>
                  <div className="auth-modern-input-wrap">
                    <span className="auth-modern-input-icon">
                      <ShieldCheck size={16} />
                    </span>
                    <select
                      className="auth-modern-input auth-modern-select"
                      value={form.role}
                      onChange={update('role')}
                    >
                      <option value="STUDENT">Học viên (Học &amp; làm bài luyện tập)</option>
                      <option value="TEACHER">Giảng viên (Soạn khóa học &amp; quản lý)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 22 }}>
                  <button className="auth-modern-submit" type="submit" disabled={sendingOtp}>
                    {sendingOtp ? (
                      'Đang gửi mã OTP...'
                    ) : (
                      <>
                        <span>Tiếp tục nhận mã OTP</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </div>

                <div className="auth-modern-register-row">
                  <span>Đã có tài khoản?</span>
                  <Link to="/login">Đăng nhập</Link>
                </div>

                <div className="auth-modern-security-note">
                  <ShieldCheck size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
                  <span className="note-text">
                    Bằng việc đăng ký, bạn đồng ý với các điều khoản bảo mật và tính năng nhận diện cảm xúc hỗ trợ học tập.
                  </span>
                </div>
              </form>
            )}

            {/* GIAI ĐOẠN 2: NHẬP MÃ OTP XÁC THỰC EMAIL */}
            {step === 'OTP' && (
              <form onSubmit={handleCompleteRegister}>
                <div className="auth-modern-email-chip">
                  <div>
                    Gửi tới: <strong>{form.email}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('INFO')
                      setError('')
                      setInfoMsg('')
                    }}
                  >
                    Đổi email
                  </button>
                </div>

                <div className="auth-modern-field">
                  <label className="auth-modern-label">
                    <KeyRound size={15} style={{ color: '#475569' }} />
                    <span>Mã xác thực OTP (6 chữ số)</span>
                  </label>
                  <div className="auth-modern-input-wrap">
                    <input
                      className="auth-modern-input input-otp"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="auth-modern-otp-timer">
                    <span>Mã có hiệu lực trong 5 phút</span>
                    <button
                      type="button"
                      className="auth-modern-otp-resend"
                      disabled={countdown > 0 || sendingOtp}
                      onClick={() => handleRequestOtp()}
                    >
                      <RefreshCw size={12} className={sendingOtp ? 'spinner' : ''} />
                      <span>{countdown > 0 ? `Gửi lại mã (${countdown}s)` : 'Gửi lại mã OTP'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="auth-modern-submit" type="submit" disabled={loading}>
                    {loading ? (
                      'Đang xác thực & Tạo tài khoản...'
                    ) : (
                      <>
                        <span>Xác nhận &amp; Tạo tài khoản</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="auth-modern-btn-secondary"
                    onClick={() => {
                      setStep('INFO')
                      setError('')
                      setInfoMsg('')
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Quay lại sửa thông tin</span>
                  </button>
                </div>

                <div className="auth-modern-security-note" style={{ marginTop: 20 }}>
                  <ShieldCheck size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
                  <span className="note-text">
                    Mã xác thực được gửi tự động qua Gmail của hệ thống <strong>E-Learning AI</strong>. Vui lòng kiểm tra hòm thư chính và Spam.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
