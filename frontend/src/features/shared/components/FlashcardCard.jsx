import { useEffect, useState } from 'react'
import { X, Check, RotateCcw } from 'lucide-react'
import AudioPlayer from '@shared/components/AudioPlayer.jsx'
import { resolveMediaUrl } from '@config/media.js'

/**
 * FlashcardCard — Giai đoạn 5, component #6c (bố cục kiểu "thẻ từ điển").
 * Mặt trước: từ + 2 audio (UK/US) CÙNG một hàng, phiên âm bên dưới — bấm để lật.
 * Mặt sau: CHỈ Định nghĩa (+ ảnh minh hoạ) + Ví dụ (không audio, không lặp lại từ/audio).
 * Nút lật (↻) luôn hiện cố định ở góc dưới-phải trên CẢ 2 mặt để lật qua/lật lại.
 * Dùng ở tab Flashcard của "Bộ từ vựng" và trang Ôn tập Flashcards tổng hợp.
 *
 * Props:
 *  - word, ipa?, partOfSpeech?, meaningVi
 *  - imageUrl?: ảnh minh hoạ
 *  - audioUkUrl?, audioUsUrl?: 2 audio phát âm UK/US
 *  - examples?: [{ sentenceEn, sentenceVi }] — không cần audio
 *  - onKnow(), onDontKnow(): callback nút "Đã biết/Chưa biết"
 */
export default function FlashcardCard({
  word,
  ipa,
  partOfSpeech,
  meaningVi,
  imageUrl,
  audioUkUrl,
  audioUsUrl,
  examples = [],
  onKnow,
  onDontKnow,
  flipped: controlledFlipped,
  onFlipChange,
}) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped
  const resolvedImage = resolveMediaUrl(imageUrl)

  const setFlipped = (nextVal) => {
    const nextBool = typeof nextVal === 'function' ? nextVal(isFlipped) : nextVal
    if (controlledFlipped === undefined) {
      setInternalFlipped(nextBool)
    }
    onFlipChange?.(nextBool)
  }

  // BUGFIX: khi bấm "Thẻ tiếp/trước" ở component cha, nếu FlashcardCard không được remount
  // (thiếu key={wordId} ở nơi gọi) thì state `flipped` cũ vẫn còn -> từ MỚI xuất hiện thẳng
  // ở mặt sau (định nghĩa). Effect này đảm bảo LUÔN quay về mặt trước mỗi khi từ thay đổi,
  // bất kể nơi gọi có truyền key hay không.
  useEffect(() => {
    if (controlledFlipped === undefined) {
      setInternalFlipped(false)
    }
  }, [word, controlledFlipped])

  // In đậm từ vựng xuất hiện trong câu ví dụ (giống kiểu highlight [word] của từ điển)
  const highlightWord = (sentence) => {
    if (!sentence || !word) return sentence
    const parts = sentence.split(new RegExp(`(${escapeRegExp(word)})`, 'i'))
    return parts.map((part, i) =>
      part.toLowerCase() === word.toLowerCase() ? (
        <strong key={i} className="example-highlight">{part}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }

  const toggleFlip = () => setFlipped((f) => !f)

  return (
    <div className="flashcard-stage">
      <div className={`dict-card ${isFlipped ? 'flipped' : ''}`}>
        {/* Thanh tiêu đề nhỏ trên cùng của thẻ */}
        <div className="dict-card-top-bar">
          <div className="dict-card-pos-wrap">
            {partOfSpeech ? (
              <span className={`dict-pos-badge ${partOfSpeech.toLowerCase()}`}>
                {partOfSpeech}
              </span>
            ) : (
              <span className="dict-pos-badge default">vocab</span>
            )}
          </div>
          <button
            type="button"
            className="dict-flip-btn-header"
            onClick={toggleFlip}
            aria-label="Lật thẻ"
            title="Lật thẻ"
          >
            <RotateCcw size={12} />
            <span>{isFlipped ? 'Xem từ' : 'Xem nghĩa'}</span>
          </button>
        </div>

        {/* Mặt trước — từ + 2 audio UK/US + phiên âm */}
        {!isFlipped && (
          <div className="dict-card-front" onClick={toggleFlip}>
            <div className="dict-word-container">
              <h3 className="dict-main-word">{word}</h3>
              {ipa && (
                <div className="dict-main-ipa">
                  /{ipa}/
                </div>
              )}
            </div>

            {(audioUkUrl || audioUsUrl) && (
              <div className="dict-audio-row" onClick={(e) => e.stopPropagation()}>
                {audioUkUrl && (
                  <AudioPlayer src={audioUkUrl} compact label="UK" />
                )}
                {audioUsUrl && (
                  <AudioPlayer src={audioUsUrl} compact label="US" />
                )}
              </div>
            )}

            <div className="dict-card-hint">
              <span>Chạm thẻ để lật xem định nghĩa</span>
            </div>
          </div>
        )}

        {/* Mặt sau — Định nghĩa + Ảnh minh hoạ + Ví dụ */}
        {isFlipped && (
          <div className={`dict-card-back ${resolvedImage ? 'has-image' : ''}`} onClick={toggleFlip}>
            <div className="dict-back-layout">
              {/* Cột thông tin từ vựng, định nghĩa & ví dụ */}
              <div className="dict-back-main">
                <div className="dict-back-recap">
                  <span className="dict-recap-word">{word}</span>
                  {ipa && <span className="dict-recap-ipa">/{ipa}/</span>}
                  {(audioUkUrl || audioUsUrl) && (
                    <div className="dict-back-audio-row" onClick={(e) => e.stopPropagation()}>
                      {audioUkUrl && <AudioPlayer src={audioUkUrl} compact label="UK" />}
                      {audioUsUrl && <AudioPlayer src={audioUsUrl} compact label="US" />}
                    </div>
                  )}
                </div>

                <div className="dict-definition-block">
                  <div className="dict-section-label">Định nghĩa:</div>
                  <p className="dict-meaning">{meaningVi}</p>
                </div>

                {examples.length > 0 && (
                  <div className="dict-examples" onClick={(e) => e.stopPropagation()}>
                    <div className="dict-section-label">Ví dụ minh họa:</div>
                    <ul className="dict-example-list">
                      {examples.map((ex, i) => (
                        <li key={ex.id || i} className="dict-example-item">
                          <div className="dict-example-en">"{highlightWord(ex.sentenceEn)}"</div>
                          {ex.sentenceVi && (
                            <div className="dict-example-vi">{ex.sentenceVi}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Khung ảnh minh họa lớn, nổi bật & cân đối */}
              {resolvedImage && (
                <div className="dict-image-container" onClick={(e) => e.stopPropagation()}>
                  <div className="dict-image-frame">
                    <img
                      src={resolvedImage}
                      alt={word}
                      className="dict-image-large"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                  <span className="dict-image-caption">Hình ảnh minh họa</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(onKnow || onDontKnow) && (
        <div className="flashcard-actions">
          {onDontKnow && (
            <button
              type="button"
              className="flashcard-action-btn dont-know"
              onClick={onDontKnow}
            >
              <X size={17} strokeWidth={2.5} />
              <span>Chưa biết</span>
            </button>
          )}
          {onKnow && (
            <button
              type="button"
              className="flashcard-action-btn know"
              onClick={onKnow}
            >
              <Check size={17} strokeWidth={2.5} />
              <span>Đã biết</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}