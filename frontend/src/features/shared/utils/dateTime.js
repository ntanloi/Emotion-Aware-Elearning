/**
 * Tiện ích ngày giờ — luôn dùng múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7),
 * bất kể máy người dùng đang đặt múi giờ nào.
 *
 * Backend trả LocalDateTime dạng "2026-11-20T10:30:00" (KHÔNG kèm offset) và đó là giờ Việt Nam.
 * `new Date("2026-11-20T10:30:00")` sẽ bị trình duyệt hiểu là giờ máy người dùng → lệch nếu máy
 * không ở UTC+7. Vì vậy mọi chỗ parse/format thời gian từ server phải đi qua file này.
 */

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'
export const VN_LOCALE = 'vi-VN'

// Chuỗi đã có múi giờ rõ ràng: kết thúc bằng Z hoặc ±hh:mm / ±hhmm
const HAS_ZONE_RE = /(Z|[+-]\d{2}:?\d{2})$/i
// yyyy-MM-dd
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
// yyyy-MM-dd[T ]HH:mm[:ss[.fraction]]
const LOCAL_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

/**
 * Chuyển giá trị bất kỳ (string/number/Date) thành Date, coi chuỗi không có offset là giờ Việt Nam.
 * Trả về null nếu rỗng hoặc không hợp lệ.
 */
export function parseVnDate(value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }

  let raw = String(value).trim()
  if (!raw) return null

  if (!HAS_ZONE_RE.test(raw)) {
    if (DATE_ONLY_RE.test(raw)) {
      raw = `${raw}T00:00:00+07:00`
    } else if (LOCAL_DATETIME_RE.test(raw)) {
      raw = `${raw.replace(' ', 'T')}+07:00`
    }
  }
  // Fraction dài hơn 3 chữ số (microseconds từ MySQL) -> cắt về mili-giây để mọi trình duyệt parse được
  raw = raw.replace(/(\.\d{3})\d+/, '$1')

  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

/** Timestamp (ms) của một thời điểm từ server; NaN nếu không hợp lệ. Dùng để so sánh/tính khoảng cách. */
export function vnTime(value) {
  const d = parseVnDate(value)
  return d ? d.getTime() : NaN
}

/** dd/MM/yyyy */
export function formatVnDate(value, fallback = '—') {
  const d = parseVnDate(value)
  if (!d) return fallback
  return d.toLocaleDateString(VN_LOCALE, { timeZone: VN_TIME_ZONE })
}

/** HH:mm:ss dd/MM/yyyy (mặc định của vi-VN) */
export function formatVnDateTime(value, fallback = '—') {
  const d = parseVnDate(value)
  if (!d) return fallback
  return d.toLocaleString(VN_LOCALE, { timeZone: VN_TIME_ZONE })
}

/** HH:mm:ss */
export function formatVnTime(value, options, fallback = '—') {
  const d = parseVnDate(value)
  if (!d) return fallback
  return d.toLocaleTimeString(VN_LOCALE, { timeZone: VN_TIME_ZONE, ...options })
}

/** Định dạng ngày với tuỳ chọn Intl tuỳ ý (weekday, month: 'long', ...) */
export function formatVnDateWith(value, options, fallback = '—') {
  const d = parseVnDate(value)
  if (!d) return fallback
  return d.toLocaleDateString(VN_LOCALE, { timeZone: VN_TIME_ZONE, ...options })
}

/** "yyyy-MM-dd" của hôm nay theo giờ Việt Nam. */
export function getVnTodayIso() {
  return new Date().toLocaleDateString('en-CA', { timeZone: VN_TIME_ZONE })
}

/** Năm hiện tại theo giờ Việt Nam. */
export function getVnYear() {
  return Number(new Date().toLocaleDateString('en-CA', { timeZone: VN_TIME_ZONE, year: 'numeric' }))
}
