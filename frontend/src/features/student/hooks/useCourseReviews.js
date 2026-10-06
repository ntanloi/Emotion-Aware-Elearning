import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@auth/store/authStore.js'
import * as reviewsApi from '@student/api/reviews.js'

/** Danh sach cong khai + diem trung binh - dung cho moi nguoi, ke ca chua dang nhap */
export function useCourseReviews(courseId) {
  return useQuery({
    queryKey: ['courseReviews', courseId],
    queryFn: () => reviewsApi.listCourseReviews(courseId),
    enabled: !!courseId,
  })
}

/** { enrolled, review } cua nguoi dang dang nhap - quyet dinh FE co hien form danh gia hay khong */
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
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['courseReviews', courseId] })
    qc.invalidateQueries({ queryKey: ['course', courseId] })
    qc.invalidateQueries({ queryKey: ['courses'] })
  }

  const create = useMutation({
    mutationFn: (payload) => reviewsApi.createCourseReview(courseId, payload),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: (payload) => reviewsApi.updateCourseReview(courseId, payload),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: () => reviewsApi.deleteCourseReview(courseId),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
