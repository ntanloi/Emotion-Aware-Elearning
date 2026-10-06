import { useParams } from 'react-router-dom'
import { useContentItem } from '@shared/hooks/useContentSection.js'
import ContentItemEditorShell from '@teacher/components/ContentItemEditorShell.jsx'
import VideoLectureEditor from '@teacher/components/editors/VideoLectureEditor.jsx'
import GrammarArticleEditor from '@teacher/components/editors/GrammarArticleEditor.jsx'
import VocabSetEditor from '@teacher/components/editors/VocabSetEditor.jsx'
import PracticeTestEditor from '@teacher/components/editors/PracticeTestEditor.jsx'
import DictationSetEditor from '@teacher/components/editors/DictationSetEditor.jsx'

/**
 * TeacherContentItemEditorPage — router theo `item.type`, GIAI ĐOẠN 3c: ĐỦ CẢ 5 LOẠI.
 * Đây là bản hoàn thiện của lộ trình A-Z phần "soạn 1 hoạt động".
 */
export default function TeacherContentItemEditorPage() {
  const { id } = useParams()
  const { data: item, isLoading } = useContentItem(id)

  if (isLoading) return <p className="text-dim" style={{ padding: 24 }}>Đang tải...</p>
  if (!item) return null

  return (
    <ContentItemEditorShell item={item}>
      {item.type === 'VIDEO_LECTURE' && <VideoLectureEditor item={item} />}
      {item.type === 'GRAMMAR_ARTICLE' && <GrammarArticleEditor item={item} />}
      {item.type === 'VOCAB_SET' && <VocabSetEditor item={item} />}
      {item.type === 'PRACTICE_TEST' && <PracticeTestEditor item={item} />}
      {item.type === 'DICTATION_SET' && <DictationSetEditor item={item} />}
    </ContentItemEditorShell>
  )
}
