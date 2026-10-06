import { useEffect, useMemo, useRef, useState } from "react";
import { useAttempt } from "@student/hooks/useAttempt.js";
import * as passagesApi from "@shared/api/passages.js";
import * as questionsApi from "@shared/api/questions.js";
import QuestionNavigator from "@shared/components/QuestionNavigator.jsx";
import MultipleChoiceQuestion from "@shared/components/MultipleChoiceQuestion.jsx";
import FillBlankQuestion from "@shared/components/FillBlankQuestion.jsx";
import MatchingPairsGame from "@shared/components/MatchingPairsGame.jsx";
import WordChoiceText from "@shared/components/WordChoiceText.jsx";
import SentenceFillQuestion from "@shared/components/SentenceFillQuestion.jsx";
import DragDropQuestion from "@shared/components/DragDropQuestion.jsx";
import AudioPlayer from "@shared/components/AudioPlayer.jsx";
import TranscriptDropdown from "@shared/components/TranscriptDropdown.jsx";
import AttemptTimer from "@student/components/AttemptTimer.jsx";
import TestResultCard from "@student/components/TestResultCard.jsx";

/**
 * PracticeTestRunner — FR-LES-05: làm bài Part 1–7.
 *
 * - Các câu hỏi có CÙNG passageId (Part 3/4: hội thoại/bài nói dùng chung audio; Part 6/7:
 *   đoạn văn dùng chung nhiều câu điền/đọc hiểu) được GOM thành 1 "trang" — 1 card, 2 cột tự
 *   cuộn riêng (đề bên trái, toàn bộ câu hỏi thuộc đoạn văn đó bên phải).
 * - Nút "🔀 Xáo trộn câu hỏi": đảo NGẪU NHIÊN thứ tự các TRANG (không phá vỡ nhóm câu chung
 *   1 đoạn văn — cả nhóm luôn đi cùng nhau), rồi đánh số lại Câu 1..N theo thứ tự mới. Học
 *   viên có thể xáo lại nhiều lần; đáp án đã chọn không bị mất vì được lưu theo questionId,
 *   không phụ thuộc vị trí hiển thị.
 * - Công tắc "Tự động chuyển câu": khi bật, áp dụng cho 1 câu ĐỘC LẬP (không thuộc nhóm). Luồng:
 *     1) Chọn đáp án rồi bấm "Kiểm tra đáp án".
 *     2) Nếu ĐÚNG → tự nhảy sang câu kế tiếp sau 2 giây.
 *     3) Nếu SAI → tô đỏ đáp án đã chọn + tô xanh đáp án đúng, KHÔNG tự chuyển câu. Học viên tự
 *        bấm nút "Câu sau" trên thanh điều hướng để qua câu tiếp theo.
 */
