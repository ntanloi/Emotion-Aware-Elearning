export const ALL_STANDARD_SECTIONS = [
  { code: 'VOCAB',     label: 'Từ vựng',                  desc: 'Bộ từ vựng TOEIC kèm phát âm, nghĩa tiếng Việt và ví dụ' },
  { code: 'GRAMMAR',   label: 'Ngữ pháp',                 desc: 'Các chủ điểm ngữ pháp trọng tâm theo chuẩn TOEIC' },
  { code: 'PART1',     label: 'Part 1 - Photographs',     desc: 'Hình ảnh mô tả - 6 câu hỏi' },
  { code: 'PART2',     label: 'Part 2 - Question-Response', desc: 'Hỏi và Đáp ngắn - 25 câu hỏi' },
  { code: 'PART3',     label: 'Part 3 - Conversations',   desc: 'Đoạn hội thoại ngắn - 39 câu hỏi' },
  { code: 'PART4',     label: 'Part 4 - Talks',           desc: 'Bài nói chuyện ngắn độc thoại - 30 câu hỏi' },
  { code: 'PART5',     label: 'Part 5 - Incomplete Sentences', desc: 'Điền từ vào câu - 30 câu hỏi' },
  { code: 'PART6',     label: 'Part 6 - Text Completion', desc: 'Điền từ vào đoạn văn - 16 câu hỏi' },
  { code: 'PART7',     label: 'Part 7 - Reading Comprehension', desc: 'Đọc hiểu đoạn đơn và đoạn kép - 54 câu hỏi' },
  { code: 'DICTATION', label: 'Luyện nghe chép chính tả', desc: 'Luyện nghe phản xạ và gõ lại câu' },
]

export const LISTENING_SECTIONS = ['PART1', 'PART2', 'PART3', 'PART4', 'DICTATION']
export const READING_SECTIONS = ['PART5', 'PART6', 'PART7', 'GRAMMAR']

/**
 * Trả về danh sách các mục chuẩn cần hiển thị theo profile của khóa học:
 * - LISTENING: chỉ hiển thị các Part nghe (PART1..4, DICTATION) + VOCAB nếu đã có bài
 * - READING: chỉ hiển thị các Part đọc (PART5..7, GRAMMAR) + VOCAB nếu đã có bài
 * - FULL: hiển thị đầy đủ cả 10 phần TOEIC chuẩn
 * - TOPIC (Khóa chuyên đề / Linh hoạt): CHỈ hiển thị những phần mà giáo viên đã thêm / đã có nội dung
 */
export function getVisibleStandardSections(profile, activeSectionCodes = []) {
  const normProfile = (profile || 'TOPIC').toUpperCase()
  const activeSet = new Set((activeSectionCodes || []).map((c) => (c || '').toUpperCase()))

  if (normProfile === 'LISTENING') {
    return ALL_STANDARD_SECTIONS.filter((s) => LISTENING_SECTIONS.includes(s.code) || activeSet.has(s.code))
  }

  if (normProfile === 'READING') {
    return ALL_STANDARD_SECTIONS.filter((s) => READING_SECTIONS.includes(s.code) || activeSet.has(s.code))
  }

  if (normProfile === 'FULL') {
    return ALL_STANDARD_SECTIONS
  }

  // Khóa học chuyên đề / Linh hoạt: chỉ hiển thị những mục đã có nội dung / đã được thêm
  return ALL_STANDARD_SECTIONS.filter((s) => activeSet.has(s.code))
}

/**
 * Lấy section mặc định thích hợp khi vào một khóa học
 */
export function getDefaultSectionForProfile(profile, visibleSections = []) {
  if (visibleSections && visibleSections.length > 0) {
    return visibleSections[0].code
  }
  const normProfile = (profile || 'TOPIC').toUpperCase()
  if (normProfile === 'LISTENING') return 'PART1'
  if (normProfile === 'READING') return 'PART5'
  return 'VOCAB'
}
