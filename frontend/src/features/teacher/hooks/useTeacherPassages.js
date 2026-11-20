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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passages', contentItemId] }) },
  })
}

export function useUpdatePassage(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => passagesApi.updatePassage(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passages', contentItemId] }) },
  })
}

export function useDeletePassage(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => passagesApi.deletePassage(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['passages', contentItemId] }) },
  })
}

export function useTogglePassageStatus(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => passagesApi.togglePassageStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passages', contentItemId] })
      qc.invalidateQueries({ queryKey: ['questions', 'teacher-view', contentItemId] })
    },
  })
}

export function useBulkUpdatePassageStatus(contentItemId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status) => passagesApi.bulkUpdatePassageStatus(contentItemId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['passages', contentItemId] })
      qc.invalidateQueries({ queryKey: ['questions', 'teacher-view', contentItemId] })
    },
  })
}


