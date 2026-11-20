import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@auth/store/authStore.js'
import * as reviewsApi from '@student/api/reviews.js'

/** Danh sach cong khai + diem trung binh - dung cho moi nguoi, ke ca chua dang nhap */
export function useCourseReviews(courseId, params) {
  return useQuery({
    queryKey: ['courseReviews', courseId, params],
    queryFn: () => reviewsApi.listCourseReviews(courseId, params),
    enabled: !!courseId,
  })
}

/** { enrolled, canReview, progress, requiredProgress, review, reason } cua nguoi dang dang nhap */
export function useMyCourseReview(courseId) {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ['courseReviews', courseId, 'mine'],
    queryFn: () => reviewsApi.myCourseReview(courseId),
    enabled: !!courseId && isAuthenticated,
  })
}

export function useSubmitCourseReview(courseId) {
  const qc = useQueryClient()

  // Làm mới dữ liệu ở nền - KHÔNG return Promise để mutateAsync resolve ngay khi server lưu xong
  // (modal đóng liền, danh sách tự refetch xong sau đó).
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['courseReviews', courseId] })
    qc.invalidateQueries({ queryKey: ['course', courseId] })
    qc.invalidateQueries({ queryKey: ['courses'] })
  }

  // Cập nhật ngay đánh giá của chính mình trong cache để UI đổi tức thì, không chờ refetch
  const applyMine = (review) => {
    qc.setQueryData(['courseReviews', courseId, 'mine'], (old) =>
      old ? { ...old, review } : old
    )
  }

  const create = useMutation({
    mutationFn: (payload) => reviewsApi.createCourseReview(courseId, payload),
    onSuccess: (review) => {
      applyMine(review)
      invalidate()
    },
  })
  const update = useMutation({
    mutationFn: (payload) => reviewsApi.updateCourseReview(courseId, payload),
    onSuccess: (review) => {
      applyMine(review)
      invalidate()
    },
  })
  const remove = useMutation({
    mutationFn: () => reviewsApi.deleteCourseReview(courseId),
    onSuccess: () => {
      applyMine(null)
      invalidate()
    },
  })

  return { create, update, remove }
}
