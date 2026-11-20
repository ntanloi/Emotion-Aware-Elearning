import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabWordsApi from '@shared/api/vocabWords.js'

/**
 * Phân trang thư viện từ vựng riêng của giáo viên (server-side pagination).
 * Nhấn qua page nào thì CHỈ LOAD đúng dữ liệu của page đó từ backend,
 * giúp tiết kiệm tối đa request đọc/ghi và credit Cloudinary.
 */
export function useVocabLibraryPage({ page = 0, size = 12, search = '', partOfSpeech = 'ALL' } = {}) {
  return useQuery({
    queryKey: ['vocab-words', 'mine', 'page', page, size, search, partOfSpeech],
    queryFn: () =>
      vocabWordsApi.listMyVocabWords({
        page,
        size,
        search: search?.trim() || undefined,
        partOfSpeech: partOfSpeech !== 'ALL' ? partOfSpeech : undefined,
      }),
    placeholderData: keepPreviousData,
  })
}

/** Toàn bộ thư viện từ vựng riêng của giáo viên đang đăng nhập (không phân trang - dùng cho VocabWordPickerModal) */
export function useVocabLibrary() {
  return useQuery({
    queryKey: ['vocab-words', 'mine'],
    queryFn: () => vocabWordsApi.listMyVocabWords(),
  })
}

export function useCreateVocabWord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vocabWordsApi.createVocabWord,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vocab-words', 'mine'] }) },
  })
}

export function useUpdateVocabWord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => vocabWordsApi.updateVocabWord(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vocab-words', 'mine'] }) },
  })
}

export function useDeleteVocabWord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vocabWordsApi.deleteVocabWord,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vocab-words', 'mine'] }) },
  })
}
