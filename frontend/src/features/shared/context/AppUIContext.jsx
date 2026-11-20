import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  X,
  XCircle,
} from 'lucide-react'

/**
 * AppUIContext — Hệ thống thông báo & hộp thoại dùng chung cho TOÀN BỘ ứng dụng
 * (học viên, giảng viên, quản trị viên), thay thế hoàn toàn `alert` / `window.confirm` /
 * `window.prompt` của trình duyệt.
 *
 *   const toast = useToast()
 *   toast.success('Đã lưu')            // success | error | warning | info
 *
 *   const confirm = useConfirm()
 *   const ok = await confirm({ title, message, confirmLabel, cancelLabel, variant })
 *   // variant: 'primary' | 'danger' | 'warning' ; trả về true / false
 *
 *   const prompt = usePrompt()
 *   const value = await prompt({ title, message, placeholder, defaultValue, validate })
 *   // trả về chuỗi đã trim, hoặc null nếu người dùng huỷ
 */

const AppUIContext = createContext(null)

const MAX_TOASTS = 5
const DEFAULT_DURATION = { success: 3500, info: 4000, warning: 5500, error: 6500 }

const TOAST_STYLES = {
  success: { icon: CheckCircle2, color: '#059669', border: 'rgba(16, 185, 129, 0.45)', iconBg: 'rgba(16, 185, 129, 0.12)' },
  error: { icon: XCircle, color: '#dc2626', border: 'rgba(239, 68, 68, 0.45)', iconBg: 'rgba(239, 68, 68, 0.12)' },
  warning: { icon: AlertTriangle, color: '#d97706', border: 'rgba(245, 158, 11, 0.45)', iconBg: 'rgba(245, 158, 11, 0.12)' },
  info: { icon: Info, color: '#2563eb', border: 'rgba(37, 99, 235, 0.4)', iconBg: 'rgba(37, 99, 235, 0.12)' },
}

const VARIANT_STYLES = {
  primary: { icon: HelpCircle, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.12)' },
  warning: { icon: AlertCircle, color: '#d97706', bg: 'rgba(245, 158, 11, 0.12)' },
  danger: { icon: AlertTriangle, color: '#dc2626', bg: 'rgba(239, 68, 68, 0.12)' },
}

const Z_DIALOG = 100200
const Z_TOAST = 100300

const KEYFRAMES = `
@keyframes appui-toast-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
@keyframes appui-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes appui-pop-in { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .appui-anim { animation: none !important; }
}
`

