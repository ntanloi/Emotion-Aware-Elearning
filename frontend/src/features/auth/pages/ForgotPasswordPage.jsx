import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as authApi from '@auth/api/auth.js'
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // Các bước: 'EMAIL' | 'OTP' | 'SUCCESS'
  const [step, setStep] = useState('EMAIL')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [error, setError] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Bộ đếm ngược 60s cho nút gửi lại mã OTP
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

  // Bước 1: Gửi mã OTP xác thực quên mật khẩu qua Gmail
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setInfoMsg('')

    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ Gmail/Email hợp lệ')
      return
    }

    try {
      setSendingOtp(true)
      const res = await authApi.forgotPassword({ email: email.trim() })
      setInfoMsg(res.message || `Mã xác thực OTP đã được gửi đến ${email.trim()}`)
      if (res.devOtp) {
        setOtp(res.devOtp)
      }
      setStep('OTP')
      setCountdown(60)
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Không thể gửi mã xác thực. Vui lòng kiểm tra lại địa chỉ email.'
      )
    } finally {
      setSendingOtp(false)
    }
  }

  // Bước 2: Nhập OTP & Đặt lại mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    if (!otp.trim() || otp.trim().length < 4) {
      setError('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu mới')
      return
    }

    try {
      setLoading(true)
      await authApi.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      })
      setStep('SUCCESS')
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.'
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
          <linearGradient id="waveBlueSoftForgot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="waveLightBlueForgot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="whiteRightBodyForgot" x1="0%" y1="0%" x2="100%" y2="100%">
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
          fill="url(#waveBlueSoftForgot)"
        />
        <path
          d="M 750,0 
             C 670,180 800,340 730,530 
             C 670,690 780,820 720,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#waveLightBlueForgot)"
        />
        <path
          d="M 790,0 
             C 710,190 830,350 770,540 
             C 710,700 810,830 760,900 
             L 1440,900 L 1440,0 Z"
          fill="url(#whiteRightBodyForgot)"
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
              Khôi phục tài khoản
              <br />
              An toàn &amp; <span className="text-cyan">Tiện lợi</span>
            </h1>
            <p className="auth-modern-hero-desc">
              Bảo vệ tài khoản và kết quả học tập của bạn. Thiết lập lại mật khẩu mới nhanh chóng với mã xác thực OTP gửi trực tiếp về Gmail.
            </p>

            <div className="auth-modern-pills">
              <span className="auth-modern-pill">
                <ShieldCheck size={14} style={{ color: '#fef08a' }} />
                <span>Bảo mật OTP 2 lớp</span>
              </span>
              <span className="auth-modern-pill">
                <Zap size={14} style={{ color: '#93c5fd' }} />
                <span>Khôi phục nhanh 24/7</span>
              </span>
              <span className="auth-modern-pill">
                <Lock size={14} style={{ color: '#a7f3d0' }} />
                <span>Bảo toàn kết quả học tập</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cột phải: Form Quên mật khẩu nổi bật (Floating Card) */}
        <div className="auth-modern-right">
          <div className="auth-modern-card card-wide">
            {/* Huy hiệu ở giữa */}
            <div
              className="auth-modern-card-badge"
              style={step === 'SUCCESS' ? { background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' } : {}}
            >
              {step === 'SUCCESS' ? (
                <CheckCircle2 size={36} strokeWidth={2.4} />
              ) : (
                <KeyRound size={32} strokeWidth={2.2} />
              )}
            </div>

            {/* BƯỚC 1: NHẬP EMAIL */}
            {step === 'EMAIL' && (
              <>
                <h2 className="auth-modern-card-title">Quên mật khẩu</h2>
                <p className="auth-modern-card-subtitle">
                  Nhập địa chỉ Gmail để nhận mã xác thực OTP
                </p>
                <div className="auth-modern-card-bar" />

                {error && (
                  <div className="auth-error-box">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleRequestOtp}>
                  <div className="auth-modern-field">
                    <label className="auth-modern-label">
                      <Mail size={15} style={{ color: '#475569' }} />
                      <span>Địa chỉ Gmail của bạn</span>
                    </label>
                    <div className="auth-modern-input-wrap">
                      <span className="auth-modern-input-icon">
                        <Mail size={16} />
                      </span>
                      <input
                        className="auth-modern-input"
                        type="email"
                        placeholder="tenban@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 22 }}>
                    <button className="auth-modern-submit" type="submit" disabled={sendingOtp}>
                      {sendingOtp ? (
                        'Đang gửi mã xác thực...'
                      ) : (
                        <>
                          <span>Gửi mã xác thực OTP</span>
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="auth-modern-register-row">
                    <span>Nhớ lại mật khẩu?</span>
                    <Link to="/login">Đăng nhập</Link>
                  </div>

                  <div className="auth-modern-security-note">
                    <ShieldCheck size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
                    <span className="note-text">
                      Mã xác thực OTP chỉ được gửi tới địa chỉ Gmail đã đăng ký trong hệ thống E-Learning AI.
                    </span>
                  </div>
                </form>
              </>
            )}

            {/* BƯỚC 2: NHẬP OTP & MẬT KHẨU MỚI */}
            {step === 'OTP' && (
              <>
                <h2 className="auth-modern-card-title">Đặt lại mật khẩu mới</h2>
                <p className="auth-modern-card-subtitle">
                  Nhập mã 6 chữ số và mật khẩu mới
                </p>
                <div className="auth-modern-card-bar" />

                {infoMsg && (
                  <div className="auth-modern-success-box">
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <span>{infoMsg}</span>
                  </div>
                )}

                {error && (
                  <div className="auth-error-box">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword}>
                  <div className="auth-modern-email-chip">
                    <div>
                      Gửi tới: <strong>{email}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('EMAIL')
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

                  <div className="auth-modern-field">
                    <label className="auth-modern-label">
                      <Lock size={15} style={{ color: '#475569' }} />
                      <span>Mật khẩu mới</span>
                    </label>
                    <div className="auth-modern-input-wrap">
                      <span className="auth-modern-input-icon">
                        <Lock size={16} />
                      </span>
                      <input
                        className="auth-modern-input has-toggle"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tối thiểu 6 ký tự"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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
                      <Lock size={15} style={{ color: '#475569' }} />
                      <span>Xác nhận mật khẩu mới</span>
                    </label>
                    <div className="auth-modern-input-wrap">
                      <span className="auth-modern-input-icon">
                        <Lock size={16} />
                      </span>
                      <input
                        className="auth-modern-input has-toggle"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="auth-modern-toggle-pwd"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button className="auth-modern-submit" type="submit" disabled={loading}>
                      {loading ? (
                        'Đang xử lý...'
                      ) : (
                        <>
                          <span>Xác nhận &amp; Đặt lại mật khẩu</span>
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="auth-modern-btn-secondary"
                      onClick={() => {
                        setStep('EMAIL')
                        setError('')
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Quay lại nhập email</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* BƯỚC 3: THÀNH CÔNG */}
            {step === 'SUCCESS' && (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <h2 className="auth-modern-card-title">Đặt lại mật khẩu thành công</h2>
                <p className="auth-modern-card-subtitle" style={{ maxWidth: 360, margin: '0 auto 24px' }}>
                  Mật khẩu tài khoản của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại với mật khẩu mới.
                </p>

                <button
                  className="auth-modern-submit"
                  type="button"
                  onClick={() => navigate('/login')}
                >
                  <span>Đến trang Đăng nhập</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
