import { useState } from "react";
import AudioPlayer from "@shared/components/AudioPlayer.jsx";
import ConfirmDeleteModal from "@teacher/components/ConfirmDeleteModal.jsx";
import PassageModal from "@teacher/components/modals/PassageModal.jsx";
import QuestionModal from "@teacher/components/modals/QuestionModal.jsx";
import {
  useTeacherPassages,
  useDeletePassage,
} from "@teacher/hooks/useTeacherPassages.js";
import {
  useTeacherQuestions,
  useDeleteQuestion,
} from "@teacher/hooks/useTeacherQuestions.js";
import { passageTitle } from "@teacher/utils/passageTitle.js";

const KIND_LABEL = {
  MULTIPLE_CHOICE: "Trắc nghiệm",
  FILL_BLANK: "Điền từ",
  MATCHING: "Ghép cặp",
  WORD_CHOICE: "Chọn từ trong đoạn văn",
  SENTENCE_FILL: "Điền từ vào chỗ trống",
  DRAG_DROP: "Kéo thả",
};

const passageAnchorId = (passageId) => `passage-card-${passageId}`;
const questionAnchorId = (questionId) => `question-card-${questionId}`;

// Cuộn tới 1 card (đoạn văn hoặc câu hỏi) rồi lóe sáng nhẹ 1.4s để giáo viên dễ nhận ra vị trí
// vừa nhảy tới — dùng chung cho cả 2 chiều điều hướng (đoạn văn -> câu hỏi và câu hỏi -> đoạn văn).
function jumpTo(id, setHighlighted) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setHighlighted(id);
  window.clearTimeout(jumpTo._t);
  jumpTo._t = window.setTimeout(() => setHighlighted(null), 1400);
}

/**
 * PracticeTestEditor — dùng cho Part 1,2,5 và Ngữ pháp (câu hỏi ĐỘC LẬP, không cần Đoạn văn)
 * cũng như Part 3,4,6,7 (nhiều câu hỏi chung 1 Đoạn văn/hội thoại).
 *
 * Hai luồng tạo câu hỏi tách biệt hoàn toàn để giáo viên không cần hiểu khái niệm "Thuộc đoạn
 * văn/hội thoại":
 * - Mỗi card Đoạn văn có nav-chip cho từng câu hỏi thuộc đoạn văn đó — bấm vào để cuộn tới đúng
 *   card câu hỏi bên dưới (jumpTo). Ngược lại, mỗi câu hỏi thuộc 1 đoạn văn có nút "↑ Đoạn văn
 *   gốc" để cuộn ngược lại card đoạn văn tương ứng.
 * - Mỗi card Đoạn văn có nút "+ Câu hỏi cho đoạn văn này" riêng — mở QuestionModal đã gắn sẵn
 *   đoạn văn đó (initialPassageId + lockPassageSelect, xem QuestionModal.jsx), giáo viên không
 *   thấy/không cần chọn gì thêm.
 * - Nút "+ Thêm câu hỏi" ở mục Câu hỏi luôn tạo câu hỏi ĐỘC LẬP (initialPassageId=null +
 *   lockPassageSelect), ẩn hẳn dropdown chọn đoạn văn.
 * - Khi sửa 1 câu hỏi đã có (✏️) thì vẫn mở modal với dropdown như cũ để giáo viên đổi/gỡ liên
 *   kết đoạn văn nếu cần.
 */
