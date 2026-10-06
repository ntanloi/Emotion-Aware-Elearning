import { useEffect, useState } from "react";
import Modal from "@shared/components/ui/Modal.jsx";
import MediaUploader from "@shared/components/ui/MediaUploader.jsx";
import {
  useCreateQuestion,
  useUpdateQuestion,
  useQuestionTags,
} from "@teacher/hooks/useTeacherQuestions.js";
import { passageTitle } from "@teacher/utils/passageTitle.js";

const KIND_LABEL = {
  MULTIPLE_CHOICE: "Trắc nghiệm (A/B/C/D)",
  FILL_BLANK: "Điền từ",
  MATCHING: "Ghép cặp",
  WORD_CHOICE: "Chọn từ trong đoạn văn",
  SENTENCE_FILL: "Điền từ vào chỗ trống trong câu",
  DRAG_DROP: "Kéo thả",
};

const LABELS = ["A", "B", "C", "D", "E", "F"];
const emptyOption = () => ({ content: "", isCorrect: false });
const emptyPair = () => ({ leftContent: "", rightContent: "" });
const emptyWordChoicePair = () => ({
  optionA: "",
  optionB: "",
  correctOption: "A",
});
const emptySentenceFillBlank = () => ({ correctText: "", hint: "" });
// DRAG_DROP: mỗi ô trống {{n}} cần đúng 1 "thẻ đáp án" (dragDropBlanks[n-1]) — thẻ này khi tạo
// sẽ tự chèn token {{n}} vào promptText, giống hệt SENTENCE_FILL. Ngoài ra có thể thêm các
// "thẻ mồi" (dragDropDistractors) không khớp ô trống nào (blankOrder = null khi gửi lên BE).
const emptyDragDropBlank = () => ({ text: "" });
const emptyDragDropDistractor = () => ({ text: "" });

/**
 * QuestionModal — soạn 1 câu hỏi cho Part 1-7/Ngữ pháp.
 *
 * Có 3 luồng mở modal, phân biệt bằng `initialPassageId`/`lockPassageSelect`:
 * 1. Từ card 1 Đoạn văn cụ thể ("+ Câu hỏi cho đoạn văn này") → initialPassageId=<id đoạn văn
 *    đó>, lockPassageSelect=true — modal tự gắn sẵn, giáo viên không cần/không thể đổi. Bộ câu
 *    hỏi theo đoạn văn CHỈ hỗ trợ dạng Trắc nghiệm nên phần "Loại câu hỏi" cũng bị ẩn, luôn
 *    tạo MULTIPLE_CHOICE.
 * 2. Từ nút "+ Thêm câu hỏi" độc lập ở dưới → initialPassageId=null, lockPassageSelect=true —
 *    modal ẩn hẳn phần chọn đoạn văn, luôn tạo câu hỏi độc lập (passageId=null) dù có đoạn văn
 *    nào tồn tại hay không.
 * 3. Sửa 1 câu hỏi đã có (bấm ✏️ trong danh sách Câu hỏi) → lockPassageSelect=false (mặc định)
 *    — vẫn hiện dropdown để giáo viên đổi/gỡ đoạn văn liên kết nếu cần, như hành vi cũ.
 */
