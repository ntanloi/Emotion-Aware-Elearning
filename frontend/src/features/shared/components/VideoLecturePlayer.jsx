import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import EmotionCameraCapture from '@student/components/EmotionCameraCapture.jsx'
import AdaptiveSuggestionToast from '@student/components/AdaptiveSuggestionToast.jsx'
import EmotionTimelineBar from '@student/components/EmotionTimelineBar.jsx'
import SessionSummaryModal from '@student/components/SessionSummaryModal.jsx'
import RichTextViewer from '@shared/components/RichTextViewer.jsx'
import { useLearningSession } from '@student/hooks/useLearningSession.js'
import { respondToSuggestion, getSessionSummary, restartAttempt } from '@student/api/emotions.js'
import { recordVideoProgress } from '@student/api/progress.js'
import AttemptBadge from '@student/components/AttemptBadge.jsx'
import { Play, Camera, ShieldCheck, Sparkles, Maximize2, Minimize2, Coffee, CheckCircle2, Activity, UserX } from 'lucide-react'

/**
 * VideoLecturePlayer — Giai đoạn 6 & 8 (KLTN).
 * Player video + xin quyền camera khi BẤM NÚT PLAY + gắn EmotionCameraCapture
 * + Gợi ý học tập thích ứng (Adaptive Suggestion Toast)
 * + Báo cáo học tập sau buổi học (Session Summary Modal)
 * + Dòng thời gian cảm xúc bài giảng (Emotion Timeline Bar).
 * Vòng đời: WAITING -> LEARNING <-> PAUSED -> FINISHED/ABANDONED (mục 2.1/2.2 đặc tả).
 *
 * Props: contentItem: ContentItemDto (type=VIDEO_LECTURE)
 */
