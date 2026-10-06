import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@shared/api/customSections.js'
import { CUSTOM_SECTIONS_KEY, useCustomSections } from '@shared/hooks/useCustomSections.js'

// Re-export để các component đang dùng từ đây không cần sửa import
export { useCustomSections }
export const QUERY_KEY = CUSTOM_SECTIONS_KEY

export function useCreateCustomSection(courseId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.createCustomSection(courseId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(courseId) }),
  })
}

export function useUpdateCustomSection(courseId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => api.updateCustomSection(courseId, id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(courseId) }),
  })
}

export function useDeleteCustomSection(courseId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deleteCustomSection(courseId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(courseId) }),
  })
}
