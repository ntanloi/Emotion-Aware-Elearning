import { useEffect, useMemo, useState } from 'react'

/**
 * MatchingPairsGame — Game ghép cặp từ.
 * Chọn đúng → màu xanh, chọn sai → đỏ + rung + reset.
 *
 * Props:
 *  - pairs: [{ id, leftContent, rightContent }]
 *  - onChange(matchedPairs: [{leftContent, rightContent}])
 *  - readOnly, showAnswer
 */
export default function MatchingPairsGame({ pairs, onChange, readOnly = false, showAnswer = false }) {
  const leftItems = useMemo(() => shuffle(pairs.map((p) => ({ key: p.id, content: p.leftContent }))), [pairs])
  const rightItems = useMemo(() => shuffle(pairs.map((p) => ({ key: p.id, content: p.rightContent }))), [pairs])

  const [selectedLeft, setSelectedLeft] = useState(null)
  const [matches, setMatches] = useState({}) // leftKey -> rightContent
  const [shaking, setShaking] = useState(null) // key đang rung

  useEffect(() => {
    const result = Object.entries(matches).map(([leftKey, rightContent]) => {
      const left = leftItems.find((l) => l.key === leftKey)
      return { leftContent: left?.content, rightContent }
    })
    onChange?.(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches])

  const matchedRightContents = new Set(Object.values(matches))

  const pickLeft = (item) => {
    if (readOnly || matches[item.key]) return
    setSelectedLeft(item)
  }

  const pickRight = (item) => {
    if (readOnly || !selectedLeft || matchedRightContents.has(item.content)) return
    
    // Kiểm tra đúng/sai
    const isCorrect = isRightCorrectFor(selectedLeft.key, item.content)
    
    if (isCorrect) {
      // Đúng → lưu kết quả, màu xanh
      setMatches((prev) => ({ ...prev, [selectedLeft.key]: item.content }))
      setSelectedLeft(null)
    } else {
      // Sai → rung + reset
      setShaking(selectedLeft.key)
      setTimeout(() => {
        setShaking(null)
        setSelectedLeft(null)
      }, 500)
    }
  }

  const isRightCorrectFor = (leftKey, rightContent) => {
    const pair = pairs.find((p) => p.id === leftKey)
    return pair && pair.rightContent === rightContent
  }

  return (
    <div>
      <div className="matching-wrap">
        <div className="matching-col">
          {leftItems.map((item) => {
            const matched = !!matches[item.key]
            const cls = ['matching-item']
            if (selectedLeft?.key === item.key) cls.push('selected')
            if (matched) cls.push('matched')
            if (shaking === item.key) cls.push('shake-animation')
            if (showAnswer && matched && !isRightCorrectFor(item.key, matches[item.key])) cls.push('wrong')
            return (
              <div key={item.key} className={cls.join(' ')} onClick={() => pickLeft(item)}>
                {item.content}
                {matched && <span className="text-dim text-sm"> → {matches[item.key]}</span>}
              </div>
            )
          })}
        </div>
        <div className="matching-col">
          {rightItems.map((item, idx) => {
            const used = matchedRightContents.has(item.content)
            const cls = ['matching-item']
            if (used) cls.push('matched')
            return (
              <div key={item.key + '-' + idx} className={cls.join(' ')} onClick={() => pickRight(item)}>
                {item.content}
              </div>
            )
          })}
        </div>
      </div>
      {!readOnly && <p className="text-dim text-sm mt-16">Chọn 1 mục bên trái rồi chọn mục tương ứng bên phải để ghép cặp.</p>}
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