export default function VideoLecturePlayer({ contentItem }) {
  const { session, error, respondCameraPermission, pause, resume, finish } =
    useLearningSession(contentItem.id)
  const [searchParams] = useSearchParams()
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  const iframeRef = useRef(null)
  const videoWrapRef = useRef(null)
  const finishedRef = useRef(false)
  const elapsedSecRef = useRef(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Mobile: khung video chỉ cao ~16:9 và có overflow:hidden nên hộp thoại đặt bên trong bị cắt mất nút bấm.
  // Trên màn hình nhỏ (và khi KHÔNG ở chế độ toàn màn hình) hiển thị hộp thoại qua portal ra <body> dạng bottom sheet.
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(max-width: 768px)').matches
      : false
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia('(max-width: 768px)')
    const onChange = (e) => setIsMobileViewport(e.matches)
    setIsMobileViewport(mql.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])
  const overlayAsSheet = isMobileViewport && !isFullscreen
  const renderOverlay = (node) =>
    overlayAsSheet && typeof document !== 'undefined' ? createPortal(node, document.body) : node
  const [useIframeFallback, setUseIframeFallback] = useState(false)
  const [currentPrediction, setCurrentPrediction] = useState(null)

  // Trạng thái yêu cầu quyền camera khi bấm Play
  const [hasStartedLearning, setHasStartedLearning] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(null)
  const [cameraChoice, setCameraChoice] = useState(null)

  // Giai đoạn: Theo dõi khuôn mặt và tính hợp lệ lượt xem (Attempt)
  const [faceLost, setFaceLost] = useState(false)
  const [attemptInfo, setAttemptInfo] = useState(null)
  const [sessionConflictMessage, setSessionConflictMessage] = useState(null)
  const autoPausedRef = useRef(false)

  // Giai đoạn 8: Gợi ý học tập thích ứng & Báo cáo tổng kết buổi học
  const [activeSuggestion, setActiveSuggestion] = useState(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [sessionSummary, setSessionSummary] = useState(null)
  const [restTimerSeconds, setRestTimerSeconds] = useState(null)
  const autoDismissTimerRef = useRef(null)

  // Dòng thời gian cảm xúc bài giảng (Emotion Timeline Track)
  const [showAiTimeline, setShowAiTimeline] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [videoDuration, setVideoDuration] = useState(contentItem.durationSec || 0)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const maxWatchedSecRef = useRef(0)
  const hasTriggeredCompleteRef = useRef(false)
  const [isVideoCompleted, setIsVideoCompleted] = useState(false)

  // Đánh dấu thời gian mất tập trung và cộng dồn (BORED + NO_FACE)
  const distractionStartSecRef = useRef(null)
  const distractionCountRef = useRef(0)
  const cooldownUntilRef = useRef(0)
  const DISTRACTION_ALERT_SECONDS = 18
  const ALERT_COOLDOWN_MS = 15_000

  // Lấy thời điểm hiện tại của video: ưu tiên currentTime từ <video>, fallback sang elapsedSecRef
  const getVideoTimeSec = useCallback(() => {
    if (videoRef.current && typeof videoRef.current.currentTime === 'number' && !isNaN(videoRef.current.currentTime)) {
      return Math.round(videoRef.current.currentTime * 10) / 10
    }
    return elapsedSecRef.current
  }, [])

  useEffect(() => {
    setUseIframeFallback(false)
    setHasStartedLearning(false)
    setShowConsentModal(false)
    setCameraChoice(null)
    setCameraPermissionGranted(null)
    setFaceLost(false)
    setAttemptInfo(null)
    setSessionConflictMessage(null)
    autoPausedRef.current = false
    // KHÔNG tạo phiên học ở đây: phiên chỉ được tạo khi học viên bấm Play (xem handleConfirmConsent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItem.id])

  // BỎ DỞ: đóng tab/thoát trang giữa lúc đang học -> báo cho backend biết (best-effort)
  useEffect(() => {
    const handleUnload = () => {
      if (session && !finishedRef.current && (session.status === 'LEARNING' || session.status === 'PAUSED')) {
        finish(true).catch(() => {})
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [session, finish])

  // Tạo phiên (nếu chưa có) + chuyển sang ĐANG HỌC. Chỉ chạy khi học viên bấm Play / bật-tắt camera.
  const handlePermissionResult = async (granted) => {
    await respondCameraPermission(granted)
  }

  // Khi học viên nhấn nút Play: Kiểm tra xem đã chọn quyền camera cho lượt này chưa (không ghi nhớ localStorage)
  const handlePlayRequest = () => {
    if (autoPausedRef.current) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause()
      }
      return
    }

    if (!hasStartedLearning || cameraChoice === null) {
      if (videoRef.current) {
        videoRef.current.pause()
      }
      setShowConsentModal(true)
    } else {
      setPlaying(true)
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {})
      }
      if (session?.status === 'PAUSED') resume()
    }
  }

  // Bật/tắt camera trực tiếp từ thanh điều khiển
  const toggleCamera = () => {
    const nextState = !cameraPermissionGranted
    setCameraPermissionGranted(nextState)
    setCameraChoice(nextState)
    handlePermissionResult(nextState).catch(() => {})
  }

  // Xác nhận lựa chọn camera (hỏi mỗi lần vào xem video bài học, không lưu vĩnh viễn)
  const handleConfirmConsent = (enableCamera) => {
    setCameraChoice(enableCamera)
    setShowConsentModal(false)
    setHasStartedLearning(true)
    setCameraPermissionGranted(enableCamera)
    setPlaying(true)

    // 1. Kích hoạt phát video ngay lập tức trong sự kiện click để bảo toàn User Gesture (không await)
    if (videoRef.current) {
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Lỗi tự động phát video:', err)
          if (videoRef.current) {
            videoRef.current.play().catch(() => {})
          }
        })
      }
    } else if (iframeRef.current) {
      try {
        const win = iframeRef.current.contentWindow
        win?.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
        win?.postMessage('{"method":"play"}', '*')
      } catch (err) {
        console.warn('Lỗi postMessage phát video iframe:', err)
      }
    }

    // 2. Cập nhật session backend sang LEARNING ở background (không chặn việc phát video)
    handlePermissionResult(enableCamera).catch((err) => {
      console.warn('Lỗi cập nhật quyền camera:', err)
    })
  }

  const getExtra = useCallback(() => {
    return {
      playbackRate: videoRef.current?.playbackRate ?? 1,
      videoDurationSec: videoDuration || videoRef.current?.duration || null,
    }
  }, [videoDuration])

  const handleBatchResult = useCallback((res) => {
    if (!res) return
    if (res.attempt) {
      setAttemptInfo(res.attempt)
    }
    if (res.sessionStatus === 'FACE_LOST') {
      if (!autoPausedRef.current) {
        console.log('[Face Lost] Không tìm thấy khuôn mặt -> Tự động dừng video')
        autoPausedRef.current = true
        setFaceLost(true)
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
        }
      }
    } else if (res.sessionStatus === 'LEARNING') {
      if (autoPausedRef.current) {
        console.log('[Face Recovered] Đã tìm thấy lại khuôn mặt -> Tiếp tục phát video')
        autoPausedRef.current = false
        setFaceLost(false)
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch((err) => console.warn('Lỗi tự động phát tiếp video:', err))
        }
        setPlaying(true)
      }
    }
  }, [])

  const handleSessionConflict = useCallback((message) => {
    console.warn('[Session Conflict]', message)
    setSessionConflictMessage(message)
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause()
    }
    setPlaying(false)
  }, [])

  const handleRestartAttempt = useCallback(async () => {
    if (!session?.id) return
    try {
      const newAttempt = await restartAttempt(session.id)
      setAttemptInfo(newAttempt)
    } catch (err) {
      console.warn('Lỗi bắt đầu lại lượt xem mới:', err)
    }
  }, [session?.id])

  const pauseVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
    } else if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        )
      } catch (e) {
        console.warn('Lỗi postMessage pause iframe:', e)
      }
    }
    setPlaying(false)
  }, [])

  const resumeVideo = useCallback(() => {
    if (videoRef.current) {
      const p = videoRef.current.play()
      if (p !== undefined) {
        p.catch((e) => console.warn('Lỗi phát tiếp video:', e))
      }
      setPlaying(true)
    } else if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        )
      } catch (e) {
        console.warn('Lỗi postMessage play iframe:', e)
      }
      setPlaying(true)
    }
  }, [])

  const seekVideoTo = useCallback((targetTime) => {
    const time = Math.max(0, targetTime)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      const p = videoRef.current.play()
      if (p !== undefined) {
        p.catch((e) => console.warn('Lỗi play sau tua:', e))
      }
      setPlaying(true)
    } else if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [time, true] }),
          '*'
        )
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        )
      } catch (e) {
        console.warn('Lỗi postMessage seek iframe:', e)
      }
      elapsedSecRef.current = time
      setPlaying(true)
    }
  }, [])

  const initialTimeParam = searchParams.get('t')
  useEffect(() => {
    if (initialTimeParam) {
      const sec = parseFloat(initialTimeParam)
      if (!isNaN(sec) && sec >= 0) {
        const timer = setTimeout(() => {
          seekVideoTo(sec)
        }, 600)
        return () => clearTimeout(timer)
      }
    }
  }, [initialTimeParam, seekVideoTo])

  const handlePause = async () => {
    if (autoPausedRef.current) {
      // Dừng do hệ thống auto-pause vì FACE_LOST, không kích hoạt pause phiên học của học viên
      return
    }
    setPlaying(false)
    // Tạm dừng phân tích cảm xúc và reset tracking mất tập trung khi dừng video
    distractionStartSecRef.current = null
    distractionCountRef.current = 0
    const dur = videoDuration || videoRef.current?.duration || 0
    if (dur > 0 && maxWatchedSecRef.current > 0) {
      recordVideoProgress(contentItem.id, {
        watchedSeconds: maxWatchedSecRef.current,
        durationSeconds: dur,
      }).catch(() => {})
    }
    if (session?.status === 'LEARNING') await pause()
  }

  const loadSessionSummary = async (sessionId) => {
    try {
      const summary = await getSessionSummary(sessionId)
      setSessionSummary(summary)
      setShowSummaryModal(true)
    } catch (err) {
      console.warn('Lỗi tải báo cáo tổng kết buổi học:', err)
    }
  }

  const handleEnded = async () => {
    setPlaying(false)
    finishedRef.current = true
    autoPausedRef.current = false
    setFaceLost(false)
    setCameraChoice(null)
    const dur = videoDuration || videoRef.current?.duration || 0
    if (dur > 0) {
      maxWatchedSecRef.current = dur
      setIsVideoCompleted(true)
      hasTriggeredCompleteRef.current = true
      recordVideoProgress(contentItem.id, {
        watchedSeconds: dur,
        durationSeconds: dur,
      }).catch(() => {})
    }
    await finish(false)
    if (session?.id) {
      await loadSessionSummary(session.id)
    }
  }

  const handleFinishClick = async () => {
    setPlaying(false)
    videoRef.current?.pause()
    finishedRef.current = true
    await finish(false)
    if (session?.id) {
      await loadSessionSummary(session.id)
    }
  }

  // Xử lý cập nhật cảm xúc thời gian thực, ghi nhận dòng thời gian và theo dõi mất tập trung cộng dồn
  const handlePredictionUpdate = useCallback((latest) => {
    setCurrentPrediction(latest)
    if (!latest) return

    const state = latest.learningState
    const currentSec = getVideoTimeSec()
    const secFloor = Math.floor(currentSec)
    setCurrentVideoTime(currentSec)

    // Ghi nhận vào Dòng thời gian cảm xúc bài giảng (Emotion Timeline)
    setTimelineEvents((prev) => {
      const idx = prev.findIndex((e) => e.second === secFloor)
      if (idx >= 0) {
        if (prev[idx].state === state) return prev
        const copy = [...prev]
        copy[idx] = { second: secFloor, state, confidence: latest.confidenceScore }
        return copy
      }
      return [...prev, { second: secFloor, state, confidence: latest.confidenceScore }]
    })

    if (!playing || session?.status !== 'LEARNING') return

    if (state === 'NO_FACE') {
      // NO_FACE đã được xử lý bởi FACE_LOST auto-pause của backend, không hiện toast cảnh báo
      return
    }

    const now = Date.now()
    if (now < cooldownUntilRef.current || activeSuggestion) {
      return
    }

    const isOffTask = state === 'BORED'

    if (isOffTask) {
      // Đánh dấu thời gian tạm thời từ thời điểm bắt đầu mất tập trung
      if (distractionStartSecRef.current === null) {
        distractionStartSecRef.current = currentSec
        console.log(`[Focus Tracking] Bắt đầu đánh dấu mất tập trung (${state}) tại mốc ${currentSec}s`)
      }
      distractionCountRef.current += 1
      console.log(`[Focus Tracking] Mất tập trung tích lũy: ${distractionCountRef.current}/${DISTRACTION_ALERT_SECONDS}s (${state})`)

      // Nếu cộng dồn đạt đủ thời gian quy định (18s) -> Kích hoạt cảnh báo (Video VẪN CHẠY BÌNH THƯỜNG)
      if (distractionCountRef.current >= DISTRACTION_ALERT_SECONDS) {
        const startSec = Math.max(0, Math.floor(distractionStartSecRef.current))
        const endSec = Math.max(startSec, Math.floor(currentSec))
        const duration = Math.max(1, endSec - startSec)

        console.log(`[Focus Tracking] Kích hoạt cảnh báo mất tập trung 18s (từ ${startSec}s đến ${endSec}s) — Video tiếp tục chạy`)

        // Video vẫn phát bình thường, không gọi pauseVideo()
        setActiveSuggestion({
          id: `client-offtask-${Date.now()}`,
          triggerType: 'BORED',
          videoSegmentStart: startSec,
          videoSegmentEnd: endSec,
          message: `Hệ thống nhận thấy bạn đã mất tập trung liên tục ${duration} giây (từ mốc ${fmtSec(startSec)} đến ${fmtSec(endSec)}). Hãy chú ý để không bỏ lỡ kiến thức quan trọng!`,
        })
      }
    } else if (state === 'ENGAGED' || state === 'INTERESTED' || state === 'NEUTRAL') {
      // Nếu mất tập trung dưới thời gian quy định và sau đó chuyển lại trạng thái tập trung -> bỏ đánh dấu mốc mất tập trung
      if (distractionStartSecRef.current !== null || distractionCountRef.current > 0) {
        console.log(`[Focus Tracking] Học viên quay lại tập trung (${state}) sau ${distractionCountRef.current}s (dưới ngưỡng 18s) -> Bỏ đánh dấu mốc mất tập trung.`)
        distractionStartSecRef.current = null
        distractionCountRef.current = 0
      }
    }
  }, [playing, session?.status, activeSuggestion, getVideoTimeSec])

  // Xử lý gợi ý thích ứng từ backend: Video vẫn tiếp tục chạy
  const handleSuggestionTrigger = (suggestion) => {
    if (!suggestion || session?.status !== 'LEARNING') return
    const now = Date.now()
    if (now < cooldownUntilRef.current || activeSuggestion) return

    console.log('[Adaptive Suggestion] Nhận gợi ý từ backend (video tiếp tục chạy):', suggestion)
    setActiveSuggestion(suggestion)
  }

  // Nút "Xem lại": Tua lại từ lúc bắt đầu mất tập trung (hoặc tua 30s nếu CONFUSED)
  const handleAcceptSuggestion = () => {
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
    if (!activeSuggestion) return
    const { id, triggerType, videoSegmentStart } = activeSuggestion
    if (id && !id.startsWith('client-')) {
      respondToSuggestion(id, true).catch((err) => console.warn('Lỗi phản hồi chấp nhận gợi ý:', err))
    }

    if (triggerType === 'CONFUSED') {
      const current = getVideoTimeSec()
      const targetTime = Math.max(0, current - 30)
      seekVideoTo(targetTime)
    } else {
      const targetTime = Math.max(0, videoSegmentStart ?? 0)
      console.log(`[Adaptive Suggestion] Tua lại về thời điểm bắt đầu mất tập trung: ${targetTime}s`)
      seekVideoTo(targetTime)
    }

    // Reset tracking và đặt cooldown 15s để có thể cảnh báo tiếp ở chu kỳ sau
    distractionStartSecRef.current = null
    distractionCountRef.current = 0
    cooldownUntilRef.current = Date.now() + ALERT_COOLDOWN_MS
    setActiveSuggestion(null)
  }

  // Nút "Xem tiếp": Đóng thông báo (video vẫn đang chạy bình thường)
  const handleDismissSuggestion = () => {
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
    if (!activeSuggestion) return
    if (activeSuggestion.id && !activeSuggestion.id.startsWith('client-')) {
      respondToSuggestion(activeSuggestion.id, false).catch((err) => console.warn('Lỗi phản hồi bỏ qua gợi ý:', err))
    }

    // Reset tracking và đặt cooldown 15s để có thể cảnh báo tiếp ở chu kỳ sau
    distractionStartSecRef.current = null
    distractionCountRef.current = 0
    cooldownUntilRef.current = Date.now() + ALERT_COOLDOWN_MS
    setActiveSuggestion(null)
  }

  // Tự động đóng thông báo sau 15 giây nếu học viên không tương tác
  useEffect(() => {
    if (activeSuggestion) {
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
      autoDismissTimerRef.current = setTimeout(() => {
        console.log('[Adaptive Suggestion] Tự động đóng cảnh báo sau 15 giây')
        handleDismissSuggestion()
      }, 15_000)
    }
    return () => {
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
    }
  }, [activeSuggestion])

  const handleResumeAfterRest = () => {
    setRestTimerSeconds(null)
    setPlaying(true)
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
    if (session?.status === 'PAUSED') {
      resume().catch(() => {})
    }
  }

  // Đếm ngược thời gian nghỉ ngơi 2 phút
  useEffect(() => {
    if (restTimerSeconds == null || restTimerSeconds <= 0) return
    const timer = setInterval(() => {
      setRestTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleResumeAfterRest()
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [restTimerSeconds])

  const handleReplayVideo = () => {
    autoPausedRef.current = false
    setFaceLost(false)
    setCameraChoice(null)
    setHasStartedLearning(false)
    setShowConsentModal(true)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.pause()
    }
  }

  // Đếm giây tự động cho video iframe (YouTube/Google Drive) khi đang phát
  useEffect(() => {
    if (session?.status !== 'LEARNING' || !playing) return
    const timer = setInterval(() => {
      elapsedSecRef.current += 1
    }, 1000)
    return () => clearInterval(timer)
  }, [session?.status, playing])

  // Chuyển đổi toàn màn hình ở cấp container .video-wrap
  // Giúp camera và badge phân tích cảm xúc AI hiển thị liên tục trên video, không bị ẩn như iframe native fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!videoWrapRef.current) return
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (videoWrapRef.current.requestFullscreen) {
          await videoWrapRef.current.requestFullscreen()
        } else if (videoWrapRef.current.webkitRequestFullscreen) {
          await videoWrapRef.current.webkitRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen()
        }
      }
    } catch (err) {
      console.warn('Lỗi khi chuyển đổi toàn màn hình:', err)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeEl = document.fullscreenElement || document.webkitFullscreenElement
      setIsFullscreen(activeEl === videoWrapRef.current)
    }

    const handleKeyDown = (e) => {
      // Phím 'f' hoặc 'F' để phóng to / thu nhỏ (chỉ khi không đang nhập ô input)
      if (
        (e.key === 'f' || e.key === 'F') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleFullscreen])

  // Nhận diện link Google Drive
  const driveMatch = contentItem.videoUrl?.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  const driveFileId = driveMatch ? driveMatch[1] : null
  const driveDirectUrl = driveFileId
    ? `/drive-proxy/download?id=${driveFileId}&export=download`
    : null

  const isNativeVideoUrl = Boolean(
    contentItem.videoUrl && (
      contentItem.videoUrl.match(/\.(mp4|webm|ogg|m4v)($|\?)/i) ||
      (contentItem.videoUrl.includes('cloudinary.com') && contentItem.videoUrl.includes('/video/'))
    )
  )

  // Ưu tiên phát qua HTML5 <video> native (cho file mp4/webm hoặc Google Drive direct stream)
  // để có thể tự động phát ngay khi học viên chọn trong modal, không cần nhấn nút play lần 2
  const isDirectVideo = (isNativeVideoUrl || Boolean(driveDirectUrl)) && !useIframeFallback
  const isIframe = Boolean(contentItem.videoUrl && !isDirectVideo)
  const videoSourceUrl = isDirectVideo ? (driveDirectUrl || contentItem.videoUrl) : contentItem.videoUrl

  if (error) {
    return <p style={{ color: 'var(--bad)' }}>Không thể bắt đầu phiên học: {String(error.message || error)}</p>
  }

  const predictionMeta = currentPrediction ? getLearningStateMeta(currentPrediction.learningState) : null

  return (
    <div>
      {sessionConflictMessage && (
        <div className="session-conflict-banner">
          <UserX size={18} />
          <span>{sessionConflictMessage}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{contentItem.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <AttemptBadge attempt={attemptInfo} onRestart={handleRestartAttempt} />
          {isVideoCompleted ? (
            <div className="video-lecture-complete-pill done">
              <CheckCircle2 size={15} />
              <span>Đã hoàn thành bài học (Đã xem &ge; 80%)</span>
            </div>
          ) : (
            <div className="video-lecture-complete-pill pending">
              <span>Tiến độ: xem &ge; 80% để hoàn thành</span>
            </div>
          )}
        </div>
      </div>
      <div ref={videoWrapRef} className={`video-wrap ${isFullscreen ? 'is-fullscreen' : ''}`}>
        {/* Nút Toàn màn hình / Thu nhỏ trên container video */}
        <button
          type="button"
          className="video-fullscreen-pill"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Thu nhỏ (Phím F hoặc Esc)' : 'Xem toàn màn hình (Phím F)'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 size={13} />
              <span>Thu nhỏ (F)</span>
            </>
          ) : (
            <>
              <Maximize2 size={13} />
              <span>Toàn màn hình (F)</span>
            </>
          )}
        </button>

        {contentItem.videoUrl ? (
          isIframe ? (
            <iframe
              ref={iframeRef}
              src={getAutoplayIframeUrl(contentItem.videoUrl, hasStartedLearning)}
              className="video-el"
              style={{
                border: 'none',
                width: '100%',
                height: isFullscreen ? '100vh' : 480,
                borderRadius: isFullscreen ? 0 : 12,
              }}
              allow="autoplay; encrypted-media"
              title={contentItem.title}
            />
          ) : (
            <video
              ref={videoRef}
              className="video-el"
              src={videoSourceUrl}
              controls
              controlsList="nofullscreen"
              onPlay={handlePlayRequest}
              onPause={handlePause}
              onEnded={handleEnded}
              onLoadedMetadata={(e) => {
                const d = e.target.duration
                if (d && !isNaN(d) && isFinite(d)) {
                  setVideoDuration(Math.round(d))
                }
              }}
              onTimeUpdate={(e) => {
                const cur = e.target.currentTime
                setCurrentVideoTime(cur)
                if (cur > maxWatchedSecRef.current) {
                  maxWatchedSecRef.current = cur
                }
                const dur = videoDuration || e.target.duration || 0
                if (dur > 0 && (maxWatchedSecRef.current / dur) >= 0.8 && !hasTriggeredCompleteRef.current) {
                  hasTriggeredCompleteRef.current = true
                  setIsVideoCompleted(true)
                  recordVideoProgress(contentItem.id, {
                    watchedSeconds: maxWatchedSecRef.current,
                    durationSeconds: dur,
                  }).catch((err) => console.warn('Lỗi ghi nhận hoàn thành video:', err))
                }
              }}
              onError={() => {
                console.warn('Lỗi phát video trực tiếp, tự động chuyển sang iframe preview')
                setUseIframeFallback(true)
              }}
            />
          )
        ) : (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="text-dim">Chưa có video</p>
          </div>
        )}

        {/* Lớp phủ nút Play ban đầu trước khi bắt đầu bài học */}
        {!hasStartedLearning && (
          <div className="video-play-overlay" onClick={handlePlayRequest}>
            <button className="video-play-btn" aria-label="Phát video">
              <Play size={34} fill="currentColor" style={{ marginLeft: 3 }} />
            </button>
            <span className="video-play-text">Nhấn để bắt đầu xem bài giảng</span>
          </div>
        )}

        {/* Hộp thoại hỏi ý kiến bật Camera khi nhấn Play */}
        {showConsentModal && renderOverlay(
          <div className={`camera-consent-modal-backdrop${overlayAsSheet ? ' is-mobile-sheet' : ''}`}>
            <div className="camera-consent-modal">
              <div className="consent-modal-header">
                <div className="consent-modal-icon">
                  <Camera size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Bật Camera &amp; AI nhận diện tập trung?</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#94a3b8' }}>
                    Hệ thống tự động phát hiện khi bạn gặp câu khó, bối rối hoặc mất tập trung để điều chỉnh tốc độ học phù hợp.
                  </p>
                </div>
              </div>
              <div className="consent-modal-privacy-note">
                <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Bảo mật 100%: Hình ảnh chỉ phân tích tạm thời trong RAM, tuyệt đối không lưu video hay ảnh mặt.</span>
              </div>
              <div className="consent-modal-actions">
                <button className="btn primary" onClick={() => handleConfirmConsent(true)}>
                  <Sparkles size={16} /> Bật Camera &amp; Xem Video
                </button>
                <button className="btn secondary" onClick={() => handleConfirmConsent(false)}>
                  Xem Video không dùng Camera
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Giai đoạn 8: Popup Gợi ý học tập thích ứng (không chặn video) */}
        <AdaptiveSuggestionToast
          suggestion={activeSuggestion}
          onAccept={handleAcceptSuggestion}
          onDismiss={handleDismissSuggestion}
        />

        {/* Giai đoạn 8: Hộp thoại nghỉ ngơi thư giãn 2 phút khi học viên bị BORED kéo dài */}
        {restTimerSeconds != null && renderOverlay(
          <div className={`camera-consent-modal-backdrop${overlayAsSheet ? ' is-mobile-sheet' : ''}`} style={{ zIndex: overlayAsSheet ? 2001 : 60 }}>
            <div className="camera-consent-modal" style={{ textAlign: 'center', maxWidth: 360 }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 12,
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#6366f1',
                  marginBottom: 12,
                }}
              >
                <Coffee size={32} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Đang tạm dừng nghỉ ngơi 2 phút</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 12.5, color: '#94a3b8' }}>
                Hãy rời mắt khỏi màn hình, uống một ngụm nước và thư giãn gân cốt nhé!
              </p>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#6366f1', marginBottom: 16 }}>
                {Math.floor(restTimerSeconds / 60)}:{String(restTimerSeconds % 60).padStart(2, '0')}
              </div>
              <button className="btn primary sm" onClick={handleResumeAfterRest}>
                Tiếp tục học ngay
              </button>
            </div>
          </div>
        )}

        {/* Lớp phủ cảnh báo rời camera Face Lost Auto-Pause */}
        {faceLost && (
          <div className="face-lost-overlay">
            <div className="face-lost-content">
              <UserX size={44} className="face-lost-icon" />
              <h3>Không tìm thấy khuôn mặt</h3>
              <p>Video đã tự động tạm dừng vì bạn đã rời khỏi camera hoặc bị che khuất. Hãy quay lại góc nhìn camera để tiếp tục xem bài giảng.</p>
            </div>
          </div>
        )}

        {session && session.status !== 'FINISHED' && session.status !== 'ABANDONED' && (
          <EmotionCameraCapture
            sessionId={session.id}
            active={Boolean((playing || faceLost) && hasStartedLearning && session?.status !== 'PAUSED' && session?.status !== 'FINISHED')}
            permissionGranted={cameraPermissionGranted}
            getVideoTimeSec={getVideoTimeSec}
            getExtra={getExtra}
            onPredictionUpdate={handlePredictionUpdate}
            onBatchResult={handleBatchResult}
            onSessionConflict={handleSessionConflict}
            focusScore={session.focusScore}
            onSuggestionTrigger={handleSuggestionTrigger}
          />
        )}
      </div>

      {contentItem.bodyHtml && (
        <div className="card mt-16">
          <RichTextViewer html={contentItem.bodyHtml} />
        </div>
      )}

      {/* Thanh điều khiển bài học tối giản - không gây xao nhãng */}
      <div className="flex-row mt-16" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Chỉ báo trạng thái camera dạng chấm nhỏ, bấm để bật/tắt */}
          {session && (
            <button
              type="button"
              className="btn secondary sm"
              onClick={toggleCamera}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13,
                borderColor: cameraPermissionGranted ? 'rgba(16, 185, 129, 0.4)' : undefined,
                background: cameraPermissionGranted ? 'rgba(16, 185, 129, 0.05)' : undefined
              }}
              title="Nhấn để bật hoặc tắt nhận diện cảm xúc qua camera"
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: cameraPermissionGranted ? '#10b981' : '#94a3b8',
                  display: 'inline-block'
                }}
              />
              {cameraPermissionGranted ? 'AI Camera: Bật' : 'AI Camera: Tắt'}
            </button>
          )}

          {/* Toggle mở nhịp độ cảm xúc khi cần (mặc định ẩn) */}
          {hasStartedLearning && timelineEvents.length > 0 && (
            <button
              type="button"
              className="btn sm"
              onClick={() => setShowAiTimeline(prev => !prev)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary, #64748b)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <Activity size={14} />
              {showAiTimeline ? 'Ẩn nhịp độ cảm xúc' : 'Xem nhịp độ cảm xúc'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn secondary sm"
            onClick={toggleFullscreen}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title={isFullscreen ? 'Thu nhỏ video' : 'Mở video toàn màn hình (Phím F)'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          </button>

          {session && session.status !== 'FINISHED' && session.status !== 'ABANDONED' && (
            <button
              type="button"
              className="btn primary sm"
              onClick={handleFinishClick}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle2 size={15} />
              Hoàn thành bài học
            </button>
          )}
        </div>
      </div>

      {/* Dòng thời gian cảm xúc bài giảng - chỉ hiện khi người học chủ động xem */}
      {hasStartedLearning && showAiTimeline && (
        <div style={{ marginTop: 14 }}>
          <EmotionTimelineBar
            timelineEvents={timelineEvents}
            currentTime={currentVideoTime}
            duration={videoDuration || contentItem.durationSec || 300}
            onSeek={seekVideoTo}
          />
        </div>
      )}

      {/* Giai đoạn 8: Modal báo cáo tổng kết buổi học khi hoàn tất video */}
      <SessionSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        summary={sessionSummary}
        onReplay={handleReplayVideo}
      />
    </div>
  )
}

function getLearningStateMeta(state) {
  const map = {
    ENGAGED: { label: 'Tập trung', color: 'var(--emotion-engaged, #059669)' },
    INTERESTED: { label: 'Hứng thú', color: 'var(--color-primary, #2563eb)' },
    CONFUSED: { label: 'Bối rối', color: 'var(--emotion-confused, #d97706)' },
    BORED: { label: 'Mất tập trung', color: 'var(--emotion-bored, #dc2626)' },
    NEUTRAL: { label: 'Điềm tĩnh', color: 'var(--emotion-neutral, #64748b)' },
    NO_FACE: { label: 'Rời camera', color: 'var(--emotion-noface, #ea580c)' },
  }
  return map[state] || map.ENGAGED
}

function statusLabel(status) {
  return {
    WAITING: 'Chờ bắt đầu',
    LEARNING: 'Đang học',
    PAUSED: 'Tạm dừng',
    FINISHED: 'Đã kết thúc',
    ABANDONED: 'Bỏ dở',
  }[status] || status
}

function getAutoplayIframeUrl(url, autoplay) {
  if (!url) return ''
  if (!autoplay) return url

  // Nhúng YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
  if (ytMatch && ytMatch[1]) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?enablejsapi=1&origin=${encodeURIComponent(origin)}${autoplay ? '&autoplay=1' : ''}&rel=0`
  }

  // Đã có autoplay
  if (url.includes('autoplay=')) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}autoplay=1`
}

function fmtSec(sec) {
  if (sec == null || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = String(Math.floor(sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}