/** Hộp thoại xác nhận / nhập liệu (hiển thị lần lượt nếu có nhiều yêu cầu cùng lúc). */
function DialogHost({ dialog, onClose }) {
  const { kind, options } = dialog
  const isPrompt = kind === 'prompt'
  const variant = VARIANT_STYLES[options.variant] ? options.variant : 'primary'
  const vs = VARIANT_STYLES[variant]
  const Icon = vs.icon

  const [value, setValue] = useState(options.defaultValue ?? '')
  const [error, setError] = useState('')
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)
  const titleId = useRef(`appui-title-${dialog.id}`).current
  const descId = useRef(`appui-desc-${dialog.id}`).current

  // Khôi phục focus về phần tử trước đó khi đóng hộp thoại
  useEffect(() => {
    const previous = document.activeElement
    return () => {
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus()
      }
    }
  }, [])

  // Focus ban đầu: ô nhập (prompt) · nút Hủy (thao tác nguy hiểm) · nút xác nhận
  useEffect(() => {
    const target = isPrompt
      ? inputRef.current
      : variant === 'danger'
        ? cancelRef.current
        : confirmRef.current
    target?.focus()
    if (isPrompt) target?.select?.()
  }, [isPrompt, variant])

  const cancel = () => onClose(isPrompt ? null : false)

  const submit = () => {
    if (!isPrompt) {
      onClose(true)
      return
    }
    const trimmed = String(value).trim()
    if (options.required !== false && !trimmed) {
      setError(options.requiredMessage || 'Vui lòng nhập giá trị.')
      inputRef.current?.focus()
      return
    }
    const validationError = options.validate ? options.validate(trimmed) : null
    if (validationError) {
      setError(validationError)
      inputRef.current?.focus()
      return
    }
    onClose(trimmed)
  }

  // Esc để huỷ (chặn không cho Modal bên dưới cũng đóng theo) + giữ focus trong hộp thoại khi Tab
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onClose(isPrompt ? null : false)
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isPrompt, onClose])

  return createPortal(
    <div
      className="appui-anim"
      onMouseDown={() => {
        // Với hộp thoại nhập liệu, không đóng khi bấm nền để tránh mất dữ liệu đang gõ
        if (!isPrompt) cancel()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_DIALOG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        animation: 'appui-fade-in 0.15s ease',
      }}
    >
      <div
        ref={panelRef}
        role={isPrompt ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.message ? descId : undefined}
        className="appui-anim"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 24,
          borderRadius: 'var(--radius-lg, 14px)',
          background: 'var(--surface, #ffffff)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          animation: 'appui-pop-in 0.18s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: vs.bg,
              color: vs.color,
            }}
          >
            <Icon size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              id={titleId}
              style={{ margin: '0 0 6px 0', fontSize: 16.5, fontWeight: 700, color: 'var(--text, #0f172a)' }}
            >
              {options.title}
            </h3>
            {options.message ? (
              <div
                id={descId}
                style={{
                  fontSize: 13.5,
                  color: 'var(--text-dim, #475569)',
                  lineHeight: 1.5,
                  whiteSpace: typeof options.message === 'string' ? 'pre-line' : undefined,
                  wordBreak: 'break-word',
                }}
              >
                {options.message}
              </div>
            ) : null}

            {isPrompt && (
              <div style={{ marginTop: 14 }}>
                <input
                  ref={inputRef}
                  type={options.inputType || 'text'}
                  value={value}
                  placeholder={options.placeholder || ''}
                  aria-label={options.title}
                  aria-invalid={error ? 'true' : undefined}
                  onChange={(e) => {
                    setValue(e.target.value)
                    if (error) setError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submit()
                    }
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: 'var(--text, #0f172a)',
                    background: 'var(--surface, #ffffff)',
                    border: `1.5px solid ${error ? '#dc2626' : 'var(--border, #cbd5e1)'}`,
                    borderRadius: 'var(--radius-md, 8px)',
                    outline: 'none',
                  }}
                />
                {error && (
                  <div role="alert" style={{ marginTop: 6, fontSize: 12.5, color: '#dc2626' }}>
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button
            ref={cancelRef}
            type="button"
            className="btn secondary sm"
            onClick={cancel}
            style={{ minWidth: 72 }}
          >
            {options.cancelLabel || 'Hủy'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn sm ${variant === 'danger' ? 'danger' : 'primary'}`}
            onClick={submit}
            style={{ minWidth: 84 }}
          >
            {options.confirmLabel || (isPrompt ? 'Đồng ý' : 'Xác nhận')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Danh sách toast (góc dưới bên phải) */
function ToastStack({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return createPortal(
    <div
      role="region"
      aria-label="Thông báo"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: Z_TOAST,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 'min(420px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const cfg = TOAST_STYLES[t.type] || TOAST_STYLES.info
        const Icon = cfg.icon
        return (
          <div
            key={t.id}
            role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
            className="appui-anim"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'var(--surface, #ffffff)',
              border: `1.5px solid ${cfg.border}`,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.14)',
              animation: 'appui-toast-in 0.25s ease',
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
                background: cfg.iconBg,
                color: cfg.color,
                flexShrink: 0,
              }}
            >
              <Icon size={18} />
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13.5,
                fontWeight: 500,
                lineHeight: 1.45,
                color: 'var(--text, #0f172a)',
                wordBreak: 'break-word',
              }}
            >
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => onRemove(t.id)}
              aria-label="Đóng thông báo"
              style={{
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                color: 'var(--text-muted, #94a3b8)',
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
    </div>,
    document.body,
  )
}

export function AppUIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialogs, setDialogs] = useState([])
  const toastIdRef = useRef(0)
  const dialogIdRef = useRef(0)
  const timersRef = useRef(new Map())

  const removeToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = 'info', duration) => {
      const text = message === null || message === undefined ? '' : String(message)
      if (!text) return null
      const id = ++toastIdRef.current
      const ms = duration === undefined ? DEFAULT_DURATION[type] ?? 4000 : duration

      setToasts((prev) => {
        // Cùng nội dung đang hiển thị -> thay thế để không bị chồng thông báo trùng lặp
        const rest = prev.filter((t) => {
          const dup = t.type === type && t.message === text
          if (dup) {
            const timer = timersRef.current.get(t.id)
            if (timer) clearTimeout(timer)
            timersRef.current.delete(t.id)
          }
          return !dup
        })
        return [...rest, { id, message: text, type }].slice(-MAX_TOASTS)
      })

      if (ms > 0) {
        timersRef.current.set(
          id,
          setTimeout(() => removeToast(id), ms),
        )
      }
      return id
    },
    [removeToast],
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  const toast = useMemo(
    () => ({
      success: (msg, duration) => addToast(msg, 'success', duration),
      error: (msg, duration) => addToast(msg, 'error', duration),
      warning: (msg, duration) => addToast(msg, 'warning', duration),
      info: (msg, duration) => addToast(msg, 'info', duration),
      dismiss: removeToast,
    }),
    [addToast, removeToast],
  )

  const openDialog = useCallback((kind, options = {}) => {
    return new Promise((resolve) => {
      const id = ++dialogIdRef.current
      setDialogs((prev) => [...prev, { id, kind, options, resolve }])
    })
  }, [])

  const confirm = useCallback(
    (options = {}) =>
      openDialog('confirm', {
        title: 'Xác nhận thao tác',
        message: 'Bạn có chắc chắn muốn thực hiện hành động này không?',
        variant: 'primary',
        ...options,
      }),
    [openDialog],
  )

  const prompt = useCallback(
    (options = {}) =>
      openDialog('prompt', {
        title: 'Nhập thông tin',
        variant: 'primary',
        ...options,
      }),
    [openDialog],
  )

  const current = dialogs[0] || null
  const currentRef = useRef(null)
  currentRef.current = current

  const closeCurrent = useCallback((result) => {
    const target = currentRef.current
    if (!target) return
    target.resolve(result)
    setDialogs((prev) => prev.filter((d) => d.id !== target.id))
  }, [])

  const value = useMemo(() => ({ toast, confirm, prompt }), [toast, confirm, prompt])

  return (
    <AppUIContext.Provider value={value}>
      {children}
      <style>{KEYFRAMES}</style>
      <ToastStack toasts={toasts} onRemove={removeToast} />
      {current && <DialogHost key={current.id} dialog={current} onClose={closeCurrent} />}
    </AppUIContext.Provider>
  )
}

/**
 * Dự phòng khi hook được gọi ngoài Provider (ví dụ khi test component riêng lẻ):
 * chỉ ghi log, KHÔNG dùng hộp thoại gốc của trình duyệt.
 * `confirm` trả về false (không thực hiện thao tác) và `prompt` trả về null.
 */
const FALLBACK_UI = {
  toast: {
    success: (m) => console.info('[toast:success]', m),
    error: (m) => console.error('[toast:error]', m),
    warning: (m) => console.warn('[toast:warning]', m),
    info: (m) => console.info('[toast:info]', m),
    dismiss: () => {},
  },
  confirm: () => {
    console.error('useConfirm() được gọi ngoài <AppUIProvider>; thao tác bị huỷ.')
    return Promise.resolve(false)
  },
  prompt: () => {
    console.error('usePrompt() được gọi ngoài <AppUIProvider>; thao tác bị huỷ.')
    return Promise.resolve(null)
  },
}

export function useUI() {
  return useContext(AppUIContext) || FALLBACK_UI
}

export function useToast() {
  return useUI().toast
}

export function useConfirm() {
  return useUI().confirm
}

export function usePrompt() {
  return useUI().prompt
}
