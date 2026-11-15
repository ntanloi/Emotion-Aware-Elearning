import React from 'react'
import {
  BookOpen,
  FileText,
  Image,
  MessageSquareQuote,
  MessagesSquare,
  Radio,
  PenTool,
  AlignLeft,
  BookOpenCheck,
  Headphones,
  PlayCircle,
  Layers,
  PenSquare,
  Sparkles,
  Bookmark,
  Pin,
  HelpCircle,
  Target,
  Lightbulb,
  ClipboardList,
  Folder,
  Pencil,
  Puzzle,
  Star,
  BarChart3,
} from 'lucide-react'

/**
 * Color and Icon themes for Course Sections (Fixed 10 + Custom)
 * Designed with shadcn UI aesthetic (subtle tinted backgrounds, crisp borders, distinct colors)
 */
export const SECTION_THEMES = {
  VOCAB: {
    icon: BookOpen,
    label: 'Từ vựng',
    color: '#059669', // emerald-600
    bg: '#ecfdf5',    // emerald-50
    border: '#a7f3d0',// emerald-200
  },
  GRAMMAR: {
    icon: FileText,
    label: 'Ngữ pháp',
    color: '#4f46e5', // indigo-600
    bg: '#eef2ff',    // indigo-50
    border: '#c7d2fe',// indigo-200
  },
  PART1: {
    icon: Image,
    label: 'Part 1 - Photographs',
    color: '#0284c7', // sky-600
    bg: '#f0f9ff',    // sky-50
    border: '#bae6fd',// sky-200
  },
  PART2: {
    icon: MessageSquareQuote,
    label: 'Part 2 - Question-Response',
    color: '#0d9488', // teal-600
    bg: '#f0fdfa',    // teal-50
    border: '#99f6e4',// teal-200
  },
  PART3: {
    icon: MessagesSquare,
    label: 'Part 3 - Conversations',
    color: '#2563eb', // blue-600
    bg: '#eff6ff',    // blue-50
    border: '#bfdbfe',// blue-200
  },
  PART4: {
    icon: Radio,
    label: 'Part 4 - Talks',
    color: '#7c3aed', // violet-600
    bg: '#f5f3ff',    // violet-50
    border: '#ddd6fe',// violet-200
  },
  PART5: {
    icon: PenTool,
    label: 'Part 5 - Incomplete Sentences',
    color: '#d97706', // amber-600
    bg: '#fffbeb',    // amber-50
    border: '#fde68a',// amber-200
  },
  PART6: {
    icon: AlignLeft,
    label: 'Part 6 - Text Completion',
    color: '#ea580c', // orange-600
    bg: '#fff7ed',    // orange-50
    border: '#fed7aa',// orange-200
  },
  PART7: {
    icon: BookOpenCheck,
    label: 'Part 7 - Reading Comprehension',
    color: '#e11d48', // rose-600
    bg: '#fff1f2',    // rose-50
    border: '#fecdd3',// rose-200
  },
  DICTATION: {
    icon: Headphones,
    label: 'Luyện nghe chép chính tả',
    color: '#9333ea', // purple-600
    bg: '#faf5ff',    // purple-50
    border: '#e9d5ff',// purple-200
  },
}

/**
 * Activity Types
 */
export const ACTIVITY_THEMES = {
  VIDEO_LECTURE: {
    icon: PlayCircle,
    label: 'Video bài giảng',
    color: '#e11d48', // rose-600
    bg: '#fff1f2',    // rose-50
    border: '#fecdd3',// rose-200
  },
  VOCAB_SET: {
    icon: Layers,
    label: 'Bộ từ vựng (Flashcard)',
    color: '#059669', // emerald-600
    bg: '#ecfdf5',    // emerald-50
    border: '#a7f3d0',// emerald-200
  },
  GRAMMAR_ARTICLE: {
    icon: BookOpen,
    label: 'Bài viết ngữ pháp',
    color: '#4f46e5', // indigo-600
    bg: '#eef2ff',    // indigo-50
    border: '#c7d2fe',// indigo-200
  },
  PRACTICE_TEST: {
    icon: PenSquare,
    label: 'Bài luyện tập',
    color: '#d97706', // amber-600
    bg: '#fffbeb',    // amber-50
    border: '#fde68a',// amber-200
  },
  DICTATION_SET: {
    icon: Headphones,
    label: 'Bộ chính tả (tự sinh)',
    color: '#9333ea', // purple-600
    bg: '#faf5ff',    // purple-50
    border: '#e9d5ff',// purple-200
  },
}