export default function PracticeTestEditor({ item }) {
  const { data: passages, isLoading: loadingPassages } = useTeacherPassages(
    item.id,
  );
  const { data: questions, isLoading: loadingQuestions } = useTeacherQuestions(
    item.id,
  );
  const deletePassage = useDeletePassage(item.id);
  const deleteQuestion = useDeleteQuestion(item.id);

  const [passageModal, setPassageModal] = useState({
    open: false,
    passage: null,
  });
  // questionModal.forPassageId: đoạn văn được gắn sẵn khi mở modal TẠO MỚI từ card đoạn văn
  // (null + question=null = tạo câu hỏi độc lập từ mục Câu hỏi bên dưới)
  const [questionModal, setQuestionModal] = useState({
    open: false,
    question: null,
    forPassageId: null,
  });
  const [deletingPassage, setDeletingPassage] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [highlighted, setHighlighted] = useState(null);

  const passageIndex = (id) => (passages || []).findIndex((p) => p.id === id);
  const questionsForPassage = (passageId) =>
    (questions || []).filter((q) => q.passageId === passageId);
  const questionCountForPassage = (passageId) =>
    questionsForPassage(passageId).length;

  return (
    <div>
      <section>
        <div className="flex-between">
          <h4 style={{ margin: 0 }}>Bộ câu hỏi theo đoạn văn</h4>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setPassageModal({ open: true, passage: null })}
          >
            + Thêm đoạn văn
          </button>
        </div>
        <p className="text-dim text-sm" style={{ marginTop: 4 }}>
          Chỉ cần cho Part 3/4/6/7 (nhiều câu hỏi dùng chung 1 đoạn). Bỏ qua nếu
          bạn đang soạn Part 1, 2, 5 hoặc Ngữ pháp.
        </p>

        {!loadingPassages && (passages || []).length === 0 && (
          <p className="text-dim text-sm">Chưa có đoạn văn nào.</p>
        )}

        <div className="stack-list mt-16">
          {(passages || []).map((p, i) => (
            <div
              key={p.id}
              id={passageAnchorId(p.id)}
              className={`card editable-block${highlighted === passageAnchorId(p.id) ? " jump-highlight" : ""}`}
            >
              <div className="editable-actions">
                <button
                  type="button"
                  onClick={() => setPassageModal({ open: true, passage: p })}
                  title="Sửa"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setDeletingPassage(p)}
                  title="Xoá"
                >
                  🗑️
                </button>
              </div>
              <strong>{passageTitle(p, i)}</strong>
              {p.audioUrl && (
                <div className="mt-8">
                  <AudioPlayer src={p.audioUrl} compact />
                </div>
              )}
              {p.transcriptHtml && (
                <div
                  className="text-dim text-sm mt-8"
                  style={{ maxHeight: 80, overflow: "hidden" }}
                  dangerouslySetInnerHTML={{ __html: p.transcriptHtml }}
                />
              )}
              {p.passageHtml && (
                <div
                  className="text-dim text-sm mt-8"
                  style={{ maxHeight: 80, overflow: "hidden" }}
                  dangerouslySetInnerHTML={{ __html: p.passageHtml }}
                />
              )}

              {questionsForPassage(p.id).length > 0 && (
                <div
                  className="flex-row mt-12"
                  style={{ flexWrap: "wrap", gap: 6 }}
                >
                  {questionsForPassage(p.id).map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className="badge neutral"
                      style={{ cursor: "pointer", border: "none" }}
                      title="Đi tới câu hỏi này"
                      onClick={() =>
                        jumpTo(questionAnchorId(q.id), setHighlighted)
                      }
                    >
                      Câu{" "}
                      {(questions || []).findIndex((x) => x.id === q.id) + 1} ↓
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-between mt-16">
                <span className="text-dim text-sm">
                  {questionCountForPassage(p.id) > 0
                    ? `${questionCountForPassage(p.id)} câu hỏi`
                    : "Chưa có câu hỏi nào"}
                </span>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() =>
                    setQuestionModal({
                      open: true,
                      question: null,
                      forPassageId: p.id,
                    })
                  }
                >
                  + Câu hỏi cho đoạn văn này
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-24">
        <div className="flex-between">
          <h4 style={{ margin: 0 }}>Câu hỏi độc lập</h4>
          <button
            type="button"
            className="btn"
            onClick={() =>
              setQuestionModal({
                open: true,
                question: null,
                forPassageId: null,
              })
            }
          >
            + Thêm câu hỏi
          </button>
        </div>

        {loadingQuestions && <p className="text-dim">Đang tải...</p>}
        {!loadingQuestions && (questions || []).length === 0 && (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Chưa có câu hỏi nào.</p>
          </div>
        )}

        <div className="stack-list mt-16">
          {(questions || []).map((q, i) => (
            <div
              key={q.id}
              id={questionAnchorId(q.id)}
              className={`card editable-block${highlighted === questionAnchorId(q.id) ? " jump-highlight" : ""}`}
            >
              <div className="editable-actions">
                <button
                  type="button"
                  onClick={() =>
                    setQuestionModal({
                      open: true,
                      question: q,
                      forPassageId: null,
                    })
                  }
                  title="Sửa"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => setDeletingQuestion(q)}
                  title="Xoá"
                >
                  🗑️
                </button>
              </div>

              <div className="flex-row" style={{ gap: 8, marginBottom: 6 }}>
                <span className="badge neutral">Câu {i + 1}</span>
                <span className="badge neutral">
                  {KIND_LABEL[q.questionKind] || q.questionKind}
                </span>
                {q.passageId && (
                  <button
                    type="button"
                    className="badge neutral"
                    style={{ cursor: "pointer", border: "none" }}
                    title="Đi tới đoạn văn gốc"
                    onClick={() =>
                      jumpTo(passageAnchorId(q.passageId), setHighlighted)
                    }
                  >
                    ↑{" "}
                    {passageTitle(
                      (passages || [])[passageIndex(q.passageId)],
                      passageIndex(q.passageId),
                    )}
                  </button>
                )}
                {q.tag && (
                  <span
                    className="badge"
                    style={{
                      background: "var(--accent-soft, #ede9fe)",
                      color: "var(--accent, #7c3aed)",
                    }}
                  >
                    🏷️ {q.tag}
                  </span>
                )}
              </div>

              {q.promptText && (
                <p style={{ margin: "4px 0" }}>{q.promptText}</p>
              )}
              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt=""
                  style={{
                    maxWidth: 320,
                    maxHeight: 220,
                    display: "block",
                    borderRadius: 8,
                    margin: "6px 0",
                  }}
                />
              )}
              {q.audioUrl && <AudioPlayer src={q.audioUrl} compact />}

              {q.questionKind === "MULTIPLE_CHOICE" && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {(q.options || []).map((o) => (
                    <li
                      key={o.id}
                      style={{ color: o.isCorrect ? "var(--good)" : undefined }}
                    >
                      {o.label}. {o.content} {o.isCorrect && "✓"}
                    </li>
                  ))}
                </ul>
              )}
              {q.questionKind === "FILL_BLANK" && (
                <p className="text-sm mt-8">
                  <strong>Đáp án đúng:</strong> {q.correctText}{" "}
                  {q.hint && (
                    <span className="text-dim">— gợi ý: {q.hint}</span>
                  )}
                </p>
              )}
              {q.questionKind === "MATCHING" && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {(q.matchingPairs || []).map((p) => (
                    <li key={p.id}>
                      {p.leftContent} ↔ {p.rightContent}
                    </li>
                  ))}
                </ul>
              )}
              {q.questionKind === "DRAG_DROP" && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {(q.dragDropOptions || []).map((o) => (
                    <li
                      key={o.id}
                      style={{
                        color: o.blankOrder ? "var(--good)" : undefined,
                      }}
                    >
                      {o.blankOrder ? `{{${o.blankOrder}}} ` : "🃏 "}
                      {o.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <PassageModal
        open={passageModal.open}
        contentItemId={item.id}
        passage={passageModal.passage}
        onClose={() => setPassageModal({ open: false, passage: null })}
      />

      <QuestionModal
        open={questionModal.open}
        contentItemId={item.id}
        passages={passages || []}
        question={questionModal.question}
        initialPassageId={questionModal.forPassageId}
        lockPassageSelect={!questionModal.question}
        onClose={() =>
          setQuestionModal({ open: false, question: null, forPassageId: null })
        }
      />

      <ConfirmDeleteModal
        open={!!deletingPassage}
        title="Xoá đoạn văn"
        description="Chỉ xoá được khi không còn câu hỏi nào gắn với đoạn văn này."
        onClose={() => setDeletingPassage(null)}
        onConfirm={() => deletePassage.mutateAsync(deletingPassage.id)}
      />

      <ConfirmDeleteModal
        open={!!deletingQuestion}
        title="Xoá câu hỏi"
        onClose={() => setDeletingQuestion(null)}
        onConfirm={() => deleteQuestion.mutateAsync(deletingQuestion.id)}
      />
    </div>
  );
}