export default function QuestionModal({
  open,
  contentItemId,
  passages = [],
  question,
  onClose,
  initialPassageId = null,
  lockPassageSelect = false,
}) {
  const [kind, setKind] = useState("MULTIPLE_CHOICE");
  const [passageId, setPassageId] = useState("");
  const [promptText, setPromptText] = useState("");
  const [tag, setTag] = useState("");
  const [tagMode, setTagMode] = useState("select"); // 'select' | 'custom'
  const [tagScope, setTagScope] = useState("current"); // 'current' (Part đang mở) | 'all' (mọi Part)
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [options, setOptions] = useState([emptyOption(), emptyOption()]);
  const [correctText, setCorrectText] = useState("");
  const [hint, setHint] = useState("");
  const [pairs, setPairs] = useState([emptyPair(), emptyPair()]);
  const [wordChoicePairs, setWordChoicePairs] = useState([
    emptyWordChoicePair(),
  ]);
  const [sentenceFillBlanks, setSentenceFillBlanks] = useState([
    emptySentenceFillBlank(),
  ]);
  const [dragDropBlanks, setDragDropBlanks] = useState([emptyDragDropBlank()]);
  const [dragDropDistractors, setDragDropDistractors] = useState([]);
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState(null);

  const isEdit = !!question;
  // Tạo mới câu hỏi cho 1 đoạn văn cụ thể (không phải sửa) — Bộ câu hỏi theo đoạn văn chỉ hỗ trợ
  // Trắc nghiệm, nên ẩn "Loại câu hỏi" và luôn dùng MULTIPLE_CHOICE.
  const forNewPassageQuestion =
    !isEdit && lockPassageSelect && !!initialPassageId;
  const createQuestion = useCreateQuestion(contentItemId);
  const updateQuestion = useUpdateQuestion(contentItemId);
  const { data: existingTags = [] } = useQuestionTags(contentItemId, tagScope);

  // Gom nhóm tag theo tiền tố "[Part N]" (đã có sẵn trong chuỗi tag do script/giáo viên đặt) —
  // không cần cột riêng, chỉ đọc lại chuỗi. Tag không có tiền tố "[Part ...]" rơi vào "Khác".
  const tagGroups = existingTags.reduce((groups, t) => {
    const m = t.match(/^\[Part\s*(\d+)\]/i);
    const key = m ? `Part ${m[1]}` : "Khác";
    (groups[key] ||= []).push(t);
    return groups;
  }, {});
  const saving = createQuestion.isPending || updateQuestion.isPending;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (question) {
      setKind(question.questionKind);
      setPassageId(question.passageId || "");
      setPromptText(question.promptText || "");
      setTag(question.tag || "");
      setTagMode(
        question.tag && !existingTags.includes(question.tag)
          ? "custom"
          : "select",
      );
      setImage(
        question.imageUrl
          ? { url: question.imageUrl, fileName: "Ảnh hiện tại" }
          : null,
      );
      setAudio(
        question.audioUrl
          ? { url: question.audioUrl, fileName: "Audio hiện tại" }
          : null,
      );
      setOptions(
        question.options?.length
          ? question.options.map((o) => ({
              content: o.content,
              isCorrect: !!o.isCorrect,
            }))
          : [emptyOption(), emptyOption()],
      );
      setCorrectText(question.correctText || "");
      setHint(question.hint || "");
      setPairs(
        question.matchingPairs?.length
          ? question.matchingPairs.map((p) => ({
              leftContent: p.leftContent,
              rightContent: p.rightContent,
            }))
          : [emptyPair(), emptyPair()],
      );
      setWordChoicePairs(
        question.wordChoicePairs?.length
          ? [...question.wordChoicePairs]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((p) => ({
                optionA: p.optionA,
                optionB: p.optionB,
                correctOption: p.correctOption || "A",
              }))
          : [emptyWordChoicePair()],
      );
      setSentenceFillBlanks(
        question.sentenceFillBlanks?.length
          ? [...question.sentenceFillBlanks]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((b) => ({
                correctText: b.correctText || "",
                hint: b.hint || "",
              }))
          : [emptySentenceFillBlank()],
      );
      // dragDropOptions (teacher view) gồm cả thẻ đáp án (blankOrder != null) và thẻ mồi
      // (blankOrder == null), trộn lẫn theo displayOrder — tách lại thành 2 danh sách để soạn.
      const ddOptions = question.dragDropOptions || [];
      const ddBlanks = ddOptions
        .filter((o) => o.blankOrder != null)
        .sort((a, b) => a.blankOrder - b.blankOrder)
        .map((o) => ({ text: o.text }));
      const ddDistractors = ddOptions
        .filter((o) => o.blankOrder == null)
        .map((o) => ({ text: o.text }));
      setDragDropBlanks(ddBlanks.length ? ddBlanks : [emptyDragDropBlank()]);
      setDragDropDistractors(ddDistractors);
      setExplanation(question.explanation || "");
    } else {
      setKind("MULTIPLE_CHOICE");
      setPassageId(initialPassageId || "");
      setPromptText("");
      setTag("");
      setTagMode("select");
      setTagScope("current");
      setImage(null);
      setAudio(null);
      setOptions([emptyOption(), emptyOption()]);
      setCorrectText("");
      setHint("");
      setPairs([emptyPair(), emptyPair()]);
      setWordChoicePairs([emptyWordChoicePair()]);
      setSentenceFillBlanks([emptySentenceFillBlank()]);
      setDragDropBlanks([emptyDragDropBlank()]);
      setDragDropDistractors([]);
      setExplanation("");
    }
  }, [open, question, initialPassageId]);

  const addOption = () => setOptions((o) => [...o, emptyOption()]);
  const removeOption = (idx) =>
    setOptions((o) => o.filter((_, i) => i !== idx));
  const updateOption = (idx, key, value) =>
    setOptions((o) =>
      o.map((opt, i) => (i === idx ? { ...opt, [key]: value } : opt)),
    );
  const setCorrectOption = (idx) =>
    setOptions((o) => o.map((opt, i) => ({ ...opt, isCorrect: i === idx })));

  const addPair = () => setPairs((p) => [...p, emptyPair()]);
  const removePair = (idx) => setPairs((p) => p.filter((_, i) => i !== idx));
  const updatePair = (idx, key, value) =>
    setPairs((p) =>
      p.map((pair, i) => (i === idx ? { ...pair, [key]: value } : pair)),
    );

  // Thêm 1 blank mới + tự chèn token {{n}} vào cuối đoạn văn (n = số thứ tự blank, khớp với
  // orderIndex mà backend sẽ gán) — giáo viên có thể tự kéo/di chuyển token trong textarea sau đó.
  const addWordChoicePair = () => {
    setWordChoicePairs((p) => {
      const next = [...p, emptyWordChoicePair()];
      const n = next.length;
      setPromptText(
        (t) =>
          `${t}${t && !t.endsWith(" ") && !t.endsWith("\n") ? " " : ""}{{${n}}} `,
      );
      return next;
    });
  };
  const removeWordChoicePair = (idx) =>
    setWordChoicePairs((p) => p.filter((_, i) => i !== idx));
  const updateWordChoicePair = (idx, key, value) =>
    setWordChoicePairs((p) =>
      p.map((pair, i) => (i === idx ? { ...pair, [key]: value } : pair)),
    );

  // Sentence Fill blank helpers
  const addSentenceFillBlank = () => {
    setSentenceFillBlanks((b) => {
      const next = [...b, emptySentenceFillBlank()];
      const n = next.length;
      setPromptText(
        (t) =>
          `${t}${t && !t.endsWith(" ") && !t.endsWith("\n") ? " " : ""}{{${n}}} `,
      );
      return next;
    });
  };
  const removeSentenceFillBlank = (idx) =>
    setSentenceFillBlanks((b) => b.filter((_, i) => i !== idx));
  const updateSentenceFillBlank = (idx, key, value) =>
    setSentenceFillBlanks((b) =>
      b.map((blank, i) => (i === idx ? { ...blank, [key]: value } : blank)),
    );

  // DRAG_DROP blank helpers — thêm 1 thẻ đáp án mới + tự chèn token {{n}} vào cuối câu văn,
  // giống hệt cơ chế SENTENCE_FILL (n = thứ tự thẻ, khớp blankOrder mà BE sẽ gán).
  const addDragDropBlank = () => {
    setDragDropBlanks((b) => {
      const next = [...b, emptyDragDropBlank()];
      const n = next.length;
      setPromptText(
        (t) =>
          `${t}${t && !t.endsWith(" ") && !t.endsWith("\n") ? " " : ""}{{${n}}} `,
      );
      return next;
    });
  };
  const removeDragDropBlank = (idx) =>
    setDragDropBlanks((b) => b.filter((_, i) => i !== idx));
  const updateDragDropBlank = (idx, value) =>
    setDragDropBlanks((b) =>
      b.map((blank, i) => (i === idx ? { text: value } : blank)),
    );

  // DRAG_DROP distractor helpers — thẻ mồi không khớp ô trống nào, không đụng vào promptText.
  const addDragDropDistractor = () =>
    setDragDropDistractors((d) => [...d, emptyDragDropDistractor()]);
  const removeDragDropDistractor = (idx) =>
    setDragDropDistractors((d) => d.filter((_, i) => i !== idx));
  const updateDragDropDistractor = (idx, value) =>
    setDragDropDistractors((d) =>
      d.map((dis, i) => (i === idx ? { text: value } : dis)),
    );

  const buildPayload = () => {
    const base = {
      passageId: passageId || null,
      questionKind: kind,
      promptText: promptText.trim() || null,
      tag: tag.trim() || null,
      imageMediaId: image?.id ?? null,
      audioMediaId: audio?.id ?? null,
      explanation: explanation.trim() || null,
    };
    if (kind === "MULTIPLE_CHOICE") {
      return {
        ...base,
        options: options.map((o, i) => ({
          label: LABELS[i],
          content: o.content.trim(),
          isCorrect: o.isCorrect,
        })),
      };
    }
    if (kind === "FILL_BLANK") {
      return {
        ...base,
        textAnswer: {
          correctText: correctText.trim(),
          hint: hint.trim() || null,
        },
      };
    }
    if (kind === "WORD_CHOICE") {
      return {
        ...base,
        wordChoicePairs: wordChoicePairs.map((p) => ({
          optionA: p.optionA.trim(),
          optionB: p.optionB.trim(),
          correctOption: p.correctOption,
        })),
      };
    }
    if (kind === "SENTENCE_FILL") {
      return {
        ...base,
        sentenceFillBlanks: sentenceFillBlanks.map((b) => ({
          correctText: b.correctText.trim(),
          hint: b.hint.trim() || null,
        })),
      };
    }
    if (kind === "DRAG_DROP") {
      return {
        ...base,
        dragDropOptions: [
          ...dragDropBlanks.map((b, i) => ({
            text: b.text.trim(),
            blankOrder: i + 1,
          })),
          ...dragDropDistractors
            .filter((d) => d.text.trim())
            .map((d) => ({ text: d.text.trim(), blankOrder: null })),
        ],
      };
    }
    return {
      ...base,
      matchingPairs: pairs.map((p) => ({
        leftContent: p.leftContent.trim(),
        rightContent: p.rightContent.trim(),
      })),
    };
  };

  const validate = () => {
    if (kind === "MULTIPLE_CHOICE") {
      if (options.some((o) => !o.content.trim()))
        return "Vui lòng điền đủ nội dung cho mọi đáp án";
      if (options.filter((o) => o.content.trim()).length < 2)
        return "Cần tối thiểu 2 đáp án";
      if (!options.some((o) => o.isCorrect))
        return "Vui lòng chọn 1 đáp án đúng";
    }
    if (kind === "FILL_BLANK" && !correctText.trim())
      return "Vui lòng nhập đáp án đúng";
    if (kind === "MATCHING") {
      if (pairs.some((p) => !p.leftContent.trim() || !p.rightContent.trim()))
        return "Vui lòng điền đủ mọi cặp ghép";
      if (pairs.length < 2) return "Cần tối thiểu 2 cặp";
    }
    if (kind === "WORD_CHOICE") {
      if (!promptText.trim()) return "Vui lòng nhập đoạn văn";
      if (wordChoicePairs.some((p) => !p.optionA.trim() || !p.optionB.trim()))
        return "Vui lòng điền đủ 2 lựa chọn cho mọi chỗ trống";
      for (let i = 1; i <= wordChoicePairs.length; i++) {
        if (!promptText.includes(`{{${i}}}`))
          return `Đoạn văn thiếu vị trí {{${i}}} cho chỗ trống #${i}`;
      }
    }
    if (kind === "SENTENCE_FILL") {
      if (!promptText.trim()) return "Vui lòng nhập câu/đoạn văn";
      if (sentenceFillBlanks.some((b) => !b.correctText.trim()))
        return "Vui lòng điền đáp án đúng cho mọi chỗ trống";
      for (let i = 1; i <= sentenceFillBlanks.length; i++) {
        if (!promptText.includes(`{{${i}}}`))
          return `Câu văn thiếu vị trí {{${i}}} cho chỗ trống #${i}`;
      }
    }
    if (kind === "DRAG_DROP") {
      if (!promptText.trim()) return "Vui lòng nhập câu/đoạn văn";
      if (dragDropBlanks.some((b) => !b.text.trim()))
        return "Vui lòng điền đáp án đúng cho mọi ô trống";
      for (let i = 1; i <= dragDropBlanks.length; i++) {
        if (!promptText.includes(`{{${i}}}`))
          return `Câu văn thiếu vị trí {{${i}}} cho ô trống #${i}`;
      }
      if (dragDropDistractors.some((d) => !d.text.trim()))
        return "Vui lòng điền nội dung cho mọi thẻ mồi (hoặc xoá thẻ trống)";
    }
    return null;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await updateQuestion.mutateAsync({ id: question.id, payload });
      } else {
        await createQuestion.mutateAsync(payload);
      }
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại");
    }
  };

  // Chỉ hiện dropdown chọn đoạn văn khi KHÔNG bị khoá (luồng sửa câu hỏi cũ) và có đoạn văn để chọn.
  const showPassageSelect = passages.length > 0 && !lockPassageSelect;
  // Ẩn "Loại câu hỏi" khi đang tạo mới câu hỏi cho 1 đoạn văn cụ thể (chỉ có Trắc nghiệm).
  const showKindSelect = !forNewPassageQuestion;
  const lockedPassageIndex =
    lockPassageSelect && initialPassageId
      ? passages.findIndex((p) => p.id === initialPassageId)
      : -1;
  const lockedPassage =
    lockedPassageIndex >= 0 ? passages[lockedPassageIndex] : null;

  const title = isEdit
    ? "Sửa câu hỏi"
    : lockedPassage
      ? `Thêm câu hỏi cho: ${passageTitle(lockedPassage, lockedPassageIndex)}`
      : "Thêm câu hỏi độc lập";

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      width={
        kind === "WORD_CHOICE" ||
        kind === "SENTENCE_FILL" ||
        kind === "DRAG_DROP"
          ? 760
          : 640
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        {(showKindSelect || showPassageSelect) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                showKindSelect && showPassageSelect ? "1fr 1fr" : "1fr",
              gap: 16,
            }}
          >
            {showKindSelect && (
              <div className="field">
                <label>Loại câu hỏi *</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  disabled={isEdit}
                >
                  {Object.entries(KIND_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <div className="hint">
                    Không đổi được loại câu hỏi sau khi tạo — xoá và tạo lại nếu
                    cần
                  </div>
                )}
              </div>
            )}
            {showPassageSelect && (
              <div className="field">
                <label>Thuộc đoạn văn/hội thoại</label>
                <select
                  value={passageId}
                  onChange={(e) => setPassageId(e.target.value)}
                >
                  <option value="">— Câu hỏi độc lập —</option>
                  {passages.map((p, i) => (
                    <option key={p.id} value={p.id}>
                      {passageTitle(p, i)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>
            {kind === "WORD_CHOICE"
              ? "Đoạn văn *"
              : kind === "SENTENCE_FILL"
                ? "Câu/đoạn văn *"
                : kind === "DRAG_DROP"
                  ? "Câu/đoạn văn *"
                  : "Đề bài"}
          </label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder={
              kind === "WORD_CHOICE"
                ? 'Dán/nhập đoạn văn. Bấm "+ Thêm chỗ trống" bên dưới để chèn vị trí {{1}}, {{2}}...'
                : kind === "SENTENCE_FILL"
                  ? 'VD: There is just {{1}} milk left. Bấm "+ Thêm chỗ trống" để chèn {{1}}, {{2}}...'
                  : kind === "DRAG_DROP"
                    ? 'VD: They aren\'t hungry. I {{1}} {{2}}. Bấm "+ Thêm ô trống" để chèn {{1}}, {{2}}...'
                    : "Nội dung câu hỏi..."
            }
            style={
              kind === "WORD_CHOICE" ||
              kind === "SENTENCE_FILL" ||
              kind === "DRAG_DROP"
                ? { minHeight: 100 }
                : undefined
            }
          />
          {kind === "MULTIPLE_CHOICE" && !passageId && (
            <div style={{ marginTop: 8 }}>
              {tagMode === "select" ? (
                <>
                  <select
                    value={tag}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setTagMode("custom");
                        setTag("");
                        return;
                      }
                      setTag(e.target.value);
                    }}
                  >
                    <option value="">— Không gắn tag —</option>
                    {Object.entries(tagGroups).map(([group, tags]) => (
                      <optgroup key={group} label={group}>
                        {tags.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="__custom__">+ Nhóm hoạt động mới...</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setTagScope((s) => (s === "current" ? "all" : "current"))
                    }
                    style={{
                      marginTop: 4,
                      background: "none",
                      border: "none",
                      color: "var(--accent, #2563eb)",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {tagScope === "current"
                      ? "🔍 Xem tag ở Part/nhóm khác"
                      : "↩ Chỉ xem Part hiện tại"}
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder='VD: "[Part 1] Tranh tả người"'
                    style={{ flex: 1 }}
                    maxLength={255}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTagMode("select");
                      setTag("");
                    }}
                  >
                    Chọn từ danh sách
                  </button>
                </div>
              )}
            </div>
          )}
          {kind === "WORD_CHOICE" && (
            <div className="hint">
              Mỗi vị trí chỗ trống đánh dấu bằng <code>{"{{1}}"}</code>,{" "}
              <code>{"{{2}}"}</code>... khớp thứ tự với danh sách lựa chọn bên
              dưới.
            </div>
          )}
          {kind === "SENTENCE_FILL" && (
            <div className="hint">
              Mỗi vị trí chỗ trống đánh dấu bằng <code>{"{{1}}"}</code>,{" "}
              <code>{"{{2}}"}</code>... Học viên sẽ <strong>gõ</strong> đáp án
              vào ô trống.
            </div>
          )}
          {kind === "DRAG_DROP" && (
            <div className="hint">
              Mỗi vị trí ô trống đánh dấu bằng <code>{"{{1}}"}</code>,{" "}
              <code>{"{{2}}"}</code>... Học viên sẽ <strong>kéo thẻ</strong>{" "}
              từ ngăn kéo thả vào ô trống.
            </div>
          )}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div className="field">
            <label>Ảnh (Part 1 — tuỳ chọn)</label>
            <MediaUploader type="IMAGE" value={image} onChange={setImage} />
          </div>
          <div className="field">
            <label>Audio (Part 1/2 — tuỳ chọn)</label>
            <MediaUploader type="AUDIO" value={audio} onChange={setAudio} />
          </div>
        </div>

        {kind === "MULTIPLE_CHOICE" && (
          <div className="field">
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <label style={{ margin: 0 }}>
                Đáp án * (bấm ⭘ để chọn đáp án đúng)
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={addOption}
                >
                  + Thêm đáp án
                </button>
              )}
            </div>
            {options.map((o, idx) => (
              <div
                key={idx}
                className="flex-row"
                style={{ gap: 8, marginBottom: 8 }}
              >
                <button
                  type="button"
                  onClick={() => setCorrectOption(idx)}
                  title="Đánh dấu đây là đáp án đúng"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flex: "0 0 auto",
                    cursor: "pointer",
                    border: "2px solid var(--border)",
                    background: o.isCorrect ? "var(--good)" : "transparent",
                    color: o.isCorrect ? "#fff" : "transparent",
                  }}
                >
                  ✓
                </button>
                <span className="text-dim" style={{ width: 16 }}>
                  {LABELS[idx]}
                </span>
                <input
                  type="text"
                  className="vocab-example-input"
                  style={{ flex: 1 }}
                  value={o.content}
                  onChange={(e) => updateOption(idx, "content", e.target.value)}
                  placeholder={`Nội dung đáp án ${LABELS[idx]}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeOption(idx)}
                    title="Xoá đáp án"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {kind === "FILL_BLANK" && (
          <>
            <div className="field">
              <label>Đáp án đúng *</label>
              <input
                type="text"
                value={correctText}
                onChange={(e) => setCorrectText(e.target.value)}
                placeholder="VD: nation"
              />
            </div>
            <div className="field">
              <label>Gợi ý (tuỳ chọn)</label>
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="VD: danh từ chỉ quốc gia"
              />
            </div>
          </>
        )}

        {kind === "MATCHING" && (
          <div className="field">
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <label style={{ margin: 0 }}>Các cặp ghép *</label>
              <button type="button" className="btn ghost sm" onClick={addPair}>
                + Thêm cặp
              </button>
            </div>
            {pairs.map((p, idx) => (
              <div
                key={idx}
                className="flex-row"
                style={{ gap: 8, marginBottom: 8 }}
              >
                <input
                  type="text"
                  className="vocab-example-input"
                  style={{ flex: 1 }}
                  value={p.leftContent}
                  onChange={(e) =>
                    updatePair(idx, "leftContent", e.target.value)
                  }
                  placeholder="Vế trái"
                />
                <span className="text-dim">↔</span>
                <input
                  type="text"
                  className="vocab-example-input"
                  style={{ flex: 1 }}
                  value={p.rightContent}
                  onChange={(e) =>
                    updatePair(idx, "rightContent", e.target.value)
                  }
                  placeholder="Vế phải"
                />
                {pairs.length > 2 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removePair(idx)}
                    title="Xoá cặp"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {kind === "WORD_CHOICE" && (
          <div className="field">
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <label style={{ margin: 0 }}>
                Các chỗ trống * (bấm ⭘ để chọn lựa chọn đúng)
              </label>
              <button
                type="button"
                className="btn ghost sm"
                onClick={addWordChoicePair}
              >
                + Thêm chỗ trống
              </button>
            </div>
            {wordChoicePairs.map((p, idx) => (
              <div
                key={idx}
                className="flex-row"
                style={{ gap: 8, marginBottom: 8, alignItems: "center" }}
              >
                <span
                  className="text-dim"
                  style={{ width: 28 }}
                >{`{{${idx + 1}}}`}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateWordChoicePair(idx, "correctOption", "A")
                  }
                  title="Đánh dấu Lựa chọn A đúng"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    flex: "0 0 auto",
                    cursor: "pointer",
                    border: "2px solid var(--border)",
                    background:
                      p.correctOption === "A" ? "var(--good)" : "transparent",
                    color: p.correctOption === "A" ? "#fff" : "transparent",
                  }}
                >
                  ✓
                </button>
                <input
                  type="text"
                  className="vocab-example-input"
                  style={{ flex: 1 }}
                  value={p.optionA}
                  onChange={(e) =>
                    updateWordChoicePair(idx, "optionA", e.target.value)
                  }
                  placeholder="Lựa chọn A"
                />
                <span className="text-dim">/</span>
                <button
                  type="button"
                  onClick={() =>
                    updateWordChoicePair(idx, "correctOption", "B")
                  }
                  title="Đánh dấu Lựa chọn B đúng"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    flex: "0 0 auto",
                    cursor: "pointer",
                    border: "2px solid var(--border)",
                    background:
                      p.correctOption === "B" ? "var(--good)" : "transparent",
                    color: p.correctOption === "B" ? "#fff" : "transparent",
                  }}
                >
                  ✓
                </button>
                <input
                  type="text"
                  className="vocab-example-input"
                  style={{ flex: 1 }}
                  value={p.optionB}
                  onChange={(e) =>
                    updateWordChoicePair(idx, "optionB", e.target.value)
                  }
                  placeholder="Lựa chọn B"
                />
                {wordChoicePairs.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeWordChoicePair(idx)}
                    title="Xoá chỗ trống"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {kind === "SENTENCE_FILL" && (
          <div className="field">
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <label style={{ margin: 0 }}>
                Các chỗ trống * — học viên gõ đáp án
              </label>
              <button
                type="button"
                className="btn ghost sm"
                onClick={addSentenceFillBlank}
              >
                + Thêm chỗ trống
              </button>
            </div>
            {sentenceFillBlanks.map((b, idx) => (
              <div
                key={idx}
                className="flex-row"
                style={{ gap: 8, marginBottom: 8, alignItems: "center" }}
              >
                <span
                  className="text-dim"
                  style={{ width: 28, flexShrink: 0 }}
                >{`{{${idx + 1}}}`}</span>
                <input
                  type="text"
                  className="vocab-example-input"
                  style={{ flex: 2 }}
                  value={b.correctText}
                  onChange={(e) =>
                    updateSentenceFillBlank(idx, "correctText", e.target.value)
                  }
                  placeholder="Đáp án đúng *"
                />
                <input
                  type="text"
                  className="vocab-example-input"
                  style={{ flex: 1 }}
                  value={b.hint}
                  onChange={(e) =>
                    updateSentenceFillBlank(idx, "hint", e.target.value)
                  }
                  placeholder="Gợi ý (tuỳ chọn)"
                />
                {sentenceFillBlanks.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeSentenceFillBlank(idx)}
                    title="Xoá chỗ trống"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
            <div className="hint" style={{ marginTop: 4 }}>
              Gợi ý sẽ hiển thị mờ trong ô trống (placeholder) để học viên tham
              khảo.
            </div>
          </div>
        )}

        {kind === "DRAG_DROP" && (
          <>
            <div className="field">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <label style={{ margin: 0 }}>
                  Thẻ đáp án cho từng ô trống * — học viên kéo thẻ vào ô
                </label>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={addDragDropBlank}
                >
                  + Thêm ô trống
                </button>
              </div>
              {dragDropBlanks.map((b, idx) => (
                <div
                  key={idx}
                  className="flex-row"
                  style={{ gap: 8, marginBottom: 8, alignItems: "center" }}
                >
                  <span
                    className="text-dim"
                    style={{ width: 28, flexShrink: 0 }}
                  >{`{{${idx + 1}}}`}</span>
                  <input
                    type="text"
                    className="vocab-example-input"
                    style={{ flex: 1 }}
                    value={b.text}
                    onChange={(e) =>
                      updateDragDropBlank(idx, e.target.value)
                    }
                    placeholder={`Thẻ đáp án đúng cho ô {{${idx + 1}}} *`}
                  />
                  {dragDropBlanks.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeDragDropBlank(idx)}
                      title="Xoá ô trống"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <div className="hint" style={{ marginTop: 4 }}>
                Mỗi ô trống tương ứng đúng 1 thẻ đáp án — thứ tự thẻ ở đây
                khớp với số thứ tự <code>{"{{n}}"}</code> đã chèn vào câu văn.
              </div>
            </div>

            <div className="field">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <label style={{ margin: 0 }}>
                  Thẻ mồi (tuỳ chọn) — không khớp ô trống nào, chỉ để gây
                  nhiễu
                </label>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={addDragDropDistractor}
                >
                  + Thêm thẻ mồi
                </button>
              </div>
              {dragDropDistractors.length === 0 && (
                <div className="text-dim text-sm">— chưa có thẻ mồi —</div>
              )}
              {dragDropDistractors.map((d, idx) => (
                <div
                  key={idx}
                  className="flex-row"
                  style={{ gap: 8, marginBottom: 8, alignItems: "center" }}
                >
                  <input
                    type="text"
                    className="vocab-example-input"
                    style={{ flex: 1 }}
                    value={d.text}
                    onChange={(e) =>
                      updateDragDropDistractor(idx, e.target.value)
                    }
                    placeholder="Nội dung thẻ mồi"
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeDragDropDistractor(idx)}
                    title="Xoá thẻ mồi"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="field">
          <label>Giải thích đáp án (tuỳ chọn)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Giải thích tại sao đáp án là đúng (nếu có). Học viên sẽ thấy giải thích này sau khi kiểm tra đáp án."
            rows={3}
          />
          <div className="hint">
            Nếu bạn nhập giải thích, học viên sẽ thấy nút "Giải thích" sau khi
            kiểm tra đáp án để xem lý do tại sao đáp án là đúng.
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            Huỷ
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo câu hỏi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
