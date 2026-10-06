import { useContentItem } from '@shared/hooks/useContentSection.js'
import VideoLecturePlayer from '@shared/components/VideoLecturePlayer.jsx'
import VocabPracticeRunner from '@student/components/VocabPracticeRunner.jsx'
import GrammarRunner from '@student/components/GrammarRunner.jsx'
import PracticeTestRunner from '@student/components/PracticeTestRunner.jsx'
import DictationRunner from '@student/components/DictationRunner.jsx'

/**
 * ContentItemRenderer — Giai đoạn 5, component #7. Bộ điều phối trung tâm.
 * Nhận content_item.type rồi render đúng component tương ứng — dùng CHUNG cho trang học viên
 * và trang Preview giảng viên (đảm bảo bố cục luôn đồng nhất, theo đúng FR-TCH-07).
 *
 *   VIDEO_LECTURE   -> VideoLecturePlayer
 *   GRAMMAR_ARTICLE -> GrammarRunner (RichTextViewer + FillBlankQuestion danh sách)
 *   PRACTICE_TEST   -> PracticeTestRunner (QuestionNavigator + MC/FillBlank/Matching theo question_kind)
 *   DICTATION_SET   -> DictationRunner (DictationPlayer danh sách)
 *   VOCAB_SET       -> VocabPracticeRunner (5 tab chọn practiceType TRƯỚC rồi mới render)
 *
 * Props: contentItemId (nếu chưa có contentItem đầy đủ) hoặc contentItem trực tiếp.
 */
export default function ContentItemRenderer({ contentItemId, contentItem: providedItem }) {
  const shouldFetch = !providedItem && !!contentItemId
  const { data: fetchedItem, isLoading, isError } = useContentItem(shouldFetch ? contentItemId : null)
  const contentItem = providedItem || fetchedItem

  if (shouldFetch && isLoading) return <p className="text-dim">Đang tải nội dung...</p>
  if (shouldFetch && isError) return <p style={{ color: 'var(--bad)' }}>Không tải được nội dung này.</p>
  if (!contentItem) return null

  switch (contentItem.type) {
    case 'VIDEO_LECTURE':
      return <VideoLecturePlayer contentItem={contentItem} />
    case 'GRAMMAR_ARTICLE':
      return <GrammarRunner contentItem={contentItem} />
    case 'PRACTICE_TEST':
      return <PracticeTestRunner contentItem={contentItem} />
    case 'DICTATION_SET':
      return <DictationRunner contentItem={contentItem} />
    case 'VOCAB_SET':
      return <VocabPracticeRunner contentItem={contentItem} />
    default:
      return <p style={{ color: 'var(--bad)' }}>Loại nội dung không được hỗ trợ: {contentItem.type}</p>
  }
}