export default function PracticeTestRunner({ contentItem }) {
  const { attempt, result, start, submit, reset } = useAttempt();
  const [passages, setPassages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> answer value (shape phụ thuộc questionKind)
  const [reviewSet, setReviewSet] = useState(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  const [pageOrder, setPageOrder] = useState(null); // null = thứ tự gốc (giáo viên sắp xếp); mảng = đã xáo trộn
  const [autoAdvance, setAutoAdvance] = useState(true);
  const autoAdvanceTimer = useRef(null);

  useEffect(() => {
    start(contentItem.id);
    passagesApi
      .listPassages(contentItem.id)
      .then(setPassages)
      .catch(() => setPassages([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentItem.id]);

  useEffect(() => () => clearTimeout(autoAdvanceTimer.current), []);

  const questions = attempt?.questions || [];
  const passageById = useMemo(
    () => Object.fromEntries(passages.map((p) => [p.id, p])),
    [passages],
  );
  const detailByQuestionId = useMemo(
    () =>
      Object.fromEntries((result?.details || []).map((d) => [d.questionId, d])),
    [result],
  );

  // Gom các câu hỏi LIÊN TIẾP (theo thứ tự GỐC giáo viên sắp xếp) có cùng passageId (không
  // null) thành 1 "trang" (page). Luôn gom theo thứ tự gốc TRƯỚC khi xáo trộn, để không bao
  // giờ tách rời các câu thuộc cùng 1 đoạn văn/audio ra 2 nhóm khác nhau.
  const basePages = useMemo(() => {
    const result = [];
    for (const q of questions) {
      const last = result[result.length - 1];
      if (q.passageId && last && last.passageId === q.passageId) {
        last.questions.push(q);
      } else {
        result.push({ passageId: q.passageId, questions: [q] });
      }
    }
    return result;
  }, [questions]);

  // Thứ tự HIỂN THỊ = basePages sắp theo pageOrder (nếu đã xáo trộn) hoặc giữ nguyên gốc.
  const pages = useMemo(() => {
    if (!pageOrder) return basePages;
    return pageOrder.map((i) => basePages[i]).filter(Boolean);
  }, [basePages, pageOrder]);

  // Map: chỉ số câu hỏi (flat, dùng cho QuestionNavigator) -> chỉ số trang chứa câu đó
  const pageIndexByQuestionIndex = useMemo(() => {
    const map = [];
    pages.forEach((page, pageIdx) => {
      page.questions.forEach(() => map.push(pageIdx));
    });
    return map;
  }, [pages]);

  const currentPage = pages[currentPageIndex];
  const isGrouped = (currentPage?.questions.length || 0) > 1;

  const answeredSet = useMemo(() => {
    const set = new Set();
    let idx = 0;
    for (const page of pages) {
      for (const q of page.questions) {
        if (isAnswered(answers[q.id], q.questionKind)) set.add(idx);
        idx++;
      }
    }
    return set;
  }, [answers, pages]);

  // Chỉ số câu hỏi đầu tiên của trang hiện tại (dùng để tô "current" trên lưới điều hướng)
  const currentQuestionIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < currentPageIndex; i++) idx += pages[i].questions.length;
    return idx;
  }, [pages, currentPageIndex]);

  const setAnswer = (questionId, value) =>
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

  // Đáp án đúng bị ẩn với học viên (options[].isCorrect = null) cho tới khi nộp cả bài,
  // nên nút "Kiểm tra đáp án" của từng câu phải gọi API chấm riêng câu đó (không lộ đáp án
  // các câu khác), rồi trả về correctOptionId/correctText để component tự tô màu xanh/đỏ.
  const checkOne = (questionId, payload) => () =>
    questionsApi.checkAnswer(questionId, payload);

  // checkOneWordChoice: dùng riêng cho WORD_CHOICE — được gọi tự động mỗi lần học viên chọn
  // một từ, nhận `currentSelections` tại thời điểm click (không phụ thuộc state bất đồng bộ).
  const checkOneWordChoice = (questionId) => (currentSelections) =>
    questionsApi.checkAnswer(questionId, {
      wordChoiceSelections: Object.entries(currentSelections || {}).map(
        ([pairId, selectedOption]) => ({
          pairId,
          selectedOption,
        }),
      ),
    });

  // checkOneSentenceFill: gọi API check SENTENCE_FILL khi học viên nhấn ✓ cho 1 ô,
  // nhận currentValue là { [blankId]: text } tại thời điểm click.
  const checkOneSentenceFill = (questionId) => (currentValue) =>
    questionsApi.checkAnswer(questionId, {
      sentenceFillAnswers: Object.entries(currentValue || {}).map(
        ([blankId, submittedText]) => ({
          blankId,
          submittedText,
        }),
      ),
    });

  // checkOneDragDrop: gọi API check DRAG_DROP khi học viên nhấn ✓ (sau khi đã kéo thả hết ô
  // trống), nhận currentPlacements là { [blankOrder]: cardId } tại thời điểm click.
  const checkOneDragDrop = (questionId) => (currentPlacements) =>
    questionsApi.checkAnswer(questionId, {
      dragDropSelections: Object.entries(currentPlacements || {}).map(
        ([blankOrder, cardId]) => ({
          blankOrder: Number(blankOrder),
          cardId,
        }),
      ),
    });

  const goToPage = (idx) => {
    if (idx < 0 || idx >= pages.length) return;
    clearTimeout(autoAdvanceTimer.current);
    setCurrentPageIndex(idx);
  };

  // Xáo trộn NGẪU NHIÊN thứ tự các trang (Fisher–Yates), giữ nguyên nhóm câu chung 1 đoạn
  // văn (mỗi "trang" luôn di chuyển nguyên khối). Có thể bấm lại nhiều lần để xáo lại.
  const handleShuffle = () => {
    const arr = basePages.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setPageOrder(arr);
    setCurrentPageIndex(0);
    setReviewSet(new Set());
  };

  const toggleReview = () => {
    setReviewSet((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestionIndex)) next.delete(currentQuestionIndex);
      else next.add(currentQuestionIndex);
      return next;
    });
  };

  // Tự động chuyển câu: chỉ áp dụng cho trang có ĐÚNG 1 câu (không áp dụng cho trang gộp
  // nhiều câu của Part 3/4/6/7, vì học viên còn cần trả lời các câu khác trong cùng trang).
  // Được gọi từ component câu hỏi (MultipleChoiceQuestion/FillBlankQuestion) khi bấm "Kiểm tra
  // đáp án". CHỈ đặt lịch chuyển câu khi đáp án ĐÚNG (sau 2s); nếu SAI thì không hẹn giờ —
  // component câu hỏi tự tô đỏ/xanh, học viên tự bấm "Câu sau" để qua câu tiếp theo.
  const handleAnswerChecked = (isCorrect) => {
    clearTimeout(autoAdvanceTimer.current);
    if (
      isCorrect &&
      autoAdvance &&
      !isGrouped &&
      currentPageIndex < pages.length - 1
    ) {
      autoAdvanceTimer.current = setTimeout(
        () => setCurrentPageIndex((i) => i + 1),
        2000,
      );
    }
  };

  const buildSubmission = () =>
    questions.map((q) => {
      const val = answers[q.id];
      if (q.questionKind === "MULTIPLE_CHOICE")
        return { questionId: q.id, selectedOptionId: val || null };
      if (q.questionKind === "FILL_BLANK")
        return { questionId: q.id, submittedText: val || "" };
      if (q.questionKind === "MATCHING")
        return { questionId: q.id, matchedPairs: val || [] };
      if (q.questionKind === "WORD_CHOICE") {
        const selections = Object.entries(val || {}).map(
          ([pairId, selectedOption]) => ({ pairId, selectedOption }),
        );
        return { questionId: q.id, wordChoiceSelections: selections };
      }
      if (q.questionKind === "SENTENCE_FILL") {
        const answers = Object.entries(val || {}).map(
          ([blankId, submittedText]) => ({ blankId, submittedText }),
        );
        return { questionId: q.id, sentenceFillAnswers: answers };
      }
      if (q.questionKind === "DRAG_DROP") {
        const selections = Object.entries(val || {}).map(
          ([blankOrder, cardId]) => ({ blankOrder: Number(blankOrder), cardId }),
        );
        return { questionId: q.id, dragDropSelections: selections };
      }
      return { questionId: q.id };
    });

  const handleSubmit = async () => {
    clearTimeout(autoAdvanceTimer.current);
    await submit(null, buildSubmission());
    setReviewMode(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setReviewSet(new Set());
    setCurrentPageIndex(0);
    setPageOrder(null);
    setReviewMode(false);
    reset();
    start(contentItem.id);
  };

  if (!attempt) return <p className="text-dim">Đang tải đề bài...</p>;

  if (result && reviewMode) {
    return (
      <div>
        <TestResultCard
          result={result}
          onRetry={handleRetry}
          onReview={() => setReviewMode(false)}
        />
      </div>
    );
  }

  if (!currentPage)
    return <p className="text-dim">Hoạt động này chưa có câu hỏi.</p>;

  const passage = currentPage.passageId
    ? passageById[currentPage.passageId]
    : null;
  // showAnswer chỉ true sau khi đã nộp bài (xem lại). Trong lúc làm bài, việc hiện đáp án
  // do từng câu tự quản lý qua nút "Kiểm tra đáp án" riêng (allowCheck), không có công tắc chung.
  const showAnswer = !!result;
  const hasTimer = attempt.timeLimitMinutes && attempt.timeLimitMinutes > 0;

  return (
    <div>
      <div className="flex-between mt-16">
        <h2 style={{ margin: 0 }}>{contentItem.title}</h2>
        <div className="flex-row">
          {/* Chỉ hiện timer khi có timeLimitMinutes (luyện đề) */}
          {!result && hasTimer && (
            <AttemptTimer
              timeLimitMinutes={attempt.timeLimitMinutes}
              onTimeUp={handleSubmit}
            />
          )}
          {result && (
            <button
              className="btn secondary sm"
              onClick={() => setReviewMode(true)}
            >
              Xem điểm tổng
            </button>
          )}
        </div>
      </div>

      <div className="card mt-16">
        <p className="text-dim text-sm">
          {isGrouped
            ? `Câu ${currentQuestionIndex + 1}–${currentQuestionIndex + currentPage.questions.length}/${questions.length}`
            : `Câu ${currentQuestionIndex + 1}/${questions.length}`}
        </p>

        {/* KHÔNG gộp (Part 1, 2, 5; ngữ pháp; chính tả; từ vựng): 1 câu / trang như cũ */}
        {!isGrouped && (
          <SingleQuestionBlock
            question={currentPage.questions[0]}
            passage={passage}
            answers={answers}
            setAnswer={setAnswer}
            checkOne={checkOne}
            checkOneWordChoice={checkOneWordChoice}
            checkOneSentenceFill={checkOneSentenceFill}
            checkOneDragDrop={checkOneDragDrop}
            showAnswer={showAnswer}
            result={result}
            detailByQuestionId={detailByQuestionId}
            onAnswerChecked={handleAnswerChecked}
          />
        )}

        {/* GỘP (Part 3/4: nhiều câu chung 1 audio; Part 6/7: nhiều câu chung 1 đoạn văn):
            1 card, 2 cột tự cuộn riêng — đề bên trái, danh sách câu hỏi bên phải. */}
        {isGrouped && (
          <div className="passage-split-card">
            <div className="passage-pane">
              {passage?.audioUrl && <AudioPlayer src={passage.audioUrl} />}
              {passage?.imageUrl && (
                <img
                  src={passage.imageUrl}
                  alt="Đoạn văn"
                  style={{ maxWidth: "100%", marginTop: 8 }}
                />
              )}
              {passage?.passageHtml && (
                <div
                  className="rich-text-content mt-8"
                  dangerouslySetInnerHTML={{ __html: passage.passageHtml }}
                />
              )}
              <TranscriptDropdown html={passage?.transcriptHtml} />
            </div>
            <div className="passage-questions-pane">
              {currentPage.questions.map((q, i) => (
                <div key={q.id} className="passage-question-block">
                  <p className="question-prompt">
                    <strong>Q{currentQuestionIndex + i + 1}:</strong>{" "}
                    {q.promptText}
                  </p>
                  {q.questionKind === "MULTIPLE_CHOICE" && (
                    <MultipleChoiceQuestion
                      imageUrl={q.imageUrl}
                      audioUrl={q.audioUrl}
                      options={q.options}
                      selectedOptionId={answers[q.id]}
                      onSelect={(id) => setAnswer(q.id, id)}
                      readOnly={showAnswer}
                      showAnswer={showAnswer && !!detailByQuestionId[q.id]}
                      allowCheck={!result}
                      onCheck={checkOne(q.id, {
                        selectedOptionId: answers[q.id] || null,
                      })}
                      correctOptionId={
                        detailByQuestionId[q.id]?.correctOptionId
                      }
                      explanation={
                        showAnswer
                          ? detailByQuestionId[q.id]?.explanation
                          : null
                      }
                    />
                  )}
                  {q.questionKind === "FILL_BLANK" && (
                    <FillBlankQuestion
                      hint={q.hint}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                      readOnly={showAnswer}
                      showAnswer={showAnswer}
                      correctText={detailByQuestionId[q.id]?.correctText}
                      allowCheck={!result}
                      onCheck={checkOne(q.id, {
                        submittedText: answers[q.id] || "",
                      })}
                      explanation={
                        showAnswer
                          ? detailByQuestionId[q.id]?.explanation
                          : null
                      }
                    />
                  )}
                  {q.questionKind === "WORD_CHOICE" && (
                    <WordChoiceText
                      promptText={q.promptText}
                      pairs={q.wordChoicePairs || []}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                      readOnly={showAnswer}
                      showAnswer={showAnswer}
                      correctPairs={detailByQuestionId[q.id]?.wordChoicePairs}
                      onCheck={!result ? checkOneWordChoice(q.id) : undefined}
                    />
                  )}
                  {q.questionKind === "SENTENCE_FILL" && (
                    <SentenceFillQuestion
                      promptText={q.promptText}
                      blanks={q.sentenceFillBlanks || []}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                      readOnly={showAnswer}
                      showAnswer={showAnswer}
                      onCheck={!result ? checkOneSentenceFill(q.id) : undefined}
                    />
                  )}
                  {q.questionKind === "DRAG_DROP" && (
                    <DragDropQuestion
                      promptText={q.promptText}
                      options={q.dragDropOptions || []}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                      readOnly={showAnswer}
                      showAnswer={showAnswer}
                      correctOptions={detailByQuestionId[q.id]?.dragDropOptions}
                      onCheck={!result ? checkOneDragDrop(q.id) : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!showAnswer && !isGrouped && (
          <div className="mt-16">
            <button className="btn ghost sm" onClick={toggleReview}>
              {reviewSet.has(currentQuestionIndex)
                ? "Bỏ đánh dấu"
                : "🚩 Đánh dấu review"}
            </button>
          </div>
        )}
      </div>

      <div className="card mt-16">
        <QuestionNavigator
          total={questions.length}
          currentIndex={currentQuestionIndex}
          currentSpan={currentPage.questions.length}
          answeredSet={answeredSet}
          reviewSet={reviewSet}
          onJump={(qIdx) => goToPage(pageIndexByQuestionIndex[qIdx] ?? 0)}
          onPrev={() => goToPage(currentPageIndex - 1)}
          onNext={() => goToPage(currentPageIndex + 1)}
          canGoPrev={currentPageIndex > 0}
          canGoNext={currentPageIndex < pages.length - 1}
          autoAdvance={autoAdvance}
          onToggleAutoAdvance={() => setAutoAdvance((v) => !v)}
          onShuffle={!showAnswer ? handleShuffle : undefined}
        />
      </div>

      {!showAnswer && (
        <button
          className="btn mt-16"
          style={{ width: "100%" }}
          onClick={handleSubmit}
        >
          ✅ Nộp bài
        </button>
      )}
    </div>
  );
}

/** Trang KHÔNG gộp: giữ nguyên hành vi cũ (Part 1, 2, 5; ngữ pháp; chính tả; từ vựng) */
function SingleQuestionBlock({
  question: current,
  passage,
  answers,
  setAnswer,
  checkOne,
  checkOneWordChoice,
  checkOneSentenceFill,
  checkOneDragDrop,
  showAnswer,
  result,
  detailByQuestionId,
  onAnswerChecked,
}) {
  return (
    <>
      {passage && (
        <div
          className="card"
          style={{ background: "var(--surface-2)", marginBottom: 16 }}
        >
          {passage.audioUrl && <AudioPlayer src={passage.audioUrl} />}
          {passage.imageUrl && (
            <img
              src={passage.imageUrl}
              alt="Đoạn văn"
              style={{ maxWidth: "100%", marginTop: 8 }}
            />
          )}
          {passage.passageHtml && (
            <div
              className="rich-text-content mt-8"
              dangerouslySetInnerHTML={{ __html: passage.passageHtml }}
            />
          )}
          <TranscriptDropdown html={passage.transcriptHtml} />
        </div>
      )}

      {current.questionKind === "MULTIPLE_CHOICE" && (
        <MultipleChoiceQuestion
          key={current.id}
          imageUrl={current.imageUrl}
          audioUrl={current.audioUrl}
          prompt={current.promptText}
          options={current.options}
          selectedOptionId={answers[current.id]}
          onSelect={(id) => setAnswer(current.id, id)}
          readOnly={showAnswer}
          showAnswer={showAnswer && !!detailByQuestionId[current.id]}
          allowCheck={!result}
          onCheck={checkOne(current.id, {
            selectedOptionId: answers[current.id] || null,
          })}
          correctOptionId={detailByQuestionId[current.id]?.correctOptionId}
          onAnswerChecked={!result ? onAnswerChecked : undefined}
          explanation={
            showAnswer ? detailByQuestionId[current.id]?.explanation : null
          }
        />
      )}
      {current.questionKind === "FILL_BLANK" && (
        <FillBlankQuestion
          key={current.id}
          prompt={current.promptText}
          hint={current.hint}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
          readOnly={showAnswer}
          showAnswer={showAnswer}
          correctText={detailByQuestionId[current.id]?.correctText}
          allowCheck={!result}
          onCheck={checkOne(current.id, {
            submittedText: answers[current.id] || "",
          })}
          onAnswerChecked={!result ? onAnswerChecked : undefined}
          explanation={
            showAnswer ? detailByQuestionId[current.id]?.explanation : null
          }
        />
      )}
      {current.questionKind === "MATCHING" && (
        <div key={current.id}>
          {current.promptText && (
            <p className="question-prompt">{current.promptText}</p>
          )}
          <MatchingPairsGame
            pairs={current.matchingPairs}
            onChange={(v) => setAnswer(current.id, v)}
            readOnly={showAnswer}
            showAnswer={showAnswer}
          />
        </div>
      )}
      {current.questionKind === "WORD_CHOICE" && (
        <WordChoiceText
          key={current.id}
          promptText={current.promptText}
          pairs={current.wordChoicePairs || []}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
          readOnly={showAnswer}
          showAnswer={showAnswer}
          correctPairs={detailByQuestionId[current.id]?.wordChoicePairs}
          onCheck={!result ? checkOneWordChoice(current.id) : undefined}
          onAnswerChecked={!result ? onAnswerChecked : undefined}
        />
      )}
      {current.questionKind === "SENTENCE_FILL" && (
        <SentenceFillQuestion
          key={current.id}
          promptText={current.promptText}
          blanks={current.sentenceFillBlanks || []}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
          readOnly={showAnswer}
          showAnswer={showAnswer}
          onCheck={!result ? checkOneSentenceFill(current.id) : undefined}
          onAnswerChecked={!result ? onAnswerChecked : undefined}
        />
      )}
      {current.questionKind === "DRAG_DROP" && (
        <DragDropQuestion
          key={current.id}
          promptText={current.promptText}
          options={current.dragDropOptions || []}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
          readOnly={showAnswer}
          showAnswer={showAnswer}
          correctOptions={detailByQuestionId[current.id]?.dragDropOptions}
          onCheck={!result ? checkOneDragDrop(current.id) : undefined}
          onAnswerChecked={!result ? onAnswerChecked : undefined}
        />
      )}
    </>
  );
}

function isAnswered(value, kind) {
  if (value == null) return false;
  if (kind === "MATCHING") return Array.isArray(value) && value.length > 0;
  if (kind === "WORD_CHOICE")
    return typeof value === "object" && Object.keys(value).length > 0;
  if (kind === "SENTENCE_FILL")
    return (
      typeof value === "object" && Object.values(value).some((v) => v?.trim())
    );
  if (kind === "DRAG_DROP")
    return typeof value === "object" && Object.keys(value).length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}
