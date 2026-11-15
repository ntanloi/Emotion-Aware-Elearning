import React, { useState, useEffect } from 'react'
import Modal from '@shared/components/ui/Modal.jsx'
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'

/**
 * Component Modal hành động chuẩn cho Quản trị viên (thay thế window.alert/confirm/prompt)
 */
export default function AdminActionModal({
  open,
  type = 'confirm', // 'confirm' | 'prompt'
  title = 'Xác nhận hành động',
  message = '',
  placeholder = 'Nhập lý do chi tiết...',
  presets = [],
  defaultValue = '',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'primary', // 'primary' | 'danger'
  loading = false,
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState(defaultValue)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setValue(defaultValue)
      setSelectedPreset('')
      setError('')
    }
  }, [open, defaultValue])

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset)
    if (preset === 'Khác') {
      setValue('')
    } else {
      setValue(preset)
    }
    setError('')
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (type === 'prompt') {
      const trimmed = value.trim()
      if (!trimmed) {
        setError('Vui lòng nhập lý do cụ thể')
        return
      }
      onConfirm(trimmed)
    } else {
      onConfirm()
    }
  }

  if (!open) return null

  return (
    <Modal open={open} title={title} onClose={loading ? undefined : onClose} width={520}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {variant === 'danger' ? (
            <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
          ) : (
            <HelpCircle size={24} style={{ color: 'var(--primary, #3b82f6)', flexShrink: 0, marginTop: 2 }} />
          )}
          <div style={{ flex: 1 }}>
            {message && (
              <p style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-main, #1e293b)', lineHeight: 1.5 }}>
                {message}
              </p>
            )}

            {type === 'prompt' && (
              <>
                {presets.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim, #64748b)', marginBottom: 6 }}>
                      Lý do thường gặp:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`btn xs ${selectedPreset === preset ? 'btn-primary' : 'btn-ghost'}`}
                          style={{
                            fontSize: 12,
                            padding: '3px 8px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            borderRadius: 4
                          }}
                          onClick={() => handlePresetClick(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <textarea
                    rows={4}
                    className="form-control"
                    style={{ width: '100%', resize: 'vertical', fontSize: 13, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value)
                      if (error) setError('')
                    }}
                    autoFocus
                  />
                  {error && (
                    <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                      {error}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
          <button
            type="button"
            className="btn btn-ghost sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="submit"
            className={`btn sm ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </form>
    </Modal>
  )
}
