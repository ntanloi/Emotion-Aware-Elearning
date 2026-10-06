import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as flashcardsApi from '@student/api/flashcards.js'

export function useFlashcards() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['flashcards', 'mine'], queryFn: flashcardsApi.myFlashcards })

  const reviewMutation = useMutation({
    mutationFn: ({ wordId, knewIt }) => flashcardsApi.reviewFlashcard(wordId, knewIt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flashcards', 'mine'] }),
  })

  return { ...query, review: reviewMutation.mutateAsync, reviewing: reviewMutation.isPending }
}
