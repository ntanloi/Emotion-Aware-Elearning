import { useMutation, useQueryClient } from '@tanstack/react-query'
import { generateDictationQuestions } from '@shared/api/contentItems.js'

/** payload: { vocabWordIds?: string[], sourceGroupIds?: string[] } */
export function useGenerateDictation(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => generateDictationQuestions(contentItemId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions', 'teacher-view', contentItemId] }),
  })
}
