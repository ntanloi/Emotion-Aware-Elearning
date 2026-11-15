import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Sparkles, Check, RotateCcw, CheckCircle2, Lightbulb } from 'lucide-react'

/**
 * MatchingPairsGame — Game ghép cặp từ vựng tương tác cao.
 * Hỗ trợ chọn 2 chiều (Anh -> Việt hoặc Việt -> Anh).
 * Chọn đúng → chuyển sang màu xanh + checkmark.
 * Chọn sai → rung lắc + đỏ + reset trạng thái.
 *
 * Props:
 *  - pairs: [{ id, leftContent, rightContent }]
 *  - onChange(matchedPairs: [{ leftContent, rightContent }])
 *  - readOnly: boolean
 *  - showAnswer: boolean
 */
export default function MatchingPairsGame({ pairs = [], onChange, readOnly = false, showAnswer = false }) {
  const leftItems = useMemo(
    () => shuffle((pairs || []).map((p) => ({ key: p.id, content: p.leftContent }))),
    [pairs],
  )
  const rightItems = useMemo(
    () => shuffle((pairs || []).map((p) => ({ key: p.id, content: p.rightContent }))),
    [pairs],
  )

  const [selectedLeft, setSelectedLeft] = useState(null)
  const [selectedRight, setSelectedRight] = useState(null)
  const [matches, setMatches] = useState({}) // leftKey -> rightContent
  const [shakingKeys, setShakingKeys] = useState(null) // { leftKey, rightKey }

  // Reset khi pairs thay đổi
  useEffect(() => {
    setMatches({})
    setSelectedLeft(null)
    setSelectedRight(null)
    setShakingKeys(null)
  }, [pairs])

  // Báo kết quả ra ngoài
  useEffect(() => {
    const result = Object.entries(matches).map(([leftKey, rightContent]) => {
      const left = leftItems.find((l) => l.key === leftKey)
      return { leftContent: left?.content, rightContent }
    })
    onChange?.(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches])

  const matchedRightContents = useMemo(() => new Set(Object.values(matches)), [matches])
  const totalCount = pairs.length
  const matchedCount = Object.keys(matches).length
  const isComplete = totalCount > 0 && matchedCount === totalCount
  const progressPercent = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0

  const isRightCorrectFor = (leftKey, rightContent) => {
    const pair = pairs.find((p) => p.id === leftKey)
    return pair && pair.rightContent === rightContent
  }

  // Xử lý khi click vào ô bên trái (English)
  const pickLeft = (item) => {
    if (readOnly || matches[item.key] || shakingKeys) return

    // Click lại vào chính thẻ đang chọn -> huỷ chọn
    if (selectedLeft?.key === item.key) {
      setSelectedLeft(null)
      return
    }

    // Nếu đã chọn bên phải trước đó -> thực hiện ghép
    if (selectedRight) {
      const rightKey = selectedRight.rightKey
      const isCorrect = isRightCorrectFor(item.key, selectedRight.content)

      if (isCorrect) {
        setMatches((prev) => ({ ...prev, [item.key]: selectedRight.content }))
        setSelectedLeft(null)
        setSelectedRight(null)
      } else {
        setShakingKeys({ leftKey: item.key, rightKey })
        setTimeout(() => {
          setShakingKeys(null)
          setSelectedLeft(null)
          setSelectedRight(null)
        }, 550)
      }
      return
    }

    // Chưa chọn bên phải -> chọn thẻ trái này
    setSelectedLeft(item)
  }

  // Xử lý khi click vào ô bên phải (Vietnamese)
  const pickRight = (item, idx) => {
    const rightKey = `${item.key}-${idx}`
    if (readOnly || matchedRightContents.has(item.content) || shakingKeys) return

    // Click lại vào chính thẻ đang chọn -> huỷ chọn
    if (selectedRight?.rightKey === rightKey) {
      setSelectedRight(null)
      return
    }

    // Nếu đã chọn bên trái trước đó -> thực hiện ghép
    if (selectedLeft) {
      const isCorrect = isRightCorrectFor(selectedLeft.key, item.content)

      if (isCorrect) {
        setMatches((prev) => ({ ...prev, [selectedLeft.key]: item.content }))
        setSelectedLeft(null)
        setSelectedRight(null)
      } else {
        setShakingKeys({ leftKey: selectedLeft.key, rightKey })
        setTimeout(() => {
          setShakingKeys(null)
          setSelectedLeft(null)
          setSelectedRight(null)
        }, 550)
      }
      return
    }

    // Chưa chọn bên trái -> chọn thẻ phải này
    setSelectedRight({ ...item, rightKey })
  }

  const handleReset = () => {
    setMatches({})
    setSelectedLeft(null)
    setSelectedRight(null)
    setShakingKeys(null)
  }

  if (!pairs || pairs.length === 0) {
    return <div className="text-dim text-center py-20">Không có dữ liệu cặp từ ghép.</div>
  }

  return (
    <div className="matching-game-container">
      {/* Header trạng thái & tiến độ */}
      <div className="matching-header-card">
        <div className="matching-meta-row">
          <div className="matching-status-badge">
            <span>Tiến độ ghép cặp:</span>
            <strong>{matchedCount}</strong> / <span>{totalCount} cặp</span>
          </div>

          <div className="matching-header-actions">
            {isComplete && (
              <span className="matching-done-badge">
                <CheckCircle2 size={15} />
                Hoàn thành tất cả!
              </span>
            )}
            {!readOnly && matchedCount > 0 && !isComplete && (
              <button
                type="button"
                className="matching-reset-btn"
                onClick={handleReset}
                title="Làm lại từ đầu"
              >
                <RotateCcw size={13} />
                <span>Làm lại</span>
              </button>
            )}
          </div>
        </div>

        <div className="matching-progress-track">
          <div className="matching-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {!readOnly && !isComplete && (
          <div className="matching-hint-box">
            <Lightbulb size={14} className="matching-hint-icon" />
            <span>
              Chọn một từ tiếng Anh ở <strong>cột trái</strong> và định nghĩa tương ứng ở <strong>cột phải</strong> để ghép đôi.
            </span>
          </div>
        )}
      </div>

      {/* Grid 2 cột */}
      <div className="matching-board-grid">
        {/* Cột trái: Từ vựng tiếng Anh */}
        <div className="matching-col-wrapper">
          <div className="matching-col-header left-header">
            <span className="matching-lang-tag">EN</span>
            <BookOpen size={15} />
            <span>Từ vựng tiếng Anh</span>
          </div>

          <div className="matching-items-list">
            {leftItems.map((item, idx) => {
              const matched = !!matches[item.key]
              const isSelected = selectedLeft?.key === item.key
              const isShaking = shakingKeys?.leftKey === item.key
              const isWrong = showAnswer && matched && !isRightCorrectFor(item.key, matches[item.key])

              const cls = ['matching-card', 'matching-card-left', 'matching-item']
              if (isSelected) cls.push('selected')
              if (matched) cls.push('matched')
              if (isShaking) cls.push('shake-animation')
              if (isWrong) cls.push('wrong')

              return (
                <div
                  key={item.key}
                  className={cls.join(' ')}
                  onClick={() => pickLeft(item)}
                  role="button"
                  tabIndex={matched || readOnly ? -1 : 0}
                >
                  <div className="matching-card-content">
                    <span className="matching-card-index">{idx + 1}</span>
                    <span className="matching-card-text font-bold">{item.content}</span>
                  </div>

                  {matched ? (
                    <span className="matching-check-pill" title="Đã ghép chính xác">
                      <Check size={13} strokeWidth={2.5} />
                    </span>
                  ) : isSelected ? (
                    <span className="matching-selected-indicator" />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cột phải: Định nghĩa tiếng Việt */}
        <div className="matching-col-wrapper">
          <div className="matching-col-header right-header">
            <span className="matching-lang-tag">VI</span>
            <Sparkles size={15} />
            <span>Định nghĩa tiếng Việt</span>
          </div>

          <div className="matching-items-list">
            {rightItems.map((item, idx) => {
              const rightKey = `${item.key}-${idx}`
              const used = matchedRightContents.has(item.content)
              const isSelected = selectedRight?.rightKey === rightKey
              const isShaking = shakingKeys?.rightKey === rightKey

              const cls = ['matching-card', 'matching-card-right', 'matching-item']
              if (isSelected) cls.push('selected')
              if (used) cls.push('matched')
              if (isShaking) cls.push('shake-animation')

              return (
                <div
                  key={rightKey}
                  className={cls.join(' ')}
                  onClick={() => pickRight(item, idx)}
                  role="button"
                  tabIndex={used || readOnly ? -1 : 0}
                >
                  <div className="matching-card-content">
                    <span className="matching-card-index">{idx + 1}</span>
                    <span className="matching-card-text">{item.content}</span>
                  </div>

                  {used ? (
                    <span className="matching-check-pill" title="Đã ghép chính xác">
                      <Check size={13} strokeWidth={2.5} />
                    </span>
                  ) : isSelected ? (
                    <span className="matching-selected-indicator" />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
