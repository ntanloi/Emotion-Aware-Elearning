import { useQuery } from '@tanstack/react-query'
import { listCustomSections } from '@shared/api/customSections.js'

export const CUSTOM_SECTIONS_KEY = (courseId) => ['customSections', courseId]

/**
 * Shared read-only hook — cả teacher lẫn student đều dùng.
 * Mutation hooks (create/update/delete) chỉ dành cho teacher nên vẫn nằm trong
 * frontend/src/features/teacher/hooks/useCustomSections.js.
 */
export function useCustomSections(courseId) {
  return useQuery({
    queryKey: CUSTOM_SECTIONS_KEY(courseId),
    queryFn: () => listCustomSections(courseId),
    enabled: !!courseId,
  })
}
