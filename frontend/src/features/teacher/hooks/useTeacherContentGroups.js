import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as groupsApi from '@shared/api/contentGroups.js'

/**
 * Tất cả mutation ở đây đều invalidate ['content-tree', courseId, sectionCode] — đúng
 * queryKey mà useContentTree() (shared) đang dùng để hiển thị danh sách Nhóm hoạt động +
 * hoạt động con, nên UI tự làm mới ngay sau khi giáo viên thao tác, không cần reload trang.
 */
export function useCreateContentGroup(courseId, sectionCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title) => groupsApi.createContentGroup({ courseId, sectionCode, title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-tree', courseId, sectionCode] }),
  })
}

export function useRenameContentGroup(courseId, sectionCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, title }) => groupsApi.renameContentGroup(groupId, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-tree', courseId, sectionCode] }),
  })
}

export function useDeleteContentGroup(courseId, sectionCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId) => groupsApi.deleteContentGroup(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-tree', courseId, sectionCode] }),
  })
}

export function useReorderContentGroups(courseId, sectionCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedGroupIds) => groupsApi.reorderContentGroups(courseId, sectionCode, orderedGroupIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-tree', courseId, sectionCode] }),
  })
}
