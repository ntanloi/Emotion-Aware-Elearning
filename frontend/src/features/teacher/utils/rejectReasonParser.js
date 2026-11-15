export const REJECT_REASON_LABELS = {
  CONTENT_QUALITY: 'Chất lượng nội dung chưa đạt',
  FORMAT_ERROR: 'Sai định dạng chuẩn TOEIC',
  COPYRIGHT: 'Nghi vấn vi phạm bản quyền',
  UNSAFE_CONTENT: 'Nội dung không an toàn / từ ngữ nhạy cảm',
  MISLEADING_INFO: 'Tuyên bố sai lệch so với nội dung',
  INCOMPLETE: 'Chưa đủ nội dung hoặc bài tập tối thiểu',
  OTHER: 'Lý do khác',
}

export const RULE_NAMES = {
  // Cấu trúc & Thông tin chung
  'STR-01': 'Tiêu đề khóa học',
  'STR-02': 'Mô tả khóa học',
  'STR-03': 'Ảnh bìa khóa học',
  'STR-04': 'Học phí khóa học',
  'STR-05': 'Số lượng phần học tối thiểu',
  'STR-06': 'Video bài giảng bắt buộc',
  'STR-07': 'Số lượng câu hỏi tối thiểu',
  'STR-08': 'Cấu trúc nhóm hoạt động',
  'STR-09': 'Bộ từ vựng tối thiểu',
  'STR-10': 'Bài học ngữ pháp tối thiểu',
  'STR-11': 'Luyện nghe chép chính tả tối thiểu',
  'STR-12': 'Thời lượng video bài giảng',
  'STR-13': 'Số câu đề thi thử',
  'STR-14': 'Mục hoặc nhóm hoạt động trống',
  'STR-15': 'Định dạng phạm vi khóa học',
  'STR-17': 'Số lượng nội dung khuyến nghị',

  // Câu hỏi & Bài tập
  'CM-01': 'Số lượng đáp án đúng duy nhất',
  'CM-02': 'Thứ tự nhãn đáp án (A, B, C, D)',
  'CM-03': 'Nội dung đáp án lựa chọn',
  'CM-04': 'Nội dung các đáp án phân biệt',
  'CM-05': 'Phân bố đáp án đúng',
  'CM-06': 'Độ dài thiên vị của đáp án',
  'CM-07': 'Lời giải thích câu hỏi',
  'CM-08': 'Tính nhất quán của lời giải thích',
  'CM-09': 'Trùng lặp câu hỏi trong bài tập',
  'CM-10': 'Nội dung đề bài câu hỏi',
  'CM-11': 'Cụm từ bị cấm trong đáp án',

  // Trùng lặp
  'DUP-01': 'Trùng lặp câu hỏi trong đề thi',
  'DUP-02': 'Trùng lặp bài tập với khóa học khác',
  'DUP-03': 'Trùng lặp tiêu đề khóa học',
  'DUP-05': 'Trùng lặp nội dung bài học',

  // Văn bản & An toàn
  'TXT-01': 'Thông tin liên hệ cá nhân',
  'TXT-02': 'Ngôn từ nhạy cảm / không phù hợp',
  'TXT-03': 'Quảng cáo sai lệch',
  'TXT-04': 'Cam kết điểm số sai quy định',
  'TXT-05': 'Nội dung giữ chỗ (Placeholder/Lorem)',
  'TXT-06': 'Định dạng văn bản quá mức',
  'TXT-07': 'Tiếng Việt không dấu',
  'TXT-09': 'Mã HTML độc hại',
  'TXT-10': 'Đánh dấu bản quyền bên thứ ba',
  'TXT-11': 'Lỗi chính tả / ngữ pháp',

  // Từ vựng
  'VOC-01': 'Định dạng từ vựng',
  'VOC-02': 'Từ loại (Part of Speech)',
  'VOC-03': 'Nghĩa tiếng Việt',
  'VOC-04': 'Phiên âm IPA',
  'VOC-05': 'Câu ví dụ tiếng Anh',
  'VOC-06': 'Từ vựng xuất hiện trong ví dụ',
  'VOC-07': 'Độ dài câu ví dụ',
  'VOC-08': 'Từ vựng trong từ điển',
  'VOC-09': 'Khớp từ loại trong ngữ cảnh',
  'VOC-10': 'Trùng lặp từ vựng trong bộ từ',
  'VOC-11': 'Trùng lặp từ vựng trong khóa học',
  'VOC-15': 'Số lượng từ trong bộ từ vựng',

  // Ngữ pháp
  'GRM-01': 'Mã chủ điểm ngữ pháp',
  'GRM-02': 'Độ dài bài học ngữ pháp',
  'GRM-03': 'Cấu trúc bài ngữ pháp',
  'GRM-04': 'Số lượng ví dụ ngữ pháp',
  'GRM-05': 'Ví dụ minh họa ngữ pháp',
  'GRM-06': 'Từ khóa chủ điểm ngữ pháp',
  'GRM-07': 'Bài tập củng cố ngữ pháp',
  'GRM-08': 'Phạm vi chủ điểm ngữ pháp',
  'GRM-10': 'Trùng lặp bài học ngữ pháp',

  // Media & Video
  'MED-01': 'Chất lượng âm thanh (Audio)',
  'MED-02': 'Chất lượng hình ảnh',
  'MED-03': 'Chất lượng video bài giảng',
  'MED-04': 'Trùng lặp file media',
  'MED-05': 'Thời lượng audio luyện nghe',

  // Chính tả
  'DIC-01': 'File âm thanh bài chính tả',
  'DIC-02': 'Độ dài câu chép chính tả',
  'DIC-03': 'Văn bản tiếng Anh chính tả',
  'DIC-04': 'Ngữ pháp câu chính tả',
}

