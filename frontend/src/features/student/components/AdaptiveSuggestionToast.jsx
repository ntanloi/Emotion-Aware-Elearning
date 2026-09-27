/**
 * AdaptiveSuggestionToast — Giai đoạn 6, Bước 15.
 * Popup không chặn video khi có gợi ý xem lại (FR-EMO-06/07, BR-13/14/15).
 * Chưa nối dữ liệu thật (cần polling/WebSocket ở Giai đoạn AI) - hiện tại nhận suggestion
 * qua prop để component sẵn sàng dùng khi có nguồn dữ liệu thật.
 *
 * Props: suggestion: { videoSegmentStart, videoSegmentEnd } | null, onAccept(), onDismiss()
 */
export default function AdaptiveSuggestionToast({ suggestion, onAccept, onDismiss }) {
  if (!suggestion) return null

  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

  return (
    <div className="toast">
      <div className="toast-title">💡 Có vẻ bạn đang mất tập trung</div>
      <p className="text-sm text-dim" style={{ margin: 0 }}>
        Xem lại đoạn {fmt(suggestion.videoSegmentStart)} – {fmt(suggestion.videoSegmentEnd)} để không bỏ lỡ kiến thức nhé.
      </p>
      <div className="toast-actions">
        <button className="btn secondary sm" onClick={onDismiss}>Bỏ qua</button>
        <button className="btn sm" onClick={onAccept}>Xem lại</button>
      </div>
    </div>
  )
}
