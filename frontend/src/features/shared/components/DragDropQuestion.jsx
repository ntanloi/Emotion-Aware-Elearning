import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

/**
 * DragDropQuestion — Câu hỏi "Kéo thả" (DRAG_DROP).
 *
 * `promptText` chứa câu/đoạn văn đầy đủ với các ô trống được đánh dấu bằng token {{1}}, {{2}}, ...
 * `options` là TOÀN BỘ thẻ trong ngăn kéo (word bank): thẻ nào có `blankOrder` là đáp án ĐÚNG
 * cho ô trống {{blankOrder}}; thẻ nào `blankOrder = null` là thẻ mồi (distractor) — với học viên
 * (forStudent) blankOrder LUÔN null cho tới khi kiểm tra đáp án, để không lộ đáp án trước.
 *
 * Học viên kéo thẻ từ ngăn kéo thả vào ô trống tương ứng (hoặc bấm vào thẻ đã đặt để trả nó về
 * ngăn kéo) → nhấn "✓ Kiểm tra đáp án" → tất cả ô hiện đúng/sai cùng lúc.
 *
 * Props:
 *  - promptText: string — câu văn có token {{1}}, {{2}}...
 *  - options: [{ id, displayOrder, text, blankOrder }] — blankOrder bị ẩn với học viên
 *  - value: { [blankOrder]: cardId } — thẻ học viên đã thả vào từng ô (key là SỐ blankOrder)
 *  - onChange(value)
 *  - readOnly: khoá không cho kéo thả (khi xem lại)
 *  - showAnswer: hiện đúng/sai ngay (khi xem lại sau nộp bài — cần correctOptions)
 *  - onCheck: async (currentValue) => { dragDropOptions } — gọi API check toàn bộ câu
 *  - correctOptions: đáp án đúng biết trước, kèm blankOrder đã lộ (dùng khi XEM LẠI sau khi đã
 *    nộp cả bài — lấy từ AttemptAnswerResultDto.dragDropOptions, không cần gọi lại API check)
 *  - onAnswerChecked(isCorrect): báo kết quả toàn câu sau khi check
 */
export default function DragDropQuestion({
  promptText,
  options = [],
  value,
  onChange,
  readOnly = false,
  showAnswer = false,
  onCheck,
  correctOptions,
  onAnswerChecked,
}) {
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  // revealedOptions: toàn bộ thẻ kèm blankOrder THẬT nhận từ API sau khi check
  const [revealedOptions, setRevealedOptions] = useState(null);

  const placements = value || {}; // { [blankOrder]: cardId }
  const parts = useMemo(() => splitPromptText(promptText), [promptText]);
  const blankOrders = useMemo(
    () => parts.filter((p) => p.type === "blank").map((p) => p.blankOrder),
    [parts],
  );
  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.displayOrder - b.displayOrder),
    [options],
  );
  const cardById = useMemo(
    () => Object.fromEntries(options.map((o) => [o.id, o])),
    [options],
  );

  const placedCardIds = useMemo(
    () => new Set(Object.values(placements).filter(Boolean)),
    [placements],
  );
  const bankCards = sortedOptions.filter((o) => !placedCardIds.has(o.id));

  const displayAnswer = showAnswer || checked;
  // Đáp án đúng: từ API (revealedOptions) hoặc từ prop options (xem lại sau nộp bài)
  const correctByBlankOrder = useMemo(() => {
    const source = revealedOptions || (showAnswer ? (correctOptions || options) : null);
    if (!source) return {};
    const result = {};
    source.forEach((o) => {
      if (o.blankOrder) result[o.blankOrder] = o.id;
    });
    return result;
  }, [revealedOptions, showAnswer, correctOptions, options]);

  const allFilled = blankOrders.length > 0 && blankOrders.every((bo) => placements[bo]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const place = (blankOrder, cardId) => {
    if (readOnly || checked) return;
    const next = {};
    // Xoá cardId khỏi vị trí cũ (nếu có), giữ nguyên các ô khác
    Object.entries(placements).forEach(([bo, cid]) => {
      if (cid !== cardId) next[bo] = cid;
    });
    next[blankOrder] = cardId;
    onChange?.(next);
    setError(null);
  };

  const unplace = (cardId) => {
    if (readOnly || checked) return;
    const next = {};
    Object.entries(placements).forEach(([bo, cid]) => {
      if (cid !== cardId) next[bo] = cid;
    });
    onChange?.(next);
  };

  const handleDragStart = (event) => setActiveCardId(event.active.id);

  const handleDragEnd = (event) => {
    setActiveCardId(null);
    const { active, over } = event;
    if (!over) return;
    const cardId = active.id;
    if (over.id === "drag-drop-bank") {
      unplace(cardId);
    } else if (typeof over.id === "string" && over.id.startsWith("blank-")) {
      place(Number(over.id.slice("blank-".length)), cardId);
    }
  };

  const handleCheck = async () => {
    if (checking || checked) return;
    if (!allFilled) {
      setError("Bạn phải điền vào hết các ô trống");
      return;
    }
    setError(null);
    setChecking(true);
    try {
      if (onCheck) {
        const res = await onCheck(placements);
        const revealed = res?.dragDropOptions || [];
        setRevealedOptions(revealed);
        setChecked(true);
        const correctMap = Object.fromEntries(
          revealed.filter((o) => o.blankOrder).map((o) => [o.blankOrder, o.id]),
        );
        const allCorrect = blankOrders.every((bo) => placements[bo] === correctMap[bo]);
        onAnswerChecked?.(allCorrect);
      } else {
        // không có onCheck (readOnly/showAnswer mode): chỉ khoá lại
        setChecked(true);
      }
    } catch {
      // API lỗi — không khoá, cho phép thử lại
    } finally {
      setChecking(false);
    }
  };

  const handleRetry = () => {
    setChecked(false);
    setRevealedOptions(null);
    setError(null);
    onChange?.({});
  };

  const disabled = readOnly || checked;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="question-card">
        {error && <div className="form-error" style={{ marginBottom: 8 }}>{error}</div>}

        {/* Câu văn với các ô trống kéo-thả inline */}
        <div className="drag-drop-passage">
          {parts.map((piece, i) => {
            if (piece.type === "text") return <span key={i}>{piece.value}</span>;

            const cardId = placements[piece.blankOrder];
            const card = cardId ? cardById[cardId] : null;
            let status = null;
            if (displayAnswer && card) {
              const correctId = correctByBlankOrder[piece.blankOrder];
              status = correctId ? (correctId === card.id ? "correct" : "incorrect") : null;
            }
            return (
              <DropBlank
                key={i}
                blankOrder={piece.blankOrder}
                card={card}
                status={status}
                disabled={disabled}
                onRemove={card ? () => unplace(card.id) : undefined}
              />
            );
          })}
        </div>

        {/* Ngăn kéo thả (word bank) — các thẻ chưa được đặt vào ô trống nào */}
        <BankArea disabled={disabled}>
          {bankCards.length === 0 && (
            <span className="text-dim text-sm">— đã dùng hết thẻ —</span>
          )}
          {bankCards.map((card) => (
            <DragCard key={card.id} card={card} disabled={disabled} />
          ))}
        </BankArea>

        <DragOverlay>
          {activeCardId ? (
            <span className="drag-drop-card dragging">{cardById[activeCardId]?.text}</span>
          ) : null}
        </DragOverlay>

        {/* Nút Kiểm tra đáp án — hiện khi chưa check, không readOnly */}
        {!readOnly && !showAnswer && !checked && (
          <button
            className="btn secondary mt-16"
            style={{ width: "100%" }}
            onClick={handleCheck}
            disabled={checking}
          >
            {checking ? "Đang kiểm tra..." : "✓ Kiểm tra đáp án"}
          </button>
        )}

        {/* Nút Làm lại — hiện sau khi đã check, không readOnly */}
        {!readOnly && checked && (
          <button className="btn secondary mt-16" onClick={handleRetry}>
            ↻ Làm lại
          </button>
        )}
      </div>
    </DndContext>
  );
}

