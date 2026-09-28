import { useQuery } from '@tanstack/react-query'
import * as contentItemsApi from '@shared/api/contentItems.js'

/** V4: cây nội dung (Nhóm hoạt động + hoạt động lẻ) của 1 mục sidebar (course + sectionCode).
 *  Thay cho useUnits/useContentItems cũ — không còn tầng Đơn vị (Unit) trung gian nữa, mỗi mục
 *  sidebar hiển thị thẳng danh sách Nhóm hoạt động (giống bố cục study4.com). */
export function useContentTree(courseId, sectionCode) {
  return useQuery({
    queryKey: ['content-tree', courseId, sectionCode],
    queryFn: () => contentItemsApi.getContentTree(courseId, sectionCode),
    enabled: !!courseId && !!sectionCode,
  })
}

export function useContentItem(contentItemId) {
  return useQuery({
    queryKey: ['content-item', contentItemId],
    queryFn: () => contentItemsApi.getContentItem(contentItemId),
    enabled: !!contentItemId,
  })
}
