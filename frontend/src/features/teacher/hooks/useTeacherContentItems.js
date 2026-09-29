import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as itemsApi from '@shared/api/contentItems.js'

export function useCreateContentItem(courseId, sectionCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => itemsApi.createContentItem({ courseId, sectionCode, ...payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-tree', courseId, sectionCode] }),
  })
}

export function useUpdateContentItem(courseId, sectionCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => itemsApi.updateContentItem(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-tree', courseId, sectionCode] })
      qc.invalidateQueries({ queryKey: ['content-item'] })
    },
  })
}

export function useDeleteContentItem(courseId, sectionCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => itemsApi.deleteContentItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content-tree', courseId, sectionCode] }),
  })
}

// groupId: id của Nhóm hoạt động chứa các item này, hoặc null nếu đang sắp xếp danh sách
// "hoạt động lẻ" (ungroupedItems) của mục sidebar — dùng để biết cập nhật optimistic vào đâu
// trong cây content-tree đang cache, tránh phải chờ refetch mới thấy thứ tự mới.
export function useReorderContentItems(courseId, sectionCode) {
  const qc = useQueryClient()
  const queryKey = ['content-tree', courseId, sectionCode]
  return useMutation({
    mutationFn: ({ orderedItemIds }) => itemsApi.reorderContentItems(orderedItemIds),
    onMutate: async ({ groupId, orderedItemIds }) => {
      await qc.cancelQueries({ queryKey })
      const previousTree = qc.getQueryData(queryKey)
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old
        const reorder = (items) => {
          const byId = Object.fromEntries(items.map((it) => [it.id, it]))
          return orderedItemIds.map((id) => byId[id]).filter(Boolean)
        }
        if (groupId) {
          return {
            ...old,
            groups: old.groups.map((g) => (g.id === groupId ? { ...g, items: reorder(g.items || []) } : g)),
          }
        }
        return { ...old, ungroupedItems: reorder(old.ungroupedItems || []) }
      })
      return { previousTree }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTree) qc.setQueryData(queryKey, context.previousTree)
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })
}