function DropBlank({ blankOrder, card, status, disabled, onRemove }) {
  const { isOver, setNodeRef } = useDroppable({ id: `blank-${blankOrder}`, disabled });
  const cls = ["drag-drop-blank"];
  if (isOver && !disabled) cls.push("over");
  if (!card) cls.push("empty");

  return (
    <span ref={setNodeRef} className={cls.join(" ")}>
      {card ? (
        <DragCard card={card} disabled={disabled} placed status={status} onClick={onRemove} />
      ) : (
        <span className="drag-drop-blank-slot" />
      )}
    </span>
  );
}

function BankArea({ children, disabled }) {
  const { isOver, setNodeRef } = useDroppable({ id: "drag-drop-bank", disabled });
  return (
    <div ref={setNodeRef} className={`drag-drop-bank${isOver && !disabled ? " over" : ""}`}>
      {children}
    </div>
  );
}

function DragCard({ card, disabled, placed = false, status = null, onClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled,
  });
  const cls = ["drag-drop-card"];
  if (placed) cls.push("placed");
  if (isDragging) cls.push("dragging-src");
  if (status === "correct") cls.push("correct");
  if (status === "incorrect") cls.push("incorrect");

  return (
    <span
      ref={setNodeRef}
      className={cls.join(" ")}
      onClick={disabled ? undefined : onClick}
      title={!disabled && placed ? "Bấm để trả thẻ về ngăn kéo" : undefined}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
    >
      {card.text}
    </span>
  );
}

/**
 * Tách promptText thành mảng { type:'text' } | { type:'blank', blankOrder } theo token {{n}}.
 * Khác với SENTENCE_FILL/WORD_CHOICE, blankOrder ở đây LÀ chính số n trong token (không tra
 * cứu qua danh sách blanks riêng), vì DRAG_DROP không có 1 "hàng" DB riêng cho mỗi ô trống —
 * ô trống chỉ tồn tại ngầm định qua các thẻ có cùng blankOrder.
 */
function splitPromptText(text) {
  if (!text) return [];
  const regex = /\{\{(\d+)\}\}/g;
  const result = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) result.push({ type: "text", value: text.slice(lastIndex, match.index) });
    result.push({ type: "blank", blankOrder: Number(match[1]) });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) result.push({ type: "text", value: text.slice(lastIndex) });
  return result;
}
