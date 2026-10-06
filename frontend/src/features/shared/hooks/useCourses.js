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
