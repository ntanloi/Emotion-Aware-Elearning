import { useState, useCallback } from 'react'
import * as attemptsApi from '@student/api/attempts.js'

/**
 * useAttempt — dùng chung cho mọi loại nộp bài (Part 1–7/ngữ pháp/chính tả/từ vựng ảo).
 * start() trả về { attemptId, timeLimitMinutes, questions, vocabQuestions }.
 * submit() cần truyền lại đúng practiceType đã dùng lúc start (nếu là VOCAB_SET).
 */
export function useAttempt() {
  const [attempt, setAttempt] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const start = useCallback(async (contentItemId, practiceType) => {
    setLoading(true)
    setError(null)
    try {
      const data = await attemptsApi.startAttempt(contentItemId, practiceType)
      setAttempt(data)
      setResult(null)
      return data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const submit = useCallback(
    async (practiceType, answers) => {
      if (!attempt) throw new Error('Chưa start attempt')
      setLoading(true)
      setError(null)
      try {
        const data = await attemptsApi.submitAttempt(attempt.attemptId, practiceType, answers)
        setResult(data)
        return data
      } catch (err) {
        setError(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [attempt],
  )

  const reset = useCallback(() => {
    setAttempt(null)
    setResult(null)
    setError(null)
  }, [])

  return { attempt, result, loading, error, start, submit, reset }
}
