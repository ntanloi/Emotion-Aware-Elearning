import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  open: false,
  context: null, // { contextType: 'COURSE_ADVICE' | 'QUESTION_EXPLAIN', contextRefId?: string }
  conversationId: null,

  setOpen: (open) => set({ open }),
  toggleOpen: () => set((state) => ({ open: !state.open })),

  openWith: (context) => {
    const current = get().context
    const isSameContext =
      current &&
      current.contextType === context?.contextType &&
      current.contextRefId === context?.contextRefId

    if (isSameContext && get().conversationId) {
      set({ open: true })
    } else {
      set({
        open: true,
        context: context || { contextType: 'COURSE_ADVICE' },
        conversationId: null,
      })
    }
  },

  setConversationId: (conversationId) => set({ conversationId }),

  resetToCourseAdvice: () =>
    set({
      context: { contextType: 'COURSE_ADVICE' },
      conversationId: null,
    }),

  reset: () =>
    set({
      open: false,
      context: null,
      conversationId: null,
    }),
}))
