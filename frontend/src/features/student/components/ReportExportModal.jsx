import { useState } from 'react'
import {
  FileSpreadsheet,
  Printer,
  Download,
  FileText,
  BookOpen,
  Calendar,
  X,
  CheckCircle2,
  Info,
} from 'lucide-react'
import {
  downloadActivityCsv,
  downloadWrongQuestionsCsv,
  downloadDailyReportsCsv,
} from '@student/api/reports.js'

/**
 * ReportExportModal — Phase R5
 * Cho phép học viên xuất báo cáo ra các file CSV chuẩn UTF-8 hoặc in / xuất PDF toàn diện.
 */
export default function ReportExportModal({ days, courseId, onClose }) {
  const [downloading, setDownloading] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleDownloadActivity = async () => {
    setDownloading('activity')
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      await downloadActivityCsv({ days, ...(courseId ? { courseId } : {}) })
      setSuccessMsg('Đã tải xuống file Nhật ký hoạt động học tập thành công!')
    } catch (err) {
      console.error('Lỗi tải CSV hoạt động:', err)
      setErrorMsg('Không thể xuất file hoạt động. Vui lòng thử lại sau.')
    } finally {
      setDownloading(null)
    }
  }

  const handleDownloadWrongQuestions = async () => {
    setDownloading('wrong')
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      await downloadWrongQuestionsCsv({ ...(courseId ? { courseId } : {}) })
      setSuccessMsg('Đã tải xuống file Sổ tay câu hỏi làm sai thành công!')
    } catch (err) {
      console.error('Lỗi tải CSV câu sai:', err)
      setErrorMsg('Không thể xuất file câu hỏi sai. Vui lòng thử lại sau.')
    } finally {
      setDownloading(null)
    }
  }

  const handleDownloadDailyReports = async () => {
    setDownloading('daily')
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      await downloadDailyReportsCsv()
      setSuccessMsg('Đã tải xuống file Nhật ký báo cáo ngày thành công!')
    } catch (err) {
      console.error('Lỗi tải CSV báo cáo ngày:', err)
      setErrorMsg('Không thể xuất file báo cáo ngày. Vui lòng thử lại sau.')
    } finally {
      setDownloading(null)
    }
  }

  const handlePrintPdf = () => {
    onClose()
    setTimeout(() => {
      window.print()
    }, 300)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 580,
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          background: '#ffffff',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
          <div className="flex-row" style={{ gap: 10, alignItems: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Xuất báo cáo & Dữ liệu học tập
              </h3>
              <p className="text-dim text-xs" style={{ margin: 0 }}>
                Hỗ trợ định dạng Excel / CSV tiếng Việt (UTF-8) và in xuất PDF
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
              padding: 4,
            }}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Thông báo kết quả */}
        {successMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Danh sách tùy chọn xuất */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Option 1: CSV Hoạt động học tập */}
          <div
            className="card hoverable"
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 10,
            }}
          >
            <div className="flex-row" style={{ gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  Nhật ký hoạt động học tập (.csv)
                </h4>
                <p className="text-dim text-xs" style={{ margin: '2px 0 0' }}>
                  Lịch sử học video & kiểm tra trong {days} ngày qua (chuẩn Excel UTF-8)
                </p>
              </div>
            </div>
            <button
              className="btn secondary sm flex-row"
              style={{ gap: 6, flexShrink: 0 }}
              onClick={handleDownloadActivity}
              disabled={downloading !== null}
            >
              <Download size={14} />
              <span>{downloading === 'activity' ? 'Đang tải...' : 'Tải CSV'}</span>
            </button>
          </div>

          {/* Option 2: CSV Sổ câu sai */}
          <div
            className="card hoverable"
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 10,
            }}
          >
            <div className="flex-row" style={{ gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  Sổ tay câu hỏi làm sai (.csv)
                </h4>
                <p className="text-dim text-xs" style={{ margin: '2px 0 0' }}>
                  Toàn bộ câu sai kèm đáp án đã chọn, đáp án đúng và lời giải
                </p>
              </div>
            </div>
            <button
              className="btn secondary sm flex-row"
              style={{ gap: 6, flexShrink: 0 }}
              onClick={handleDownloadWrongQuestions}
              disabled={downloading !== null}
            >
              <Download size={14} />
              <span>{downloading === 'wrong' ? 'Đang tải...' : 'Tải CSV'}</span>
            </button>
          </div>

          {/* Option 3: CSV Báo cáo ngày */}
          <div
            className="card hoverable"
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 10,
            }}
          >
            <div className="flex-row" style={{ gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#eff6ff',
                  color: 'var(--color-primary, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Calendar size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                  Nhật ký báo cáo ngày (.csv)
                </h4>
                <p className="text-dim text-xs" style={{ margin: '2px 0 0' }}>
                  Tổng hợp cảm xúc, điểm tập trung và lời khuyên sư phạm AI theo ngày
                </p>
              </div>
            </div>
            <button
              className="btn secondary sm flex-row"
              style={{ gap: 6, flexShrink: 0 }}
              onClick={handleDownloadDailyReports}
              disabled={downloading !== null}
            >
              <Download size={14} />
              <span>{downloading === 'daily' ? 'Đang tải...' : 'Tải CSV'}</span>
            </button>
          </div>

          {/* Option 4: In / Xuất PDF */}
          <div
            className="card hoverable"
            style={{
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderRadius: 10,
              border: '1.5px solid #a7f3d0',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            }}
          >
            <div className="flex-row" style={{ gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#d1fae5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Printer size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065f46' }}>
                  In hoặc Lưu báo cáo thành PDF
                </h4>
                <p className="text-dim text-xs" style={{ margin: '2px 0 0' }}>
                  Xuất toàn bộ giao diện báo cáo hiện tại sang file PDF với biểu đồ vector sắc nét
                </p>
              </div>
            </div>
            <button
              className="btn primary sm flex-row"
              style={{ gap: 6, flexShrink: 0, background: '#059669', borderColor: '#059669' }}
              onClick={handlePrintPdf}
            >
              <Printer size={14} />
              <span>In / Lưu PDF</span>
            </button>
          </div>
        </div>

        {/* Tip hướng dẫn in PDF */}
        <div
          style={{
            marginTop: 16,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--text-dim)',
          }}
        >
          <Info size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span>
            <strong>Mẹo khi in:</strong> Trong hộp thoại in của trình duyệt, tại mục <em>Máy in (Destination)</em>, hãy chọn
            <strong> &quot;Save as PDF&quot; (Lưu dưới dạng PDF)</strong> để tải file PDF về máy tính.
          </span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 18, textAlign: 'right' }}>
          <button className="btn secondary sm" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
