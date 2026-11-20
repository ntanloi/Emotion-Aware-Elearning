import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, CheckCircle2, PlayCircle, Circle, HelpCircle, X, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { getMyRewards } from '@student/api/wallet.js'

import { formatVnDate, vnTime } from '@shared/utils/dateTime.js'
export default function RewardProgressCard({ courseId }) {
  const [showCriteriaModal, setShowCriteriaModal] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['myRewards', courseId],
    queryFn: () => getMyRewards(courseId),
    enabled: Boolean(courseId),
    refetchInterval: 15000,
  })

  // Tìm escrow của khóa học này
  const reward = rewards.find((r) => r.courseId === courseId) || rewards[0]

  if (isLoading || !reward) {
    return null
  }

  const {
    amount = 0,
    status = 'HOLDING',
    validVideos = 0,
    totalVideos = 0,
    requiredVideos = 0,
    holdingUntil,
    videos = [],
  } = reward

  const percent = requiredVideos > 0 ? Math.min(100, Math.round((validVideos / requiredVideos) * 100)) : 0
  const isClaimed = status === 'CLAIMED'
  const isReleased = status === 'RELEASED'

  // Kiểm tra thời hạn còn lại
  let daysLeft = null
  let isExpiringSoon = false
  if (holdingUntil) {
    const diffTime = vnTime(holdingUntil) - Date.now()
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    isExpiringSoon = daysLeft <= 30 && daysLeft >= 0 && !isClaimed && !isReleased
  }

  return (
    <>
      <div
        className="card"
        style={{
          borderRadius: 12,
          padding: 18,
          marginBottom: 20,
          background: isClaimed
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)'
            : isReleased
            ? 'rgba(239, 68, 68, 0.04)'
            : 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(59, 130, 246, 0.02) 100%)',
          border: isClaimed
            ? '1.5px solid #10b981'
            : isReleased
            ? '1.5px solid #ef4444'
            : '1.5px solid rgba(37, 99, 235, 0.25)',
        }}
      >
        {/* Header card */}
        <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: isClaimed ? '#d1fae5' : isReleased ? '#fee2e2' : 'rgba(37, 99, 235, 0.12)',
                color: isClaimed ? '#059669' : isReleased ? '#dc2626' : 'var(--accent, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
                  Chương trình thưởng học tập: Hoàn {Number(amount).toLocaleString('vi-VN')} đ (10%)
                </h4>
                {isClaimed && (
                  <span style={{ fontSize: 11, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    Đã nhận thưởng
                  </span>
                )}
                {isReleased && (
                  <span style={{ fontSize: 11, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    Đã hết hạn
                  </span>
                )}
                {!isClaimed && !isReleased && (
                  <span style={{ fontSize: 11, background: 'rgba(37, 99, 235, 0.15)', color: 'var(--accent, #2563eb)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    Đang giữ hộ
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-dim, #64748b)' }}>
                {isClaimed
                  ? 'Chúc mừng bạn đã hoàn thành xuất sắc điều kiện xem video và nhận thưởng vào ví.'
                  : isReleased
                  ? 'Khóa học đã hết thời hạn giữ hộ. Khoản tiền 10% đã được chuyển cho giảng viên.'
                  : `Xem hợp lệ tối thiểu ${requiredVideos} trên tổng số ${totalVideos} video để nhận lại 10% học phí.`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn secondary sm flex-row"
              style={{ gap: 4, fontSize: 12, padding: '4px 10px', borderRadius: 6 }}
              onClick={() => setShowCriteriaModal(true)}
            >
              <HelpCircle size={14} />
              <span>Tiêu chí</span>
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
              onClick={() => setExpanded(!expanded)}
              aria-label="Toggle list"
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Thanh tiến độ */}
        <div style={{ marginBottom: 14 }}>
          <div className="flex-between" style={{ fontSize: 13, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--text, #0f172a)' }}>
              Tiến độ video hợp lệ: {validVideos} / {requiredVideos} video ({percent}%)
            </span>
            {holdingUntil && !isClaimed && !isReleased && (
              <span style={{ fontSize: 12, color: isExpiringSoon ? '#dc2626' : 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} />
                <span>Hạn chót: {formatVnDate(holdingUntil)} ({daysLeft > 0 ? `còn ${daysLeft} ngày` : 'hôm nay'})</span>
              </span>
            )}
          </div>
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: 'rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                background: isClaimed ? '#10b981' : isReleased ? '#ef4444' : 'var(--accent, #2563eb)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Cảnh báo sắp hết hạn nếu còn dưới 30 ngày */}
        {isExpiringSoon && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={15} color="#b45309" />
            <span>
              Khóa học sắp hết hạn trong {daysLeft} ngày tới! Bạn còn thiếu {Math.max(0, requiredVideos - validVideos)} video hợp lệ để nhận thưởng.
            </span>
          </div>
        )}

        {/* Danh sách video snapshot (khi mở rộng) */}
        {expanded && videos.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: 10, marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Chi tiết trạng thái video ({videos.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {videos.map((v) => {
                const isV = v.status === 'VALID'
                const isP = v.status === 'IN_PROGRESS'
                return (
                  <div
                    key={v.contentItemId}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'var(--surface, #ffffff)',
                      border: '1px solid var(--border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12.5,
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      {isV ? (
                        <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                      ) : isP ? (
                        <PlayCircle size={16} color="#2563eb" style={{ flexShrink: 0 }} />
                      ) : (
                        <Circle size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                      )}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.title}>
                        {v.title}
                      </span>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {isV ? (
                        <span style={{ color: '#059669', fontWeight: 600, fontSize: 11.5 }}>
                          Đạt · {Math.round(v.coveragePercent || 0)}%
                        </span>
                      ) : isP ? (
                        <span style={{ color: '#2563eb', fontWeight: 600, fontSize: 11.5 }}>
                          Đang xem · {Math.round(v.coveragePercent || 0)}%
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11.5 }}>
                          Chưa xem
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal giải thích tiêu chí */}
      {showCriteriaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowCriteriaModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 500,
              padding: 24,
              borderRadius: 14,
              background: 'var(--surface, #ffffff)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-between" style={{ marginBottom: 14, borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={18} color="var(--accent, #2563eb)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Tiêu chí nhận thưởng 10%</h3>
              </div>
              <button
                type="button"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}
                onClick={() => setShowCriteriaModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text, #0f172a)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <strong>1. Điều kiện xem video hợp lệ:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li>Bật camera suốt thời gian xem video (hệ thống tự động tạm dừng khi rời cam).</li>
                  <li>Độ phủ xem video đạt tối thiểu <strong>80%</strong> thời lượng bài học.</li>
                  <li>Tỷ lệ mất mặt hoặc thiếu tập trung không vượt quá <strong>20%</strong>.</li>
                  <li>Tốc độ phát video tối đa 1.5x (tốc độ cao hơn không được ghi nhận độ phủ).</li>
                </ul>
              </div>

              <div>
                <strong>2. Điều kiện hoàn tiền 10%:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li>Xem hợp lệ tối thiểu <strong>70%</strong> số lượng video của khóa học trước khi khóa học hết hạn.</li>
                  <li>Tiền thưởng ({Number(amount).toLocaleString('vi-VN')} đ) được hoàn tự động vào ngăn <strong>Tiền thưởng</strong> trong ví học viên ngay khi video thứ {requiredVideos} đạt chuẩn.</li>
                  <li>Tiền thưởng không có hạn sử dụng và dùng để mua bất kỳ khóa học nào khác trên nền tảng.</li>
                </ul>
              </div>

              <div>
                <strong>3. Trường hợp không đạt:</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--text-dim)' }}>
                  Nếu hết thời hạn khóa học mà chưa đạt đủ 70% video hợp lệ, phần tiền 10% giữ hộ sẽ được chuyển chính thức cho giảng viên như doanh thu khóa học.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 18, textAlign: 'right' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => setShowCriteriaModal(false)}
                style={{ padding: '8px 18px', borderRadius: 8 }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
