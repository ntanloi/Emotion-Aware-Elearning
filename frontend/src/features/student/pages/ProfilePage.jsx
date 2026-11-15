import { useEffect, useState } from 'react'
import { useAuthStore } from '@auth/store/authStore.js'
import * as authApi from '@auth/api/auth.js'
import PageHeader from '@shared/components/ui/PageHeader.jsx'
import SectionCard from '@shared/components/ui/SectionCard.jsx'
import EmotionPrivacyModal from '@student/components/EmotionPrivacyModal.jsx'
import {
  User,
  Shield,
  Target,
  CheckCircle2,
  Camera,
  Save,
  Clock,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const isStudent = user?.role === 'STUDENT'

  // Cài đặt cá nhân
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [bankId, setBankId] = useState('MB')
  const [bankAccountNo, setBankAccountNo] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [targetToeic, setTargetToeic] = useState(
    () => localStorage.getItem('student_target_toeic') || '650+',
  )
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(
    () => localStorage.getItem('student_daily_goal') || '30',
  )
  const [enableEmotionCamera, setEnableEmotionCamera] = useState(
    () => localStorage.getItem('student_emotion_camera') !== 'false',
  )
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  useEffect(() => {
    let isMounted = true
    authApi.getProfile().then((p) => {
      if (!isMounted) return
      if (p.fullName) setFullName(p.fullName)
      if (p.bankId) setBankId(p.bankId)
      if (p.bankAccountNo) setBankAccountNo(p.bankAccountNo)
      if (p.bankAccountName) setBankAccountName(p.bankAccountName)
    }).catch(() => {})

    return () => {
      isMounted = false
    }
  }, [user?.role])

  const getInitials = (name) => {
    if (!name) return 'HV'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      // 1. Lưu các thiết lập client vào localStorage
      localStorage.setItem('student_target_toeic', targetToeic)
      localStorage.setItem('student_daily_goal', dailyGoalMinutes)
      localStorage.setItem('student_emotion_camera', enableEmotionCamera ? 'true' : 'false')

      // 2. Cập nhật hồ sơ và thông tin ngân hàng lên Backend
      const updatedProfile = await authApi.updateProfile({
        fullName: fullName.trim(),
        bankId: bankId.trim(),
        bankAccountNo: bankAccountNo.trim(),
        bankAccountName: bankAccountName.trim()
      })

      // 3. Đồng bộ lại state user trong app
      const updatedUser = { ...user, fullName: updatedProfile.fullName }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      useAuthStore.setState({ user: updatedUser })

      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
      }, 4000)
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-page-clean" style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
      {/* 1. Header chuẩn hoá */}
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Quản lý thông tin tài khoản, mục tiêu điểm số và quyền riêng tư học tập"
        icon={User}
      />

      {/* 2. Thẻ tóm tắt thông tin người dùng */}
      <div
        className="card"
        style={{
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-full, 9999px)',
            background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(fullName || user?.username)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
              {fullName || user?.username}
            </h2>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: isStudent ? '#eff6ff' : '#f0fdfa',
                color: isStudent ? '#2563eb' : '#0d9488',
              }}
            >
              {user?.role === 'STUDENT' ? 'Học viên' : user?.role === 'TEACHER' ? 'Giảng viên' : 'Quản trị viên'}
            </span>
          </div>
          <p className="text-dim text-xs" style={{ margin: '4px 0 0' }}>
            Tài khoản: <strong>{user?.username}</strong> {user?.email ? `• ${user.email}` : ''}
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div
          className="profile-success-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 10px)',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: 'var(--fs-sm, 13.5px)',
            marginBottom: 20,
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>Cập nhật thiết lập hồ sơ thành công! Dữ liệu đã được lưu lại.</span>
        </div>
      )}

      {/* 3. Form cài đặt hồ sơ */}
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Khối 1: Thông tin tài khoản */}
        <SectionCard title="Thông tin cá nhân" subtitle="Tên hiển thị và vai trò trong hệ thống">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                Họ và tên hiển thị
              </label>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên của bạn"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                Vai trò tài khoản
              </label>
              <input
                type="text"
                className="input"
                value={user?.role === 'STUDENT' ? 'Học viên' : user?.role === 'TEACHER' ? 'Giảng viên' : 'Quản trị viên'}
                disabled
                style={{ background: 'var(--surface-2, #f1f5f9)', cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Khối 2: Thiết lập mục tiêu học tập (chỉ dành cho học viên) */}
        {isStudent && (
          <SectionCard title="Mục tiêu học tập" subtitle="Hệ thống dựa trên mục tiêu này để tối ưu hóa lộ trình cá nhân">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                  Mục tiêu điểm số TOEIC
                </label>
                <select
                  className="input"
                  value={targetToeic}
                  onChange={(e) => setTargetToeic(e.target.value)}
                >
                  <option value="450+">Mục tiêu 450+ TOEIC (Khởi động)</option>
                  <option value="600+">Mục tiêu 600+ TOEIC</option>
                  <option value="650+">Mục tiêu 650+ TOEIC (Chuẩn đầu ra ĐH)</option>
                  <option value="750+">Mục tiêu 750+ TOEIC (Trung cấp)</option>
                  <option value="850+">Mục tiêu 850+ TOEIC (Nâng cao)</option>
                  <option value="900+">Mục tiêu 900+ TOEIC (Xuất sắc)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                  Thời gian học mong muốn mỗi ngày
                </label>
                <select
                  className="input"
                  value={dailyGoalMinutes}
                  onChange={(e) => setDailyGoalMinutes(e.target.value)}
                >
                  <option value="15">15 phút / ngày (Nhẹ nhàng)</option>
                  <option value="30">30 phút / ngày (Tiêu chuẩn)</option>
                  <option value="45">45 phút / ngày (Tập trung)</option>
                  <option value="60">60 phút / ngày (Chuyên sâu)</option>
                </select>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Khối 3: Quyền riêng tư & AI Camera */}
        {isStudent && (
          <SectionCard
            title="Quyền riêng tư & Trợ lý cảm xúc AI"
            subtitle="Cài đặt camera nhận diện và quyền kiểm soát dữ liệu cá nhân"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md, 10px)',
                  background: 'var(--surface-2, #f8fafc)',
                  border: '1px solid var(--border, #e2e8f0)',
                }}
              >
                <div>
                  <strong style={{ fontSize: 13.5, color: 'var(--text, #0f172a)' }}>
                    Bật camera nhận diện trạng thái tập trung khi học video
                  </strong>
                  <p className="text-dim text-xs" style={{ margin: '4px 0 0' }}>
                    Tự động nhận diện mức độ tập trung và mệt mỏi để gợi ý nghỉ ngơi hợp lý.
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={enableEmotionCamera}
                    onChange={(e) => setEnableEmotionCamera(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingTop: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={18} color="var(--accent)" />
                  <span className="text-dim text-xs">
                    Dữ liệu cảm xúc chỉ phục vụ gợi ý học tập và có thể xóa bất cứ lúc nào.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ borderRadius: 'var(--radius, 8px)' }}
                  onClick={() => setShowPrivacyModal(true)}
                >
                  Quản lý & Xóa dữ liệu cảm xúc
                </button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Khối 4: Tài khoản ngân hàng (Admin: Tài khoản thu hộ sàn / Giảng viên: Nhận rút tiền) */}
        {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
          <SectionCard
            title={user?.role === 'ADMIN' ? 'Tài khoản thu hộ của Nền tảng (VietQR)' : 'Tài khoản ngân hàng thụ hưởng (VietQR)'}
            subtitle={
              user?.role === 'ADMIN'
                ? 'Mã QR thanh toán của học viên và đối soát Webhook sẽ tự động sử dụng tài khoản này làm tài khoản nhận của sàn.'
                : 'Thông tin tài khoản ngân hàng của bạn dùng để nhận giải ngân khi tạo yêu cầu rút doanh thu từ ví giảng viên.'
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                  Ngân hàng
                </label>
                <select
                  className="input"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                >
                  <option value="MB">MB Bank</option>
                  <option value="VCB">Vietcombank</option>
                  <option value="TCB">Techcombank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="CTG">VietinBank</option>
                  <option value="ACB">ACB</option>
                  <option value="TPB">TPBank</option>
                  <option value="VPB">VPBank</option>
                  <option value="VIB">VIB</option>
                  <option value="STB">Sacombank</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                  Số tài khoản
                </label>
                <input
                  type="text"
                  className="input"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                  Tên chủ tài khoản
                </label>
                <input
                  type="text"
                  className="input"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="NGUYEN VAN A"
                />
              </div>
            </div>
          </SectionCard>
        )}

        {/* Nút lưu */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="submit"
            className="btn primary flex-row"
            style={{ gap: 8, padding: '10px 24px', borderRadius: 'var(--radius, 8px)' }}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </form>

      {/* Modal Quyền riêng tư & Xóa dữ liệu */}
      {showPrivacyModal && (
        <EmotionPrivacyModal onClose={() => setShowPrivacyModal(false)} />
      )}
    </div>
  )
}