export const CUSTOM_SECTION_ICONS = {
  pin: Pin,
  '\u{1F4CC}': Pin,
  book: BookOpen,
  '\u{1F4DA}': BookOpen,
  'file-text': FileText,
  '\u{1F4DD}': FileText,
  target: Target,
  '\u{1F3AF}': Target,
  lightbulb: Lightbulb,
  '\u{1F4A1}': Lightbulb,
  bookmark: Bookmark,
  '\u{1F516}': Bookmark,
  clipboard: ClipboardList,
  '\u{1F4CB}': ClipboardList,
  folder: Folder,
  '\u{1F5C2}': Folder,
  '\u{1F5C2}\u{FE0F}': Folder,
  pencil: Pencil,
  '\u{270F}': Pencil,
  '\u{270F}\u{FE0F}': Pencil,
  puzzle: Puzzle,
  '\u{1F9E9}': Puzzle,
  star: Star,
  '\u{1F31F}': Star,
  'bar-chart': BarChart3,
  '\u{1F4CA}': BarChart3,
}

/**
 * SectionIcon — renders a themed icon for sections.
 */
export function SectionIcon({
  code,
  fallbackEmoji,
  size = 18,
  withBadge = false,
  className = '',
  style = {},
}) {
  const theme = SECTION_THEMES[code]

  if (theme) {
    const IconComponent = theme.icon
    if (!withBadge) {
      return (
        <span
          className={`app-icon-inline ${className}`}
          style={{ display: 'inline-flex', alignItems: 'center', color: theme.color, ...style }}
        >
          <IconComponent size={size} strokeWidth={2} />
        </span>
      )
    }

    const badgeSize = Math.max(size + 10, 28)
    return (
      <span
        className={`app-icon-badge ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: badgeSize,
          height: badgeSize,
          borderRadius: 8,
          backgroundColor: theme.bg,
          color: theme.color,
          border: `1px solid ${theme.border}`,
          flexShrink: 0,
          ...style,
        }}
      >
        <IconComponent size={size} strokeWidth={2} />
      </span>
    )
  }

  // Custom section with mapped Lucide icon or fallback
  if (fallbackEmoji) {
    const CustomIconComponent = CUSTOM_SECTION_ICONS[fallbackEmoji]
    if (CustomIconComponent) {
      if (!withBadge) {
        return (
          <span
            className={`app-icon-inline ${className}`}
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-primary, #2563eb)', ...style }}
          >
            <CustomIconComponent size={size} strokeWidth={2} />
          </span>
        )
      }

      const badgeSize = Math.max(size + 10, 28)
      return (
        <span
          className={`app-icon-badge ${className}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: badgeSize,
            height: badgeSize,
            borderRadius: 8,
            backgroundColor: 'var(--accent-soft, rgba(37, 99, 235, 0.08))',
            color: 'var(--accent, #2563eb)',
            border: '1px solid var(--border)',
            flexShrink: 0,
            ...style,
          }}
        >
          <CustomIconComponent size={size} strokeWidth={2} />
        </span>
      )
    }

    if (!withBadge) {
      return (
        <span
          className={`app-icon-inline ${className}`}
          style={{ display: 'inline-flex', alignItems: 'center', fontSize: size, lineHeight: 1, ...style }}
        >
          {fallbackEmoji}
        </span>
      )
    }

    const badgeSize = Math.max(size + 10, 28)
    return (
      <span
        className={`app-icon-badge ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: badgeSize,
          height: badgeSize,
          borderRadius: 8,
          backgroundColor: '#f8fafc',
          color: '#475569',
          border: '1px solid #e2e8f0',
          fontSize: size - 2,
          flexShrink: 0,
          ...style,
        }}
      >
        {fallbackEmoji}
      </span>
    )
  }

  // Default fallback
  const FallbackIcon = Bookmark
  if (!withBadge) {
    return (
      <span
        className={`app-icon-inline ${className}`}
        style={{ display: 'inline-flex', alignItems: 'center', color: '#64748b', ...style }}
      >
        <FallbackIcon size={size} strokeWidth={2} />
      </span>
    )
  }

  return (
    <span
      className={`app-icon-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: '1px solid #e2e8f0',
        flexShrink: 0,
        ...style,
      }}
    >
      <FallbackIcon size={size} strokeWidth={2} />
    </span>
  )
}

/**
 * ActivityTypeIcon — renders a themed icon for activity types.
 */
export function ActivityTypeIcon({
  type,
  size = 18,
  withBadge = false,
  className = '',
  style = {},
}) {
  const theme = ACTIVITY_THEMES[type] || {
    icon: FileText,
    label: 'Nội dung',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
  }

  const IconComponent = theme.icon

  if (!withBadge) {
    return (
      <span
        className={`app-icon-inline ${className}`}
        style={{ display: 'inline-flex', alignItems: 'center', color: theme.color, ...style }}
      >
        <IconComponent size={size} strokeWidth={2} />
      </span>
    )
  }

  const badgeSize = Math.max(size + 10, 28)
  return (
    <span
      className={`app-icon-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: badgeSize,
        height: badgeSize,
        borderRadius: 8,
        backgroundColor: theme.bg,
        color: theme.color,
        border: `1px solid ${theme.border}`,
        flexShrink: 0,
        ...style,
      }}
    >
      <IconComponent size={size} strokeWidth={2} />
    </span>
  )
}
