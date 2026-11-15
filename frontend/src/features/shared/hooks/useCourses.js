import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as coursesApi from '@shared/api/courses.js'

export function useCourses() {
  return useQuery({ queryKey: ['courses'], queryFn: coursesApi.listCourses })
}

export function useCourse(courseId) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getCourse(courseId),
    enabled: !!courseId,
  })
}

export function useMyCourses() {
  return useQuery({ queryKey: ['courses', 'mine'], queryFn: coursesApi.listMyCourses })
}

export function useCourseSections(courseId) {
  return useQuery({
    queryKey: ['course-sections', courseId],
    queryFn: () => coursesApi.getCourseSections(courseId),
    enabled: Boolean(courseId),
  })
}

export function useDeleteCourseSection(courseId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sectionCode) => coursesApi.deleteCourseSection(courseId, sectionCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-sections', courseId] })
      qc.invalidateQueries({ queryKey: ['course-progress', courseId] })
    },
  })
}
