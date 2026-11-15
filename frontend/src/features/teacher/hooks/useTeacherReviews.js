import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as teacherApi from '@teacher/api/teacher.js'

export function useTeacherCourseReviews(courseId, params) {
  return useQuery({
    queryKey: ['teacherCourseReviews', courseId, params],
    queryFn: () => teacherApi.listTeacherCourseReviews(courseId, params),
    enabled: !!courseId,
  })
}

export function useTeacherCourseReviewStats(courseId) {
  return useQuery({
    queryKey: ['teacherCourseReviewStats', courseId],
    queryFn: () => teacherApi.getTeacherCourseReviewStats(courseId),
    enabled: !!courseId,
  })
}

export function useTeacherReviewReply(courseId) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['teacherCourseReviews', courseId] })
    qc.invalidateQueries({ queryKey: ['teacherCourseReviewStats', courseId] })
    qc.invalidateQueries({ queryKey: ['courseReviews', courseId] })
  }

  const reply = useMutation({
    mutationFn: ({ reviewId, reply }) =>
      teacherApi.replyTeacherReview(reviewId, { reply }),
    onSuccess: invalidate,
  })

  const removeReply = useMutation({
    mutationFn: (reviewId) => teacherApi.deleteTeacherReviewReply(reviewId),
    onSuccess: invalidate,
  })

  return { reply, removeReply }
}

/**
 * Phase 4: Hooks quản lý đánh giá tiêu biểu được ghim
 */
export function useTeacherFeaturedReviews(courseId) {
  return useQuery({
    queryKey: ['teacherFeaturedReviews', courseId],
    queryFn: () => teacherApi.listTeacherFeaturedReviews(courseId),
    enabled: !!courseId,
  })
}

export function useTeacherFeaturedActions(courseId) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['teacherFeaturedReviews', courseId] })
    qc.invalidateQueries({ queryKey: ['teacherCourseReviews', courseId] })
    qc.invalidateQueries({ queryKey: ['featuredReviews', courseId] })
  }

  const pin = useMutation({
    mutationFn: (reviewId) => teacherApi.featureReview(courseId, reviewId),
    onSuccess: invalidate,
  })

  const unpin = useMutation({
    mutationFn: (reviewId) => teacherApi.unfeatureReview(courseId, reviewId),
    onSuccess: invalidate,
  })

  const reorder = useMutation({
    mutationFn: (reviewIds) => teacherApi.reorderFeaturedReviews(courseId, reviewIds),
    onSuccess: invalidate,
  })

  return { pin, unpin, reorder }
}

