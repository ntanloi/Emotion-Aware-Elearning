import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as enrollApi from '@student/api/enrollments.js'

export function useMyEnrollments() {
  return useQuery({ queryKey: ['enrollments', 'mine'], queryFn: enrollApi.myEnrollments })
}

export function useIsEnrolled(courseId) {
  const { data } = useMyEnrollments()
  return (data || []).some((e) => e.courseId === courseId)
}

export function useEnroll(courseId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => enrollApi.enrollCourse(courseId),
    // Optimistic update — theo đúng lộ trình mục "EnrollButton ... Optimistic update qua React Query"
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['enrollments', 'mine'] })
      const previous = qc.getQueryData(['enrollments', 'mine'])
      qc.setQueryData(['enrollments', 'mine'], (old) => [
        ...(old || []),
        { id: `optimistic-${courseId}`, courseId, courseTitle: '', progressPercent: 0 },
      ])
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['enrollments', 'mine'], context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['enrollments', 'mine'] })
    },
  })
}
