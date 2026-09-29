import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as coursesApi from '@shared/api/courses.js'

/** Đồng bộ lại danh sách + chi tiết khoá học sau khi giáo viên thao tác ghi */
function useInvalidateCourses() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['courses'] })
  }
}

export function useCreateCourse() {
  const invalidate = useInvalidateCourses()
  return useMutation({
    mutationFn: coursesApi.createCourse,
    onSuccess: invalidate,
  })
}

export function useUpdateCourse() {
  const invalidate = useInvalidateCourses()
  return useMutation({
    mutationFn: ({ id, payload }) => coursesApi.updateCourse(id, payload),
    onSuccess: invalidate,
  })
}

export function usePublishCourse() {
  const invalidate = useInvalidateCourses()
  return useMutation({
    mutationFn: coursesApi.publishCourse,
    onSuccess: invalidate,
  })
}

export function useHideCourse() {
  const invalidate = useInvalidateCourses()
  return useMutation({
    mutationFn: coursesApi.hideCourse,
    onSuccess: invalidate,
  })
}
