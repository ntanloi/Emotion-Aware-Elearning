import { useState, useRef, useEffect } from 'react'
import { useChat } from '@student/hooks/useChat.js'

/** ChatWidget — Giai đoạn 6, Bước 13. Khung chat nổi (FR-CHAT-01/02/03). */
export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const { messages, send, sending, unavailable } = useChat()
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, open])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    send(text.trim())
    setText('')
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label="Mở chat">
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>🤖 Trợ lý AI tư vấn khóa học</span>
          </div>
          <div className="chat-panel-body" ref={bodyRef}>
            {messages.length === 0 && (
              <p className="text-dim text-sm">Hỏi mình về khóa học, lộ trình học TOEIC phù hợp với bạn nhé!</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.sender === 'USER' ? 'user' : 'bot'}`}>
                {m.content}
              </div>
            ))}
            {sending && <div className="chat-msg bot">Đang trả lời...</div>}
            {unavailable && (
              <p className="text-sm" style={{ color: 'var(--warn)' }}>
                Chatbot đang được nâng cấp, vui lòng quay lại sau.
              </p>
            )}
          </div>
          <form className="chat-panel-footer" onSubmit={submit}>
            <input
              className="input"
              placeholder="Nhập câu hỏi..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn sm" type="submit" disabled={sending}>Gửi</button>
          </form>
        </div>
      )}
    </>
  )
}
