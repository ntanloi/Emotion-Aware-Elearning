import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabWordsApi from '@shared/api/vocabWords.js'

/** Toàn bộ thư viện từ vựng riêng của giáo viên đang đăng nhập */
export function useVocabLibrary() {
  return useQuery({
    queryKey: ['vocab-words', 'mine'],
    queryFn: vocabWordsApi.listMyVocabWords,
  })
}

export function useCreateVocabWord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vocabWordsApi.createVocabWord,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab-words', 'mine'] }),
  })
}

export function useUpdateVocabWord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => vocabWordsApi.updateVocabWord(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab-words', 'mine'] }),
  })
}

export function useDeleteVocabWord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vocabWordsApi.deleteVocabWord,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab-words', 'mine'] }),
  })
}
