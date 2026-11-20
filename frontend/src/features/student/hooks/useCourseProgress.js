import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as progressApi from '@student/api/progress.js'

export function useCourseProgress(courseId) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: () => progressApi.getCourseProgress(courseId),
    enabled: Boolean(courseId),
    staleTime: 30_000,
  })

  const invalidateProgress = () => {
    queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] })
    queryClient.invalidateQueries({ queryKey: ['enrollments', 'me'] })
  }

  const videoProgressMutation = useMutation({
    mutationFn: ({ itemId, watchedSeconds, durationSeconds }) =>
      progressApi.recordVideoProgress(itemId, { watchedSeconds, durationSeconds }),
    onSuccess: () => { invalidateProgress() },
  })

  const vocabCompletedMutation = useMutation({
    mutationFn: (itemId) => progressApi.recordVocabCompleted(itemId),
    onSuccess: () => { invalidateProgress() },
  })

  const grammarReadMutation = useMutation({
    mutationFn: (itemId) => progressApi.recordGrammarRead(itemId),
    onSuccess: () => { invalidateProgress() },
  })

  const savePartialAnswersMutation = useMutation({
    mutationFn: ({ itemId, attemptId, answers }) =>
      progressApi.savePartialAnswers(itemId, attemptId, answers),
    onSuccess: () => { invalidateProgress() },
  })

  const progressData = query.data || null

  const getSectionProgress = (sectionCode) => {
    if (!progressData?.sections) return null
    return progressData.sections[sectionCode] || null
  }

  const getGroupProgress = (groupId) => {
    if (!progressData?.groups) return null
    return progressData.groups[groupId] || null
  }

  const getItemProgress = (itemId) => {
    if (!progressData?.items) return null
    return progressData.items[itemId] || null
  }

  return {
    ...query,
    progressData,
    courseProgressPercent: progressData?.progressPercent ?? 0,
    getSectionProgress,
    getGroupProgress,
    getItemProgress,
    recordVideoProgress: videoProgressMutation.mutateAsync,
    recordVocabCompleted: vocabCompletedMutation.mutateAsync,
    recordGrammarRead: grammarReadMutation.mutateAsync,
    savePartialAnswers: savePartialAnswersMutation.mutateAsync,
  }
}
