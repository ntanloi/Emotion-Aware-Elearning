import { useEffect, useState } from "react";
import Modal from "@shared/components/ui/Modal.jsx";
import MediaUploader from "@shared/components/ui/MediaUploader.jsx";
import RichTextEditor from "@shared/components/ui/RichTextEditor.jsx";
import {
  useCreatePassage,
  useUpdatePassage,
} from "@teacher/hooks/useTeacherPassages.js";

/**
 * PassageModal — đoạn văn/hội thoại DÙNG CHUNG cho nhiều câu hỏi (Part 3/4: audio hội thoại;
 * Part 6/7: văn bản đọc, Part 7 có thể kèm ảnh email/biểu mẫu). Với Part 1/2/5 và Ngữ pháp,
 * giáo viên không cần tạo Đoạn văn — bỏ qua bước này.
 */
export default function PassageModal({
  open,
  contentItemId,
  passage,
  onClose,
}) {
  const [transcriptHtml, setTranscriptHtml] = useState("");
  const [passageHtml, setPassageHtml] = useState("");
  const [audio, setAudio] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const isEdit = !!passage;
  const createPassage = useCreatePassage(contentItemId);
  const updatePassage = useUpdatePassage(contentItemId);
  const saving = createPassage.isPending || updatePassage.isPending;

  useEffect(() => {
    if (!open) return;
    setTranscriptHtml(passage?.transcriptHtml || "");
    setPassageHtml(passage?.passageHtml || "");
    setAudio(
      passage?.audioUrl
        ? { url: passage.audioUrl, fileName: "Audio hiện tại" }
        : null,
    );
    setImage(
      passage?.imageUrl
        ? { url: passage.imageUrl, fileName: "Ảnh hiện tại" }
        : null,
    );
    setError(null);
  }, [open, passage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!transcriptHtml.trim() && !passageHtml.trim() && !audio) {
      setError("Cần có ít nhất nội dung văn bản hoặc audio cho đoạn này");
      return;
    }
    const payload = {
      transcriptHtml: transcriptHtml.trim() || null,
      passageHtml: passageHtml.trim() || null,
      audioMediaId: audio?.id ?? null,
      imageMediaId: image?.id ?? null,
    };
    try {
      if (isEdit) {
        await updatePassage.mutateAsync({ id: passage.id, payload });
      } else {
        await createPassage.mutateAsync(payload);
      }
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại");
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Sửa đoạn văn/hội thoại" : "Thêm đoạn văn/hội thoại"}
      onClose={onClose}
      width={620}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label>Audio hội thoại/bài nói (Part 3/4 — tuỳ chọn)</label>
          <MediaUploader
            type="AUDIO"
            value={audio}
            onChange={setAudio}
            label="Chọn file audio"
          />
        </div>

        <div className="field">
          <label>Ảnh kèm theo (Part 7: email/biểu mẫu — tuỳ chọn)</label>
          <MediaUploader type="IMAGE" value={image} onChange={setImage} />
        </div>

        <div className="field">
          <label>Văn bản đọc (Part 6/7 — tuỳ chọn)</label>
          <RichTextEditor
            value={passageHtml}
            onChange={setPassageHtml}
            placeholder="Nội dung bài đọc..."
          />
        </div>

        <div className="field">
          <label>
            Transcript hội thoại/bài nói (Part 3/4 — tuỳ chọn nếu đã có audio)
          </label>
          <RichTextEditor
            value={transcriptHtml}
            onChange={setTranscriptHtml}
            placeholder="Nội dung transcript hội thoại..."
          />
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
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo đoạn văn"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
