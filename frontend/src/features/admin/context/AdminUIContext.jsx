import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react'

const AdminUIContext = createContext(null)

export function AdminUIProvider({ children }) {
  // 1. Toast State
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++toastIdRef.current
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
      return id
    },
    [removeToast]
  )

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  }

  // 2. Confirm Dialog State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Xác nhận',
    cancelLabel: 'Hủy',
    variant: 'primary', // 'primary' | 'danger' | 'warning'
    resolve: null,
  })

  const confirm = useCallback(
    ({
      title = 'Xác nhận thao tác',
      message = 'Bạn có chắc chắn muốn thực hiện hành động này không?',
      confirmLabel = 'Xác nhận',
      cancelLabel = 'Hủy',
      variant = 'primary',
    }) => {
      return new Promise((resolve) => {
        setConfirmState({
          isOpen: true,
          title,
          message,
          confirmLabel,
          cancelLabel,
          variant,
          resolve,
        })
      })
    },
    []
  )

  const handleConfirmClose = (result) => {
    if (confirmState.resolve) {
      confirmState.resolve(result)
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false, resolve: null }))
  }

  return (
    <AdminUIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Notification Container (Bottom Right) */}
      <div
        className="admin-toast-container"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 99999,
          pointerEvents: 'none',
          maxWidth: 420,
        }}
      >
        {toasts.map((t) => {
          const typeConfig = {
            success: {
              icon: CheckCircle2,
              color: '#059669',
              bg: '#ffffff',
              border: 'rgba(16, 185, 129, 0.4)',
              iconBg: 'rgba(16, 185, 129, 0.12)',
            },
            error: {
              icon: XCircle,
              color: '#dc2626',
              bg: '#ffffff',
              border: 'rgba(239, 68, 68, 0.4)',
              iconBg: 'rgba(239, 68, 68, 0.12)',
            },
            warning: {
              icon: AlertTriangle,
              color: '#d97706',
              bg: '#ffffff',
              border: 'rgba(245, 158, 11, 0.4)',
              iconBg: 'rgba(245, 158, 11, 0.12)',
            },
            info: {
              icon: Info,
              color: '#2563eb',
              bg: '#ffffff',
              border: 'rgba(37, 99, 235, 0.4)',
              iconBg: 'rgba(37, 99, 235, 0.12)',
            },
          }[t.type] || {
            icon: Info,
            color: '#2563eb',
            bg: '#ffffff',
            border: '#e2e8f0',
            iconBg: '#f1f5f9',
          }

          const IconComponent = typeConfig.icon

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md, 10px)',
                background: typeConfig.bg,
                border: `1.5px solid ${typeConfig.border}`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
                animation: 'slideInRight 0.25s ease',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: typeConfig.iconBg,
                  color: typeConfig.color,
                  flexShrink: 0,
                }}
              >
                <IconComponent size={18} />
              </div>

              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: 'var(--text, #0f172a)',
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {t.message}
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Đóng thông báo"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: 'var(--text-dim, #94a3b8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                }}
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Confirm Dialog Modal */}
      {confirmState.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 440,
              padding: 24,
              borderRadius: 'var(--radius-lg, 14px)',
              background: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background:
                    confirmState.variant === 'danger'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : confirmState.variant === 'warning'
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(37, 99, 235, 0.12)',
                  color:
                    confirmState.variant === 'danger'
                      ? '#dc2626'
                      : confirmState.variant === 'warning'
                      ? '#d97706'
                      : '#2563eb',
                }}
              >
                {confirmState.variant === 'danger' ? (
                  <AlertTriangle size={22} />
                ) : confirmState.variant === 'warning' ? (
                  <AlertCircle size={22} />
                ) : (
                  <HelpCircle size={22} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: 16.5,
                    fontWeight: 700,
                    color: 'var(--text, #0f172a)',
                  }}
                >
                  {confirmState.title}
                </h3>
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-dim, #64748b)',
                    lineHeight: 1.5,
                  }}
                >
                  {confirmState.message}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => handleConfirmClose(false)}
                style={{ minWidth: 70 }}
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                className={`btn sm ${confirmState.variant === 'danger' ? 'danger' : 'primary'}`}
                onClick={() => handleConfirmClose(true)}
                style={{ minWidth: 80 }}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminUIContext.Provider>
  )
}

export function useAdminUI() {
  const ctx = useContext(AdminUIContext)
  if (!ctx) {
    // Fallback if accessed outside provider
    return {
      toast: {
        success: (m) => alert(m),
        error: (m) => alert(m),
        warning: (m) => alert(m),
        info: (m) => alert(m),
      },
      confirm: ({ message }) => Promise.resolve(window.confirm(message)),
    }
  }
  return ctx
}

export function useToast() {
  return useAdminUI().toast
}

export function useConfirm() {
  return useAdminUI().confirm
}
