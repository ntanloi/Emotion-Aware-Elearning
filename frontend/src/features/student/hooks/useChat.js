import { useState, useCallback } from 'react'
import * as chatApi from '@student/api/chat.js'

/**
 * FR-CHAT-01/02/03. Backend chưa có endpoint /api/chat/** (xem docs ghi chú đối chiếu).
 * Hook tự bắt lỗi và trả về flag `unavailable` để ChatWidget hiển thị thông báo phù hợp
 * mà không throw làm crash UI.
 */
export function useChat() {
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId
    try {
      const conv = await chatApi.createConversation()
      setConversationId(conv.id)
      return conv.id
    } catch {
      setUnavailable(true)
      return null
    }
  }, [conversationId])

  const send = useCallback(
    async (content) => {
      setSending(true)
      const userMsg = { sender: 'USER', content, createdAt: new Date().toISOString() }
      setMessages((prev) => [...prev, userMsg])
      try {
        const convId = await ensureConversation()
        if (!convId) return
        const botMsg = await chatApi.sendMessage(convId, content)
        setMessages((prev) => [...prev, botMsg])
      } catch {
        setUnavailable(true)
      } finally {
        setSending(false)
      }
    },
    [ensureConversation],
  )

  return { messages, send, sending, unavailable }
}
