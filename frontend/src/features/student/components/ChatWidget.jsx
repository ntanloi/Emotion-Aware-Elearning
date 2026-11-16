import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Bot, HelpCircle, ArrowLeft, RefreshCw, Send } from 'lucide-react'
import { useChat } from '@student/hooks/useChat.js'
import { useChatStore } from '@student/stores/useChatStore.js'

export default function ChatWidget() {
  const { open, setOpen, toggleOpen } = useChatStore()
  const {
    context,
    messages,
    send,
    sending,
    unavailable,
    errorMessage,
    resetToCourseAdvice,
  } = useChat()

  const [text, setText] = useState('')
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages, sending, open])

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    send(text.trim())
    setText('')
  }

  const handleSuggestionClick = (suggestion) => {
    if (sending) return
    send(suggestion)
  }

  const isExplainMode = context?.contextType === 'QUESTION_EXPLAIN'

  // Phân tích và render nội dung tin nhắn, biến [[course:ID]] thành link trực tiếp
  const renderMessageContent = (content) => {
    if (!content) return null
    const parts = content.split(/(\[\[course:[a-zA-Z0-9\-]+\]\])/g)

    return parts.map((part, index) => {
      const match = part.match(/^\[\[course:([a-zA-Z0-9\-]+)\]\]$/)
      if (match) {
        const courseId = match[1]
        return (
          <Link
            key={index}
            to={`/courses/${courseId}`}
            className="chat-course-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              margin: '2px 4px',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'var(--accent)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Xem khóa học
          </Link>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const courseSuggestions = [
    'Lộ trình TOEIC từ 0 lên 550',
    'Khóa luyện nghe TOEIC hay nhất',
    'Khóa học TOEIC miễn phí',
  ]

  const questionSuggestions = [
    'Giải thích chi tiết câu này giúp mình',
    'Vì sao lựa chọn của mình chưa đúng?',
    'Chỉ ra mẹo và điểm ngữ pháp câu này',
  ]

  return (
    <>
      <button
        className="chat-fab"
        onClick={toggleOpen}
        aria-label={open ? 'Đóng khung chat' : 'Mở khung chat trợ lý AI'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          className="chat-panel"
          style={{
            width: 'min(380px, calc(100vw - 24px))',
            maxHeight: 'min(520px, calc(100vh - 100px))',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            className="chat-panel-header"
            style={{
              padding: '12px 16px',
              background: isExplainMode ? 'var(--surface-2)' : 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isExplainMode ? (
                <HelpCircle size={18} color="var(--accent)" />
              ) : (
                <Bot size={18} color="var(--accent)" />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>
                  {isExplainMode ? 'Gia sư AI giải thích câu hỏi' : 'Trợ lý AI tư vấn khóa học'}
                </div>
                {isExplainMode && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    Chế độ giải thích câu đã làm
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isExplainMode && (
                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={resetToCourseAdvice}
                  title="Chuyển về tư vấn khóa học"
                >
                  <ArrowLeft size={12} style={{ marginRight: 4 }} />
                  Tư vấn khóa
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Đóng chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            className="chat-panel-body"
            ref={bodyRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <p className="text-dim text-sm" style={{ marginBottom: 12, lineHeight: 1.5 }}>
                  {isExplainMode
                    ? 'Bạn có thể hỏi bất kỳ thắc mắc nào về câu hỏi này, ngữ pháp, từ vựng hoặc mẹo làm bài.'
                    : 'Hỏi mình về khóa học, lộ trình học TOEIC phù hợp với mục tiêu của bạn nhé.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(isExplainMode ? questionSuggestions : courseSuggestions).map(
                    (sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn secondary sm"
                        style={{
                          fontSize: 12,
                          textAlign: 'left',
                          padding: '6px 10px',
                          borderRadius: 6,
                        }}
                        onClick={() => handleSuggestionClick(sug)}
                        disabled={sending}
                      >
                        {sug}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={m.id || i}
                className={`chat-msg ${m.sender === 'USER' ? 'user' : 'bot'}`}
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.sender === 'BOT' ? renderMessageContent(m.content) : m.content}
              </div>
            ))}

            {sending && (
              <div
                className="chat-msg bot"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text-dim)',
                  fontStyle: 'italic',
                }}
              >
                <RefreshCw size={13} className="spin" /> Đang trả lời...
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {errorMessage}
              </div>
            )}

            {unavailable && !errorMessage && (
              <p className="text-sm" style={{ color: 'var(--warn)' }}>
                Chatbot đang được nâng cấp, vui lòng quay lại sau.
              </p>
            )}
          </div>

          {/* Footer */}
          <form className="chat-panel-footer" onSubmit={submit} style={{ padding: 10 }}>
            <input
              className="input"
              placeholder={isExplainMode ? 'Hỏi thêm về câu hỏi này...' : 'Nhập câu hỏi...'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
              maxLength={500}
            />
            <button
              className="btn sm"
              type="submit"
              disabled={sending || !text.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '0 14px',
              }}
            >
              <Send size={14} />
              Gửi
            </button>
          </form>
        </div>
      )}
    </>
  )
}
