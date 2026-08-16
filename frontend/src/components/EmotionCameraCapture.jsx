import { useEffect, useRef, useState, useCallback } from 'react'
import { sendFrameBatch } from '../api/emotions.js'

const CAPTURE_INTERVAL_MS = 10_000 // BR-04: mac dinh 10 giay/lan
const BATCH_SIZE = 6               // BR-04: gop toi da 6 ban ghi (~1 phut)

/**
 * Thanh phan bat webcam va gui khung hinh len backend theo dung BR-04.
 *
 * QUAN TRONG - day la thanh phan se thay doi nhieu nhat khi chuyen tu face-api.js
 * sang AI tu train:
 *   - Ban dau (face-api.js): component nay se TU nhan dien cam xuc ngay tren browser
 *     bang tensorflow.js, roi chi gui { emotion_label, confidence_score } len server.
 *   - Hien tai (AI tu train o server): component chi lam nhiem vu CHUP anh va GUI anh
 *     tho len backend (qua sendFrameBatch) - khong tu nhan dien gi ca. Backend se lo
 *     phan goi AI (xem service/emotion/EmotionRecognitionClient.java ben backend).
 *
 * Nho thiet ke nay, ban co the build UI/luong hoc tap hoan chinh ngay bay gio voi
 * MockEmotionRecognitionClient (nhan gia lap) ma khong can cho AI train xong.
 */
export default function EmotionCameraCapture({ sessionId, active, onPermissionResult }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const bufferRef = useRef([])
  const [permission, setPermission] = useState('pending') // pending | granted | denied
  const [lastEmotion, setLastEmotion] = useState(null)

  useEffect(() => {
    let stream
    async function requestCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        if (videoRef.current) videoRef.current.srcObject = stream
        setPermission('granted')
        onPermissionResult?.(true)
      } catch {
        setPermission('denied') // BR-03: tu choi van cho hoc binh thuong
        onPermissionResult?.(false)
      }
    }
    requestCamera()
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [onPermissionResult])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return null
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.7)
  }, [])

  useEffect(() => {
    if (permission !== 'granted' || !active) return

    const interval = setInterval(async () => {
      const frame = captureFrame()
      if (!frame) return
      bufferRef.current.push(frame)

      if (bufferRef.current.length >= BATCH_SIZE) {
        const batch = bufferRef.current
        bufferRef.current = []
        try {
          const results = await sendFrameBatch(sessionId, batch)
          setLastEmotion(results[results.length - 1])
        } catch (err) {
          // NFR Kha dung: loi AI khong duoc lam gian doan video - chi log, khong throw
          console.warn('Khong gui duoc lo cam xuc:', err)
        }
      }
    }, CAPTURE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [permission, active, sessionId, captureFrame])

  return (
    <>
      <video ref={videoRef} autoPlay muted playsInline className="camera-preview"
             style={{ display: permission === 'granted' ? 'block' : 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {permission === 'granted' && lastEmotion && (
        <span className="emotion-badge">
          <span className="dot" /> {lastEmotion.emotionLabel}
        </span>
      )}
      {permission === 'denied' && (
        <span className="emotion-badge">Không dùng camera — vẫn học bình thường</span>
      )}
    </>
  )
}
