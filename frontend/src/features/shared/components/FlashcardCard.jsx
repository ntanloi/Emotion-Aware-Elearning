import { useEffect, useState } from 'react'
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
}) {
  const [flipped, setFlipped] = useState(false)
  const resolvedImage = resolveMediaUrl(imageUrl)

  // BUGFIX: khi bấm "Thẻ tiếp/trước" ở component cha, nếu FlashcardCard không được remount
  // (thiếu key={wordId} ở nơi gọi) thì state `flipped` cũ vẫn còn -> từ MỚI xuất hiện thẳng
  // ở mặt sau (định nghĩa). Effect này đảm bảo LUÔN quay về mặt trước mỗi khi từ thay đổi,
  // bất kể nơi gọi có truyền key hay không.
  useEffect(() => {
    setFlipped(false)
  }, [word])

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
      <div className="dict-card">
        {/* Nút lật — luôn hiện cố định góc dưới-phải, hoạt động trên cả 2 mặt */}
        <button
          type="button"
          className="dict-flip-btn"
          onClick={toggleFlip}
          aria-label="Lật thẻ"
          title="Lật thẻ"
        >
          ↻
        </button>

        {/* Mặt trước — từ + 2 audio CÙNG hàng, phiên âm bên dưới */}
        {!flipped && (
          <div className="dict-card-front" onClick={toggleFlip}>
            <div className="dict-front-word-row">
              <span className="flashcard-word">{word}</span>
              {(audioUkUrl || audioUsUrl) && (
                <div className="dict-audio-row" onClick={(e) => e.stopPropagation()}>
                  {audioUkUrl && (
                    <div className="dict-audio-item">
                      <AudioPlayer src={audioUkUrl} compact />
                      <span className="audio-tag">UK</span>
                    </div>
                  )}
                  {audioUsUrl && (
                    <div className="dict-audio-item">
                      <AudioPlayer src={audioUsUrl} compact />
                      <span className="audio-tag">US</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {ipa && (
              <div className="flashcard-ipa">
                {partOfSpeech && <span className="dict-pos">({partOfSpeech})</span>} /{ipa}/
              </div>
            )}
          </div>
        )}

        {/* Mặt sau — CHỈ định nghĩa + ảnh + ví dụ, không lặp lại từ/audio */}
        {flipped && (
          <div className="dict-card-back">
            <div className="dict-body">
              <div className="dict-definition-col">
                <div className="dict-section-label">Định nghĩa:</div>
                <p className="dict-meaning">{meaningVi}</p>
              </div>
              {resolvedImage && (
                <div className="dict-image-col">
                  <img src={resolvedImage} alt={word} className="dict-image" />
                </div>
              )}
            </div>

            {examples.length > 0 && (
              <div className="dict-examples">
                <div className="dict-section-label">Ví dụ:</div>
                <ul className="dict-example-list">
                  {examples.map((ex, i) => (
                    <li key={ex.id || i} className="dict-example-item">
                      <div>{highlightWord(ex.sentenceEn)}</div>
                      {ex.sentenceVi && (
                        <div className="text-dim text-sm">(=Dịch: {ex.sentenceVi})</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {(onKnow || onDontKnow) && (
        <div className="flashcard-actions">
          <button className="btn secondary" onClick={onDontKnow}>❌ Chưa biết</button>
          <button className="btn" onClick={onKnow}>✅ Đã biết</button>
        </div>
      )}
    </div>
  )
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}