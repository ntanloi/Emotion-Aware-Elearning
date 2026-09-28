import apiClient from './client.js'

/** Danh sách Nhóm hoạt động (kèm items) của 1 mục sidebar (course + sectionCode) */
export const listContentGroups = (courseId, sectionCode) =>
  apiClient.get(`/courses/${courseId}/content-groups`, { params: { sectionCode } }).then((r) => r.data)

// ---------- FR-TCH: giáo viên quản lý Nhóm hoạt động ----------
export const createContentGroup = ({ courseId, sectionCode, title }) =>
  apiClient.post('/content-groups', { courseId, sectionCode, title }).then((r) => r.data)

export const renameContentGroup = (groupId, title) =>
  apiClient.put(`/content-groups/${groupId}`, { title }).then((r) => r.data)

export const deleteContentGroup = (groupId) =>
  apiClient.delete(`/content-groups/${groupId}`).then((r) => r.data)

export const reorderContentGroups = (courseId, sectionCode, orderedGroupIds) =>
  apiClient
    .put(`/courses/${courseId}/content-groups/reorder`, { orderedGroupIds }, { params: { sectionCode } })
    .then((r) => r.data)
