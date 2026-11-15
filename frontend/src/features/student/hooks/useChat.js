import { useState, useCallback, useEffect } from 'react'
import * as chatApi from '@student/api/chat.js'
import { useChatStore } from '@student/stores/useChatStore.js'

export function useChat() {
  const { context, conversationId, setConversationId, resetToCourseAdvice } = useChatStore()

  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  // Tải lại tin nhắn khi đổi hội thoại
  useEffect(() => {
    let active = true

    if (!conversationId) {
      setMessages([])
      setErrorMessage(null)
      return
    }

    chatApi
      .getMessages(conversationId)
      .then((history) => {
        if (active) {
          setMessages(history || [])
          setUnavailable(false)
          setErrorMessage(null)
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Không thể tải lịch sử chat:', err)
          if (err.response?.status === 503) {
            setUnavailable(true)
          }
        }
      })

    return () => {
      active = false
    }
  }, [conversationId])

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId

    const payload = {
      contextType: context?.contextType || 'COURSE_ADVICE',
      contextRefId: context?.contextRefId || null,
    }

    const conv = await chatApi.createConversation(payload)
    setConversationId(conv.id)
    return conv.id
  }, [conversationId, context, setConversationId])

  const send = useCallback(
    async (content) => {
      if (!content || !content.trim()) return

      const text = content.trim()
      setSending(true)
      setErrorMessage(null)

      const userMsg = {
        id: 'tmp-' + Date.now(),
        sender: 'USER',
        content: text,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      try {
        const convId = await ensureConversation()
        if (!convId) return

        const botMsg = await chatApi.sendMessage(convId, text)
        setMessages((prev) => [...prev, botMsg])
        setUnavailable(false)
      } catch (err) {
        console.error('Lỗi gửi tin nhắn chat:', err)
        const status = err.response?.status
        const detail = err.response?.data?.message || err.response?.data?.error

        if (status === 429) {
          setErrorMessage(detail || 'Bạn đã đạt giới hạn 30 tin nhắn mỗi ngày.')
        } else if (status === 503) {
          setUnavailable(true)
          setErrorMessage(detail || 'Chatbot đang được nâng cấp, vui lòng quay lại sau.')
        } else if (status === 403) {
          setErrorMessage(detail || 'Bạn chưa nộp bài làm cho câu hỏi này.')
        } else {
          setErrorMessage(detail || 'Đã xảy ra lỗi khi gửi tin nhắn, vui lòng thử lại.')
        }
      } finally {
        setSending(false)
      }
    },
    [ensureConversation],
  )

  return {
    context,
    conversationId,
    messages,
    send,
    sending,
    unavailable,
    errorMessage,
    resetToCourseAdvice,
  }
}
