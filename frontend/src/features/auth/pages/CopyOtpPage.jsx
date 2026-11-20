import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Copy, CheckCircle2, AlertCircle } from 'lucide-react'

/**
 * CopyOtpPage — đích của nút "Sao chép" trong email OTP.
 * Email không chạy được JavaScript nên việc ghi clipboard được thực hiện ở trang này.
 *
 * URL dạng:  /copy-otp#992229
 * - Mã nằm trong URL fragment nên KHÔNG bị gửi lên server.
 * - Chỉ chấp nhận mã toàn chữ số (4–8 ký tự) để link độc hại không thể đặt nội dung tuỳ ý vào clipboard.
 * - Xoá fragment khỏi thanh địa chỉ ngay sau khi đọc.
 */
const OTP_PATTERN = /^\d{4,8}$/

async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // rơi xuống phương án dự phòng bên dưới
  }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export default function CopyOtpPage() {
  const [otp] = useState(() => {
    const raw = decodeURIComponent((window.location.hash || '').replace(/^#/, '')).trim()
    return OTP_PATTERN.test(raw) ? raw : ''
  })
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!otp) return
    setCopied(await writeClipboard(otp))
  }, [otp])

  // Xoá mã khỏi thanh địa chỉ + thử tự động sao chép ngay khi mở trang
  useEffect(() => {
    if (!otp) return
    window.history.replaceState(null, '', window.location.pathname)
    handleCopy()
  }, [otp, handleCopy])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: '#f1f5f9',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '32px 28px',
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#2563eb',
            color: '#ffffff',
            boxShadow: '0 2px 5px rgba(37, 99, 235, 0.25)',
          }}
        >
          <GraduationCap size={26} strokeWidth={2.2} />
        </span>
        <h1 style={{ margin: '12px 0 4px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
          E-Learning AI
        </h1>

        {otp ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '20px 0 16px' }}>
              {otp.split('').map((d, i) => (
                <span
                  key={i}
                  style={{
                    width: 40,
                    height: 48,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 10,
                    fontSize: 24,
                    fontWeight: 800,
                    color: '#0284c7',
                  }}
                >
                  {d}
                </span>
              ))}
            </div>

            <p
              style={{
                margin: '0 0 16px',
                fontSize: 14,
                color: copied ? '#15803d' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {copied ? <CheckCircle2 size={16} /> : null}
              {copied
                ? 'Đã sao chép mã OTP. Hãy quay lại trang web và dán mã vào ô nhập.'
                : 'Nhấn nút bên dưới để sao chép mã OTP.'}
            </p>

            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Copy size={16} />
              Sao chép
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                margin: '20px 0 16px',
                fontSize: 14,
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={16} />
              Liên kết không hợp lệ hoặc không có mã OTP.
            </p>
            <Link to="/forgot-password" style={{ color: '#2563eb', fontWeight: 600, fontSize: 14 }}>
              Quay lại trang đặt lại mật khẩu
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