/**
 * Phân tích chuỗi rejectReason thô từ cơ sở dữ liệu thành cấu trúc dữ liệu rõ ràng.
 * Định dạng chuẩn backend:
 *   [REASON_CODE] note
 *
 *   Các vấn đề cần chỉnh sửa trước khi gửi duyệt lại:
 *   - [RULE_ID] message (Yêu cầu: admin note)
 */
export function parseRejectReason(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      reasonCode: null,
      reasonLabel: null,
      adminNote: '',
      issues: [],
      raw: '',
    }
  }

  let text = rawText.trim()
  let reasonCode = null
  let reasonLabel = null

  // 1. Tách [REASON_CODE] ở đầu
  const codeMatch = text.match(/^\[([A-Z_]+)\]\s*/)
  if (codeMatch) {
    reasonCode = codeMatch[1]
    reasonLabel = REJECT_REASON_LABELS[reasonCode] || reasonCode
    text = text.slice(codeMatch[0].length).trim()
  }

  // 2. Tách phần lời nhắn admin và danh sách các lỗi
  const splitMarker = 'Các vấn đề cần chỉnh sửa trước khi gửi duyệt lại:'
  let adminNote = ''
  let issuesPart = ''

  if (text.includes(splitMarker)) {
    const parts = text.split(splitMarker)
    adminNote = parts[0].trim()
    issuesPart = parts[1].trim()
  } else if (text.includes('\n- [')) {
    const firstDash = text.indexOf('\n- [')
    adminNote = text.slice(0, firstDash).trim()
    issuesPart = text.slice(firstDash).trim()
  } else if (text.includes('- [')) {
    const firstDash = text.indexOf('- [')
    adminNote = text.slice(0, firstDash).trim()
    issuesPart = text.slice(firstDash).trim()
  } else {
    adminNote = text
  }

  // 3. Bóc tách từng mục lỗi
  const issues = []
  if (issuesPart) {
    const lines = issuesPart.split('\n')
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('- [')) continue

      // Regex: - [RULE_ID] message (Yêu cầu: requirement)
      const match = line.match(/^-\s*\[([A-Z0-9_-]+)\]\s*(.*?)(?:\s*\((?:Yêu cầu|Yêu cầu sửa đổi):\s*(.*?)\))?$/)
      if (match) {
        const ruleId = match[1]
        const message = match[2]?.trim() || ''
        const adminRequirement = match[3]?.trim() || null
        const ruleName = RULE_NAMES[ruleId] || ruleId

        issues.push({
          ruleId,
          ruleName,
          message,
          adminRequirement,
        })
      } else {
        issues.push({
          ruleId: 'CHỈNH SỬA',
          ruleName: 'Nội dung cần sửa',
          message: line.replace(/^-\s*/, ''),
          adminRequirement: null,
        })
      }
    }
  }

  return {
    reasonCode,
    reasonLabel,
    adminNote,
    issues,
    raw: rawText,
  }
}

/**
 * Xác định vị trí cần sửa (jumpTo) và nhãn mô tả đích đến cho từng lỗi
 * @param {Object} issue Đối tượng lỗi ({ ruleId, message, targetType, targetId })
 * @param {string} courseId ID của khóa học
 * @param {Array} contentItems Danh sách tất cả hoạt động/bài học trong khóa học
 * @returns {{ jumpTo: string, jumpLabel: string, targetType: string, targetTitle?: string }}
 */
