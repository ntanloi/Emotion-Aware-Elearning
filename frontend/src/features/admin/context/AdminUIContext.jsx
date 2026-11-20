/**
 * Giữ lại đường dẫn import cũ cho các trang admin.
 * Toàn bộ toast / confirm / prompt nay dùng chung từ AppUIContext (được gắn ở main.jsx),
 * nên KHÔNG còn Provider riêng cho admin.
 */
export { useUI as useAdminUI, useToast, useConfirm, usePrompt } from '@shared/context/AppUIContext.jsx'
