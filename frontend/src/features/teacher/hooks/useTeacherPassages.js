import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as passagesApi from '@shared/api/passages.js'

export function useTeacherPassages(contentItemId) {
  return useQuery({
    queryKey: ['passages', contentItemId],
    queryFn: () => passagesApi.listPassages(contentItemId),
    enabled: !!contentItemId,
  })
}

export function useCreatePassage(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => passagesApi.createPassage({ contentItemId, ...payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passages', contentItemId] }),
  })
}

export function useUpdatePassage(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => passagesApi.updatePassage(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passages', contentItemId] }),
  })
}

export function useDeletePassage(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => passagesApi.deletePassage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['passages', contentItemId] }),
  })
}