export function resolveIssueJumpTarget(issue, courseId, contentItems = []) {
  if (!courseId) return { jumpTo: '/teacher/courses', jumpLabel: 'Quay lại danh sách khóa học', targetType: 'COURSE' }
  if (!issue) return { jumpTo: `/teacher/courses/${courseId}/content`, jumpLabel: 'Đến nội dung khóa học', targetType: 'COURSE' }

  // 1. Nếu issue đã có targetId thuộc loại ITEM
  if (issue.targetId && issue.targetType === 'ITEM') {
    const item = contentItems.find((it) => it.id === issue.targetId)
    const ruleQuery = issue.ruleId ? `?focusRule=${encodeURIComponent(issue.ruleId)}` : ''
    return {
      jumpTo: `/teacher/content-items/${issue.targetId}${ruleQuery}`,
      jumpLabel: item ? `Sửa bài: "${item.title}"` : 'Đến bài học cần sửa',
      targetType: 'ITEM',
      targetTitle: item?.title,
    }
  }

  const message = issue.message || ''

  // 2. Tìm tên bài học/bài tập được trích dẫn trong dấu nháy đơn '...'
  const quotedMatches = message.match(/'([^']+)'/g)
  if (quotedMatches && quotedMatches.length > 0) {
    const quotedTitles = quotedMatches.map((m) => m.replace(/^'|'$/g, '').trim())

    // Thử khớp với từng tên được trích dẫn trong danh sách contentItems
    for (const title of quotedTitles) {
      const matched = contentItems.find(
        (it) => it.title && it.title.trim().toLowerCase() === title.toLowerCase()
      )
      if (matched) {
        const ruleQuery = issue.ruleId ? `?focusRule=${encodeURIComponent(issue.ruleId)}` : ''
        return {
          jumpTo: `/teacher/content-items/${matched.id}${ruleQuery}`,
          jumpLabel: `Sửa bài: "${matched.title}"`,
          targetType: 'ITEM',
          targetTitle: matched.title,
        }
      }
    }
  }

  // 3. Nếu là các luật liên quan đến cài đặt/thông tin chung của khóa học
  const courseConfigRules = ['STR-01', 'STR-02', 'STR-03', 'STR-04', 'STR-15']
  if (
    courseConfigRules.includes(issue.ruleId) ||
    /tiêu đề|mô tả|ảnh bìa|học phí|giá tiền|phạm vi|chuyên đề|toàn diện|profile/i.test(message)
  ) {
    return {
      jumpTo: `/teacher/courses/${courseId}/edit`,
      jumpLabel: 'Cài đặt khóa học',
      targetType: 'COURSE_SETTINGS',
    }
  }

  // 4. Nếu là các luật liên quan đến một mục/section cụ thể
  const sectionCodes = ['PART1', 'PART2', 'PART3', 'PART4', 'PART5', 'PART6', 'PART7', 'VOCAB', 'GRAMMAR', 'DICTATION']
  for (const code of sectionCodes) {
    if (message.toUpperCase().includes(code)) {
      return {
        jumpTo: `/teacher/courses/${courseId}/content?section=${code}`,
        jumpLabel: `Đến mục: ${code}`,
        targetType: 'SECTION',
      }
    }
  }

  if (/từ vựng/i.test(message) || (issue.ruleId && issue.ruleId.startsWith('VOC-'))) {
    return {
      jumpTo: `/teacher/courses/${courseId}/content?section=VOCAB`,
      jumpLabel: 'Đến mục Từ vựng',
      targetType: 'SECTION',
    }
  }

  if (/ngữ pháp/i.test(message) || (issue.ruleId && issue.ruleId.startsWith('GRM-'))) {
    return {
      jumpTo: `/teacher/courses/${courseId}/content?section=GRAMMAR`,
      jumpLabel: 'Đến mục Ngữ pháp',
      targetType: 'SECTION',
    }
  }

  if (/chính tả/i.test(message) || (issue.ruleId && issue.ruleId.startsWith('DIC-'))) {
    return {
      jumpTo: `/teacher/courses/${courseId}/content?section=DICTATION`,
      jumpLabel: 'Đến mục Chính tả',
      targetType: 'SECTION',
    }
  }

  // 5. Mặc định: Chuyển vào trang quản lý nội dung của khóa học
  return {
    jumpTo: `/teacher/courses/${courseId}/content`,
    jumpLabel: 'Xem nội dung khóa học',
    targetType: 'CONTENT_PAGE',
  }
}
