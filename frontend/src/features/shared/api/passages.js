import apiClient from "./client.js";

/** Đoạn văn/hội thoại dùng chung cho nhiều câu hỏi (Part 3/4/6/7) */
export const listPassages = (contentItemId) =>
  apiClient.get("/passages", { params: { contentItemId } }).then((r) => r.data);

// ---------- FR-TCH-06: giáo viên quản lý đoạn văn/hội thoại chung (Part 3/4/6/7) ----------
/** payload: { contentItemId, transcriptHtml?, passageHtml?, audioMediaId?, imageMediaId? } */
export const createPassage = (payload) =>
  apiClient.post("/passages", payload).then((r) => r.data);

/** field null/undefined = giữ nguyên giá trị cũ */
export const updatePassage = (id, payload) =>
  apiClient.put(`/passages/${id}`, payload).then((r) => r.data);

export const deletePassage = (id) =>
  apiClient.delete(`/passages/${id}`).then((r) => r.data);

export const togglePassageStatus = (id, status) =>
  apiClient
    .put(`/passages/${id}/status`, null, {
      params: status ? { status } : {},
    })
    .then((r) => r.data);

export const bulkUpdatePassageStatus = (contentItemId, status) =>
  apiClient
    .put('/passages/bulk-status', null, {
      params: { contentItemId, status },
    })
    .then((r) => r.data);


