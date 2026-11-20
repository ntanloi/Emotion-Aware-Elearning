import React, { useState, useEffect, useCallback } from 'react'
import * as financeApi from '@admin/api/finance.js'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sliders,
  DollarSign,
  FileCheck2,
  HelpCircle
} from 'lucide-react'

import { formatVnDate, formatVnDateTime } from '@shared/utils/dateTime.js'
export default function AdminRewardsEscrowTab({ showToast }) {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [escrowsData, setEscrowsData] = useState({ escrows: { content: [], totalPages: 0, totalElements: 0 }, totalHolding: 0 })
  const [config, setConfig] = useState(null)
  const [reconcileReport, setReconcileReport] = useState(null)
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchEscrows = useCallback(async () => {
    try {
      setLoading(true)
      const res = await financeApi.getAdminEscrows({ status, page, size: 15 })
      setEscrowsData(res || { escrows: { content: [], totalPages: 0, totalElements: 0 }, totalHolding: 0 })
    } catch (err) {
      console.error('Lỗi tải danh sách escrow:', err)
    } finally {
      setLoading(false)
    }
  }, [status, page])

  const fetchConfigAndReconcile = useCallback(async () => {
    try {
      const [cfg, rec] = await Promise.all([
        financeApi.getAdminRewardConfig().catch(() => null),
        financeApi.getAdminReconcileReport().catch(() => null),
      ])
      setConfig(cfg)
      setReconcileReport(rec)
    } catch (err) {
      console.error('Lỗi tải config/reconcile:', err)
    }
  }, [])

  useEffect(() => {
    fetchEscrows()
  }, [fetchEscrows])

  useEffect(() => {
    fetchConfigAndReconcile()
  }, [fetchConfigAndReconcile])

  const handleRunReconcile = async () => {
    try {
      setReconcileLoading(true)
      const res = await financeApi.runAdminReconcile()
      setReconcileReport(res)
      if (!res || res.length === 0) {
        showToast('Đối soát hoàn tất: Sổ cái toàn vẹn, 0 vi phạm!')
      } else {
        showToast(`Phát hiện ${res.length} điểm lệch sổ cái!`, 'warning')
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi chạy đối soát', 'error')
    } finally {
      setReconcileLoading(false)
    }
  }

  const items = escrowsData.escrows?.content || []
  const totalPages = escrowsData.escrows?.totalPages || 0
  const totalElements = escrowsData.escrows?.totalElements || 0
  const totalHolding = Number(escrowsData.totalHolding || 0)

  return (
    <div>
      {/* 1. THẺ THỐNG KÊ ESCROW & THAM SỐ CHÍNH SÁCH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Card: Tổng tiền đang giữ hộ */}
        <div className="card" style={{ padding: 20, borderRadius: 12, background: 'var(--surface, #ffffff)', border: '1px solid var(--border)' }}>
          <div className="flex-between" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tổng tiền đang giữ hộ (HOLDING)
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#4f46e5', marginBottom: 8 }}>
            {totalHolding.toLocaleString('vi-VN')} <span style={{ fontSize: 18 }}>đ</span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dim)' }}>
            Khoản 10% tạm giữ từ các đơn thanh toán bằng ví, sẵn sàng hoàn thưởng cho học viên hoặc chuyển cho giảng viên khi hết hạn.
          </p>
        </div>

        {/* Card: Tham số chính sách (Chỉ đọc) */}
        <div className="card" style={{ padding: 20, borderRadius: 12, background: 'var(--surface, #ffffff)', border: '1px solid var(--border)' }}>
          <div className="flex-between" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tham số chương trình thưởng (Chỉ đọc)
            </span>
            <span style={{ fontSize: 11, background: config?.enabled ? '#dcfce7' : '#fee2e2', color: config?.enabled ? '#166534' : '#991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
              {config?.enabled ? 'Đang kích hoạt' : 'Chế độ theo dõi (Tắt giữ tiền)'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 12.5 }}>
            <div>• Tỷ lệ giữ hộ: <strong>{Number(config?.escrowPercent || 10)}%</strong></div>
            <div>• Tỷ lệ video đạt: <strong>{Number(config?.requiredVideoPercent || 70)}%</strong></div>
            <div>• Độ phủ tối thiểu: <strong>{config?.minCoveragePercent || 80}%</strong></div>
            <div>• Rời cam tối đa: <strong>{config?.maxBadPercent || 20}%</strong></div>
            <div>• Thời hạn khóa học: <strong>&ge; {config?.minAccessMonths || 6} tháng</strong></div>
            <div>• Hạn chót bắt đầu: <strong>{config?.startDeadlineDays || 365} ngày</strong></div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
            Chính sách phiên bản: <strong>{config?.policyVersion || 'v1'}</strong>
          </div>
        </div>
      </div>

      {/* 2. KHỐI ĐỐI SOÁT SỔ CÁI HẰNG ĐÊM */}
      <div className="card" style={{ padding: 20, borderRadius: 12, marginBottom: 24, background: 'var(--surface, #ffffff)', border: '1px solid var(--border)' }}>
        <div className="flex-between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} color="var(--accent, #2563eb)" />
              <span>Đối soát tính toàn vẹn sổ cái ví &amp; Escrow</span>
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
              Kiểm tra 8 quy tắc toàn vẹn tài chính (khớp tiền đơn hàng, khớp số dư ví học viên, kiểm tra lệnh rút tiền).
            </p>
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-primary sm flex-row"
            style={{ gap: 6 }}
            onClick={handleRunReconcile}
            disabled={reconcileLoading}
          >
            <RefreshCw size={14} className={reconcileLoading ? 'spin' : ''} />
            <span>{reconcileLoading ? 'Đang kiểm tra...' : 'Chạy đối soát ngay'}</span>
          </button>
        </div>

        {reconcileReport === null ? (
          <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>Đang kiểm tra dữ liệu đối soát...</p>
        ) : reconcileReport.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13 }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>
              <strong>Tuyệt vời!</strong> Sổ cái tài chính hoàn toàn toàn vẹn. Tất cả 8 quy tắc kiểm tra chéo đều trả về 0 vi phạm.
            </span>
          </div>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}>
              <AlertTriangle size={18} color="#dc2626" />
              <span>Phát hiện {reconcileReport.length} vi phạm đối soát sổ cái! Cần xử lý ngay:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reconcileReport.map((d, idx) => (
                <li key={idx}>
                  <strong>{d.rule}:</strong> {d.description} (IDs vi phạm: {JSON.stringify(d.offendingIds)})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3. BẢNG DANH SÁCH ESCROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: '', label: 'Tất cả trạng thái' },
            { id: 'HOLDING', label: 'Đang giữ hộ (HOLDING)' },
            { id: 'CLAIMED', label: 'Đã hoàn thưởng (CLAIMED)' },
            { id: 'RELEASED', label: 'Đã chuyển GV (RELEASED)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-btn sm ${status === tab.id ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => {
                setStatus(tab.id)
                setPage(0)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap" style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--border)', borderRadius: 10, overflowX: 'auto' }}>
        {loading ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)' }}>Đang tải danh sách escrow...</p>
        ) : items.length === 0 ? (
          <p style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)' }}>Không có khoản giữ hộ nào.</p>
        ) : (
          <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover, #f8fafc)', borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                <th style={{ padding: '10px 14px' }}>Mã Escrow</th>
                <th style={{ padding: '10px 14px' }}>Học viên</th>
                <th style={{ padding: '10px 14px' }}>Giảng viên</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Số tiền (10%)</th>
                <th style={{ padding: '10px 14px' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px' }}>Hạn giữ (holdingUntil)</th>
                <th style={{ padding: '10px 14px' }}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const isHolding = e.status === 'HOLDING'
                const isClaimed = e.status === 'CLAIMED'
                const isReleased = e.status === 'RELEASED'

                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12 }}>
                      #{e.id?.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12 }}>
                      {e.userId}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12 }}>
                      {e.teacherId}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      {Number(e.amount).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {isHolding && (
                        <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent, #2563eb)', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                          Đang giữ hộ
                        </span>
                      )}
                      {isClaimed && (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                          Đã hoàn thưởng
                        </span>
                      )}
                      {isReleased && (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11.5 }}>
                          Đã chuyển GV
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: 12 }}>
                      {e.holdingUntil ? formatVnDate(e.holdingUntil) : '---'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: 12 }}>
                      {formatVnDateTime(e.createdAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Trang {page + 1} / {totalPages} ({totalElements} bản ghi)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
