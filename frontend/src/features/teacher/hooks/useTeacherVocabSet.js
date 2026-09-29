import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as contentItemsApi from '@shared/api/contentItems.js'

/** Danh sách từ đang gán cho 1 Bộ từ vựng cụ thể (đúng thứ tự học viên sẽ thấy) */
export function useVocabSetWords(contentItemId) {
  return useQuery({
    queryKey: ['vocab-set-words', contentItemId],
    queryFn: () => contentItemsApi.getVocabWords(contentItemId),
    enabled: !!contentItemId,
  })
}

/** Ghi đè TOÀN BỘ danh sách wordId của 1 Bộ từ vựng — dùng khi thêm/gỡ/sắp xếp lại từ */
export function useSetVocabSetWords(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (wordIds) => contentItemsApi.setVocabWords(contentItemId, wordIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab-set-words', contentItemId] }),
  })
}
