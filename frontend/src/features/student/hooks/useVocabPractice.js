import { useQuery } from '@tanstack/react-query'
import * as vocabPracticeApi from '@student/api/vocabPractice.js'

/** BR-18: lấy câu hỏi ảo cho 1 trong 5 dạng luyện tập tự vựng */
export function useVocabPractice(contentItemId, practiceType) {
  return useQuery({
    queryKey: ['vocab-practice', contentItemId, practiceType],
    queryFn: () => vocabPracticeApi.getVocabPractice(contentItemId, practiceType),
    enabled: !!contentItemId && !!practiceType,
  })
}
