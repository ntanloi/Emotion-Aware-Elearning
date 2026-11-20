import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, MessageSquare, Star, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useNotifications } from '@shared/hooks/useNotifications.js'
import { parseRejectReason } from '@teacher/utils/rejectReasonParser.js'
import { useAuthStore } from '@auth/store/authStore.js'
import { resolveNotificationTarget } from '@shared/utils/notificationNavigation.js'

import { parseVnDate, formatVnDate } from '@shared/utils/dateTime.js'
function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const date = parseVnDate(dateStr)
  if (!date) return ''
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diffSec < 60) return 'Vừa xong'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`
  return formatVnDate(date)
}

function formatNotificationPreview(n) {
  if (n.type === 'COURSE_REJECTED') {
    const parsed = parseRejectReason(n.content)
    const match = n.content.match(/Khóa học "([^"]+)"/)
    const title = match ? match[1] : 'Khóa học'

    if (parsed.adminNote) {
      return `Khóa học "${title}" cần sửa: "${parsed.adminNote}". Nhấn để xem chi tiết ${parsed.issues.length > 0 ? `(${parsed.issues.length} vấn đề)` : ''}.`
    }
    return `Khóa học "${title}" chưa đạt điều kiện phê duyệt. Nhấn để xem chi tiết các mục cần sửa.`
  }
  return n.content
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = (n) => {
    if (!n.isRead) {
      markAsRead.mutate(n.id)
    }
    setOpen(false)

    // Chỉ navigate tới route hợp lệ theo vai trò (xem notificationNavigation.js)
    const target = resolveNotificationTarget(n, role)
    if (target) {
      navigate(target)
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'COURSE_REJECTED':
        return <AlertTriangle size={16} style={{ color: '#dc2626' }} />
      case 'COURSE_APPROVED':
        return <CheckCircle2 size={16} style={{ color: '#059669' }} />
      case 'NEW_REVIEW':
        return <Star size={16} style={{ color: 'var(--warn, #f59e0b)' }} />
      case 'TEACHER_REPLY':
        return <MessageSquare size={16} style={{ color: 'var(--accent, #6366f1)' }} />
      default:
        return <Info size={16} style={{ color: 'var(--good, #10b981)' }} />
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Nút bấm Chuông thông báo */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Thông báo"
        style={{
          position: 'relative',
          background: open ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
          border: 'none',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-main, #334155)',
          transition: 'all 0.15s ease',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: 'var(--bad, #ef4444)',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown danh sách thông báo */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 480,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
            border: '1px solid var(--border, #e2e8f0)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header Dropdown */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong style={{ fontSize: 14, color: '#0f172a' }}>Thông báo</strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#dc2626',
                    backgroundColor: '#fee2e2',
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead.mutate()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent, #0284c7)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                }}
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
            )}
          </div>

          {/* List nội dung */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 400 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b' }}>
                <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: n.isRead ? '#ffffff' : 'rgba(99, 102, 241, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = n.isRead ? '#f8fafc' : 'rgba(99, 102, 241, 0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = n.isRead ? '#ffffff' : 'rgba(99, 102, 241, 0.05)'
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: n.type === 'COURSE_REJECTED' ? '#fee2e2' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {getIcon(n.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.isRead ? 600 : 700, color: '#0f172a', marginBottom: 2 }}>
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#475569',
                        lineHeight: 1.4,
                        marginBottom: 4,
                        wordBreak: 'break-word',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={n.content}
                    >
                      {formatNotificationPreview(n)}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {formatTimeAgo(n.createdAt)}
                    </div>
                  </div>

                  {!n.isRead && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: n.type === 'COURSE_REJECTED' ? '#dc2626' : 'var(--accent, #6366f1)',
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
