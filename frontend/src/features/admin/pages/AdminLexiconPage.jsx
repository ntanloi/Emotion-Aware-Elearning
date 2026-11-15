import React, { useEffect, useState, useCallback, useMemo } from 'react'
import * as adminApi from '@admin/api/admin.js'
import AdminPageHeader from '@admin/components/ui/AdminPageHeader.jsx'
import Modal from '@shared/components/ui/Modal.jsx'
import { useToast, useConfirm } from '@admin/context/AdminUIContext.jsx'
import './admin-theme.css'
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Tag,
  Code,
  Copy,
  Check,
  X,
  BookOpen,
  Info,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Terminal,
  Shield,
  Eye,
  ArrowUpDown,
  Smartphone,
  Target,
  Link2,
} from 'lucide-react'

export const CATEGORY_OPTIONS = [
  { value: '', label: 'Tất cả danh mục' },
  { value: 'CONTACT_SOCIAL', label: 'Liên hệ & MXH (SĐT, Zalo, FB, Link)' },
  { value: 'PROFANITY_VI', label: 'Từ tục tiếng Việt (PROFANITY_VI)' },
  { value: 'PROFANITY_EN', label: 'Từ tục tiếng Anh (PROFANITY_EN)' },
  { value: 'INSULT_VI', label: 'Xúc phạm & Lăng mạ (INSULT_VI)' },
  { value: 'SCAM_AD', label: 'Quảng cáo & Lừa đảo / Cá độ (SCAM_AD)' },
  { value: 'SCORE_GUARANTEE', label: 'Cam kết điểm số sai sự thật (SCORE_GUARANTEE)' },
  { value: 'SEXUAL_VIOLENCE', label: 'Nội dung người lớn & Bạo lực (SEXUAL_VIOLENCE)' },
  { value: 'HATE', label: 'Phát ngôn thù ghét & Miệt thị (HATE)' },
  { value: 'COPYRIGHT_MARK', label: 'Dấu hiệu bản quyền bên thứ 3 (COPYRIGHT_MARK)' },
  { value: 'PLACEHOLDER', label: 'Văn bản tạm & Đang soạn thảo (PLACEHOLDER)' },
]

export const SEVERITY_OPTIONS = [
  { value: '', label: 'Tất cả mức độ' },
  { value: 'ERROR', label: 'ERROR (Chặn xuất bản / Yêu cầu sửa)' },
  { value: 'WARNING', label: 'WARNING (Cảnh báo xem xét)' },
  { value: 'INFO', label: 'INFO (Gợi ý thông tin)' },
  { value: 'CONTEXT', label: 'CONTEXT (Cần ngữ cảnh LLM)' },
]

export const SCOPE_OPTIONS = [
  { value: '', label: 'Tất cả phạm vi' },
  { value: 'ALL', label: 'ALL (Toàn bộ nội dung khóa học)' },
  { value: 'TITLE_DESC', label: 'TITLE_DESC (Chỉ tiêu đề & Mô tả)' },
  { value: 'BODY', label: 'BODY (Nội dung văn bản bài học)' },
  { value: 'QUESTION', label: 'QUESTION (Câu hỏi & Lựa chọn đáp án)' },
]

// Category friendly name & color helper
function getCategoryInfo(cat) {
  switch (cat) {
    case 'CONTACT_SOCIAL':
      return { label: 'Liên hệ & MXH', colorClass: 'social' }
    case 'PROFANITY_VI':
      return { label: 'Từ tục tiếng Việt', colorClass: 'profanity' }
    case 'PROFANITY_EN':
      return { label: 'Từ tục tiếng Anh', colorClass: 'profanity' }
    case 'INSULT_VI':
      return { label: 'Xúc phạm / Lăng mạ', colorClass: 'profanity' }
    case 'SCAM_AD':
      return { label: 'Quảng cáo / Lừa đảo', colorClass: 'scam' }
    case 'SCORE_GUARANTEE':
      return { label: 'Cam kết điểm số', colorClass: 'score' }
    case 'SEXUAL_VIOLENCE':
      return { label: 'Bạo lực / Người lớn', colorClass: 'sexual' }
    case 'HATE':
      return { label: 'Thù ghét / Miệt thị', colorClass: 'profanity' }
    case 'COPYRIGHT_MARK':
      return { label: 'Dấu bản quyền', colorClass: 'social' }
    case 'PLACEHOLDER':
      return { label: 'Văn bản tạm', colorClass: 'placeholder' }
    default:
      return { label: cat || 'Khác', colorClass: 'default' }
  }
}

// Scope friendly label
function getScopeLabel(scope) {
  switch (scope) {
    case 'ALL':
      return 'Toàn khóa'
    case 'TITLE_DESC':
      return 'Tiêu đề / Mô tả'
    case 'BODY':
      return 'Bài học'
    case 'QUESTION':
      return 'Câu hỏi'
    default:
      return scope || 'Toàn khóa'
  }
}

export default function AdminLexiconPage() {
  const toast = useToast()
  const confirm = useConfirm()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadingCache, setReloadingCache] = useState(false)
  const [stats, setStats] = useState(null)

  // Bộ lọc
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  // Sắp xếp & Phân trang
  const [sortField, setSortField] = useState('category')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(15)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Copy feedback
  const [copiedPattern, setCopiedPattern] = useState('')
  const copyToClipboard = (text) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedPattern(text)
    toast.success(`Đã sao chép: ${text.length > 30 ? text.slice(0, 30) + '...' : text}`)
    setTimeout(() => setCopiedPattern(''), 2500)
  }

  // Interactive Live Sandbox (Thử nghiệm từ điển)
  const [showSandbox, setShowSandbox] = useState(false)
  const [testText, setTestText] = useState('')

  // Modal tạo / sửa
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    category: 'CONTACT_SOCIAL',
    matchType: 'WORD',
    pattern: '',
    severity: 'WARNING',
    scope: 'ALL',
    lang: 'vi',
    active: true,
    note: '',
  })
  const [regexError, setRegexError] = useState(null)

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim())
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [keyword])

  // Kiểm tra tính hợp lệ của Regex khi nhập trong modal
  useEffect(() => {
    if (formData.matchType === 'REGEX' && formData.pattern) {
      try {
        new RegExp(formData.pattern, 'ui')
        setRegexError(null)
      } catch (err) {
        setRegexError(err.message)
      }
    } else {
      setRegexError(null)
    }
  }, [formData.pattern, formData.matchType])

  // Tải thống kê
  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.getLexiconStats()
      setStats(data)
    } catch (err) {
      console.warn('Không thể nạp thống kê từ điển:', err)
    }
  }, [])

  // Tải danh sách
  const loadLexicon = useCallback(async () => {
    try {
      setLoading(true)
      const data = await adminApi.getLexiconList({
        category: categoryFilter || undefined,
        severity: severityFilter || undefined,
        scope: scopeFilter || undefined,
        active: activeFilter === '' ? undefined : activeFilter === 'true',
        keyword: debouncedKeyword || undefined,
        page,
        size: pageSize,
        sort: `${sortField},${sortDir}`,
      })
      setItems(data.content || [])
      setTotalPages(data.totalPages || 1)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error('Lỗi khi tải từ điển:', err)
      toast.error('Không thể nạp danh sách từ điển')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, severityFilter, scopeFilter, activeFilter, debouncedKeyword, page, pageSize, sortField, sortDir, toast])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadLexicon()
  }, [loadLexicon])

  // Computed metrics
  const computedStats = useMemo(() => {
    if (stats) {
      return {
        total: stats.total || totalElements,
        activeCount: stats.activeCount || 0,
        errorCount: stats.errorCount || 0,
        warningCount: stats.warningCount || 0,
      }
    }
    const errCount = items.filter((i) => i.severity === 'ERROR').length
    const warnCount = items.filter((i) => i.severity === 'WARNING').length
    const actCount = items.filter((i) => i.active !== false).length
    return {
      total: totalElements || items.length,
      activeCount: actCount,
      errorCount: errCount,
      warningCount: warnCount,
    }
  }, [stats, totalElements, items])

  // Sandbox Live Matches (Kiểm tra văn bản mẫu với danh sách từ điển)
  const sandboxMatches = useMemo(() => {
    if (!testText.trim() || items.length === 0) return []
    const results = []
    items.forEach((item) => {
      if (!item.active) return
      try {
        let regex
        if (item.matchType === 'REGEX') {
          regex = new RegExp(item.pattern, 'gui')
        } else if (item.matchType === 'WORD') {
          const escaped = item.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          regex = new RegExp(`(^|\\s|[.,!?;:()\\-–—"'])${escaped}($|\\s|[.,!?;:()\\-–—"'])`, 'gui')
        } else {
          const escaped = item.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          regex = new RegExp(escaped, 'gui')
        }

        let m
        while ((m = regex.exec(testText)) !== null) {
          const matchedStr = m[0].trim()
          if (!matchedStr) break
          results.push({
            ruleId: item.id,
            pattern: item.pattern,
            matchType: item.matchType,
            category: item.category,
            severity: item.severity,
            matchedText: matchedStr,
            index: m.index,
          })
          if (!regex.global) break
        }
      } catch (e) {
        // bỏ qua nếu regex client không hỗ trợ cú pháp đặc biệt
      }
    })
    return results
  }, [testText, items])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData({
      category: 'CONTACT_SOCIAL',
      matchType: 'WORD',
      pattern: '',
      severity: 'WARNING',
      scope: 'ALL',
      lang: 'vi',
      active: true,
      note: '',
    })
    setRegexError(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormData({
      category: item.category,
      matchType: item.matchType,
      pattern: item.pattern,
      severity: item.severity,
      scope: item.scope || 'ALL',
      lang: item.lang || 'vi',
      active: item.active !== false,
      note: item.note || '',
    })
    setRegexError(null)
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.pattern.trim()) {
      toast.warning('Vui lòng nhập từ khóa hoặc mẫu regex')
      return
    }
    if (regexError) {
      toast.error('Cú pháp Regex chưa hợp lệ, vui lòng kiểm tra lại')
      return
    }

    try {
      setSaving(true)
      if (editingItem) {
        await adminApi.updateLexicon(editingItem.id, formData)
        toast.success('Đã cập nhật mục từ điển thành công')
      } else {
        await adminApi.createLexicon(formData)
        toast.success('Đã thêm từ khóa mới vào từ điển')
      }
      setModalOpen(false)
      loadLexicon()
      loadStats()
    } catch (err) {
      console.error('Lỗi lưu từ điển:', err)
      toast.error(err.response?.data?.message || 'Lỗi khi lưu mục từ điển')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const nextActive = !item.active
      await adminApi.updateLexicon(item.id, { active: nextActive })
      toast.success(nextActive ? 'Đã kích hoạt mục từ điển' : 'Đã vô hiệu hóa mục từ điển')
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, active: nextActive } : i))
      )
      loadStats()
    } catch (err) {
      toast.error('Lỗi khi đổi trạng thái')
    }
  }

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: 'Xóa mục từ điển kiểm duyệt',
      message: `Bạn có chắc chắn muốn xóa từ khóa "${item.pattern}" khỏi danh mục ${item.category}?`,
      confirmText: 'Xóa từ khóa',
      variant: 'danger',
    })
    if (!ok) return

    try {
      await adminApi.deleteLexicon(item.id)
      toast.success('Đã xóa mục từ điển thành công')
      loadLexicon()
      loadStats()
    } catch (err) {
      toast.error('Lỗi khi xóa mục từ điển')
    }
  }

  const handleReloadCache = async () => {
    try {
      setReloadingCache(true)
      await adminApi.reloadLexiconCache()
      toast.success('Đã biên dịch lại toàn bộ mẫu từ điển vào bộ nhớ đệm RAM')
    } catch (err) {
      toast.error('Lỗi khi làm mới bộ nhớ đệm từ điển')
    } finally {
      setReloadingCache(false)
    }
  }

  const hasActiveFilters = Boolean(
    keyword || categoryFilter || severityFilter || scopeFilter || activeFilter !== ''
  )

  const handleClearFilters = () => {
    setKeyword('')
    setCategoryFilter('')
    setSeverityFilter('')
    setScopeFilter('')
    setActiveFilter('')
    setPage(0)
  }

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(0)
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* ========================================================================= */}
      {/* HEADER TRANG */}
      {/* ========================================================================= */}
      <AdminPageHeader
        title="Từ điển kiểm duyệt"
        subtitle="Quản lý từ khóa cấm, mẫu regex phát hiện số điện thoại, mạng xã hội, quảng cáo rác và nội dung vi phạm chính sách"
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Nút bật/tắt Sandbox kiểm tra văn bản */}
            <button
              className={`admin-btn ${showSandbox ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setShowSandbox(!showSandbox)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40 }}
              title="Mở khu vực thử nghiệm nhanh quy tắc từ điển với văn bản mẫu"
            >
              <Sparkles size={16} />
              <span>{showSandbox ? 'Đóng thử nghiệm' : 'Thử nghiệm từ điển'}</span>
            </button>

            {/* Nút nạp lại Cache */}
            <button
              className="admin-btn admin-btn-secondary"
              onClick={handleReloadCache}
              disabled={reloadingCache}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40 }}
              title="Biên dịch lại toàn bộ regex vào bộ nhớ đệm RAM phục vụ kiểm duyệt siêu tốc"
            >
              <RefreshCw size={15} className={reloadingCache ? 'spinner' : ''} />
              <span>{reloadingCache ? 'Đang nạp...' : 'Nạp lại Cache'}</span>
            </button>

            {/* Nút Thêm từ khóa */}
            <button
              className="admin-action-btn-primary"
              onClick={handleOpenCreate}
              style={{ padding: '9px 18px', fontSize: 14, height: 40 }}
            >
              <Plus size={16} />
              <span>Thêm từ khóa</span>
            </button>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 4 THẺ CHỈ SỐ KPI TỔNG QUAN TỪ ĐIỂN */}
      {/* ========================================================================= */}
      <div className="admin-finance-kpi-grid">
        {/* Card 1: Tổng số mẫu */}
        <div
          className={`admin-finance-kpi-card indigo-card ${!hasActiveFilters ? 'active-tab-card' : ''}`}
          onClick={handleClearFilters}
          title="Bấm để xem toàn bộ danh mục từ điển"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Tổng số mẫu từ điển</span>
            <div className="kpi-icon-wrap indigo">
              <BookOpen size={19} />
            </div>
          </div>
          <div className="kpi-card-value">
            {computedStats.total} <span className="unit">mục</span>
          </div>
          <div className="kpi-card-subtitle">
            <Layers size={13} style={{ color: 'var(--accent)' }} />
            <span>Bảo vệ 10 danh mục nội dung nhạy cảm</span>
          </div>
        </div>

        {/* Card 2: Vi phạm nghiêm trọng (ERROR) */}
        <div
          className={`admin-finance-kpi-card has-urgent ${severityFilter === 'ERROR' ? 'active-tab-card' : ''}`}
          onClick={() => {
            setSeverityFilter(severityFilter === 'ERROR' ? '' : 'ERROR')
            setPage(0)
          }}
          title="Bấm để lọc các mục mức độ ERROR"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Vi phạm nghiêm trọng</span>
            <div className="kpi-icon-wrap amber" style={{ background: 'var(--bad-soft)', color: 'var(--c-danger)' }}>
              <AlertTriangle size={19} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--c-danger)' }}>
            {computedStats.errorCount} <span className="unit">mẫu ERROR</span>
          </div>
          <div className="kpi-card-subtitle">
            <ShieldAlert size={13} style={{ color: 'var(--c-danger)' }} />
            <span>Chặn phê duyệt khóa học / Buộc sửa</span>
          </div>
        </div>

        {/* Card 3: Cảnh báo xem xét (WARNING) */}
        <div
          className={`admin-finance-kpi-card ${severityFilter === 'WARNING' ? 'active-tab-card' : ''}`}
          onClick={() => {
            setSeverityFilter(severityFilter === 'WARNING' ? '' : 'WARNING')
            setPage(0)
          }}
          title="Bấm để lọc các mục mức độ WARNING"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Cảnh báo xem xét</span>
            <div className="kpi-icon-wrap amber">
              <AlertCircle size={19} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--c-warning)' }}>
            {computedStats.warningCount} <span className="unit">mẫu WARNING</span>
          </div>
          <div className="kpi-card-subtitle">
            <Info size={13} style={{ color: 'var(--c-warning)' }} />
            <span>Gợi ý người kiểm duyệt thẩm định</span>
          </div>
        </div>

        {/* Card 4: Đang kích hoạt (ACTIVE) */}
        <div
          className={`admin-finance-kpi-card success-card ${activeFilter === 'true' ? 'active-tab-card' : ''}`}
          onClick={() => {
            setActiveFilter(activeFilter === 'true' ? '' : 'true')
            setPage(0)
          }}
          title="Bấm để lọc các mục đang bật"
        >
          <div className="kpi-card-header">
            <span className="kpi-card-title">Đang kích hoạt</span>
            <div className="kpi-icon-wrap emerald">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--c-success)' }}>
            {computedStats.activeCount} <span className="unit">đang BẬT</span>
          </div>
          <div className="kpi-card-subtitle">
            <CheckCircle2 size={13} style={{ color: 'var(--c-success)' }} />
            <span>Tham gia kiểm tra tự động thời gian thực</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHU VỰC THỬ NGHIỆM TỪ ĐIỂN (SANDBOX / TESTER) */}
      {/* ========================================================================= */}
      {showSandbox && (
        <div className="lexicon-sandbox-panel">
          <div className="lexicon-sandbox-header">
            <div className="lexicon-sandbox-title">
              <Terminal size={18} style={{ color: 'var(--accent)' }} />
              <span>Thử nghiệm từ điển (Sandbox kiểm tra văn bản)</span>
              <span className="lexicon-sandbox-badge">Real-time Sandbox</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSandbox(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              title="Đóng Sandbox"
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 12, margin: '0 0 12px 0' }}>
            Nhập hoặc chọn đoạn văn bản mẫu để kiểm tra xem hệ thống từ điển có phát hiện và bắt đúng từ khóa, số điện thoại hay cam kết vi phạm không:
          </p>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', alignSelf: 'center' }}>
              Văn bản mẫu:
            </span>
            <button
              type="button"
              className="lexicon-sample-chip"
              onClick={() =>
                setTestText('Khóa học TOEIC cấp tốc, liên hệ ngay Zalo 0988776655 hoặc fb.com/khoahoctoeic để nhận ưu đãi đặc biệt!')
              }
            >
              <Smartphone size={13} style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline' }} /> SĐT & Liên hệ Zalo
            </button>
            <button
              type="button"
              className="lexicon-sample-chip"
              onClick={() =>
                setTestText('Khóa học cam kết đảm bảo 850+ TOEIC sau 1 tháng học, hoàn tiền 100% nếu không đạt điểm mục tiêu!')
              }
            >
              <Target size={13} style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline' }} /> Cam kết 850+ TOEIC
            </button>
            <button
              type="button"
              className="lexicon-sample-chip"
              onClick={() =>
                setTestText('Thằng ngu dốt này học kiểu gì vậy dm đồ điên, bài giảng vớ vẩn.')
              }
            >
              <ShieldAlert size={13} style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline' }} /> Từ tục & Lăng mạ
            </button>
            <button
              type="button"
              className="lexicon-sample-chip"
              onClick={() =>
                setTestText('Tải tài liệu trọn bộ miễn phí tại bit.ly/tailieu850 hoặc inbox trực tiếp @thaygiao_toeic nhé!')
              }
            >
              <Link2 size={13} style={{ marginRight: 4, verticalAlign: 'middle', display: 'inline' }} /> Link rút gọn & @handle
            </button>
          </div>

          {/* Ô nhập văn bản kiểm tra */}
          <textarea
            className="lexicon-sandbox-textarea"
            placeholder="Dán hoặc gõ văn bản bài học, tiêu đề, câu hỏi vào đây để thử nghiệm quét từ điển..."
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
          />

          {/* Kết quả phát hiện */}
          {testText.trim() && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  Kết quả quét quy tắc ({sandboxMatches.length} vị trí phát hiện):
                </span>
                {sandboxMatches.length > 0 ? (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-danger)', background: 'var(--bad-soft)', padding: '2px 8px', borderRadius: 6 }}>
                    Có vi phạm
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-success)', background: 'var(--good-soft)', padding: '2px 8px', borderRadius: 6 }}>
                    An toàn (Không vi phạm quy tắc nào)
                  </span>
                )}
              </div>

              {sandboxMatches.length > 0 && (
                <div className="lexicon-match-list">
                  {sandboxMatches.map((m, idx) => (
                    <div key={idx} className={`lexicon-match-item ${m.severity.toLowerCase()}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`admin-status-pill ${m.severity === 'ERROR' ? 'rejected' : 'pending'}`}>
                          <span className="status-dot" />
                          <span>{m.severity}</span>
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                          Khớp chuỗi: &quot;{m.matchedText}&quot;
                        </span>
                        <span className="lexicon-pattern-code" style={{ fontSize: 12 }}>
                          Mẫu: {m.pattern}
                        </span>
                      </div>
                      <span className={`lexicon-cat-tag ${getCategoryInfo(m.category).colorClass}`}>
                        {getCategoryInfo(m.category).label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC */}
      {/* ========================================================================= */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md, 10px)', padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        {/* Hàng 1: Search + Select Dropdowns */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          {/* Ô tìm kiếm */}
          <div className="search-input-wrap" style={{ flex: '1 1 260px', minWidth: 240 }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm theo từ khóa, chuỗi regex, ghi chú..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => setKeyword('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Danh mục */}
          <div style={{ flex: '1 1 220px', minWidth: 200 }}>
            <select
              className="admin-select"
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(0)
              }}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mức độ */}
          <div style={{ width: 150 }}>
            <select
              className="admin-select"
              style={{ width: '100%' }}
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value)
                setPage(0)
              }}
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Phạm vi */}
          <div style={{ width: 150 }}>
            <select
              className="admin-select"
              style={{ width: '100%' }}
              value={scopeFilter}
              onChange={(e) => {
                setScopeFilter(e.target.value)
                setPage(0)
              }}
            >
              {SCOPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái */}
          <div style={{ width: 145 }}>
            <select
              className="admin-select"
              style={{ width: '100%' }}
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value)
                setPage(0)
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang kích hoạt</option>
              <option value="false">Đã vô hiệu hóa</option>
            </select>
          </div>

          {/* Nút Làm mới */}
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, height: 38 }}
            onClick={() => {
              loadLexicon()
              loadStats()
            }}
            title="Tải lại danh sách từ điển"
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Hàng 2: Chip lọc nhanh & Nút xóa bộ lọc */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 12, borderTop: '1px solid var(--surface-2)' }}>
          <div className="finance-quick-filters">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginRight: 4 }}>
              Lọc nhanh:
            </span>

            <button
              type="button"
              className={`finance-filter-chip ${!hasActiveFilters ? 'active' : ''}`}
              onClick={handleClearFilters}
            >
              <span>Tất cả</span>
              <span className="chip-count">{totalElements}</span>
            </button>

            <button
              type="button"
              className={`finance-filter-chip ${severityFilter === 'ERROR' ? 'active' : ''}`}
              onClick={() => {
                setSeverityFilter(severityFilter === 'ERROR' ? '' : 'ERROR')
                setPage(0)
              }}
            >
              <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-danger)', display: 'inline-block' }} />
              <span>Chặn (ERROR)</span>
            </button>

            <button
              type="button"
              className={`finance-filter-chip ${severityFilter === 'WARNING' ? 'active' : ''}`}
              onClick={() => {
                setSeverityFilter(severityFilter === 'WARNING' ? '' : 'WARNING')
                setPage(0)
              }}
            >
              <span className="status-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-warning)', display: 'inline-block' }} />
              <span>Cảnh báo (WARNING)</span>
            </button>

            <button
              type="button"
              className={`finance-filter-chip ${categoryFilter === 'CONTACT_SOCIAL' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(categoryFilter === 'CONTACT_SOCIAL' ? '' : 'CONTACT_SOCIAL')
                setPage(0)
              }}
            >
              <span>Liên hệ & MXH</span>
            </button>

            <button
              type="button"
              className={`finance-filter-chip ${categoryFilter === 'PROFANITY_VI' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(categoryFilter === 'PROFANITY_VI' ? '' : 'PROFANITY_VI')
                setPage(0)
              }}
            >
              <span>Từ tục tiếng Việt</span>
            </button>

            <button
              type="button"
              className={`finance-filter-chip ${categoryFilter === 'SCORE_GUARANTEE' ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(categoryFilter === 'SCORE_GUARANTEE' ? '' : 'SCORE_GUARANTEE')
                setPage(0)
              }}
            >
              <span>Cam kết điểm</span>
            </button>

            <button
              type="button"
              className={`finance-filter-chip ${activeFilter === 'true' ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter(activeFilter === 'true' ? '' : 'true')
                setPage(0)
              }}
            >
              <CheckCircle2 size={13} style={{ color: 'var(--c-success)' }} />
              <span>Đang BẬT</span>
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <X size={14} />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BẢNG DỮ LIỆU TỪ ĐIỂN KIỂM DUYỆT */}
      {/* ========================================================================= */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
          <RefreshCw size={26} className="spinner" style={{ color: 'var(--accent)', margin: '0 auto' }} />
          <p style={{ marginTop: 12, color: 'var(--text-dim)', fontSize: 14 }}>Đang tải danh sách từ điển kiểm duyệt...</p>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border)' }}>
          <Tag size={40} style={{ color: 'var(--border)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Không tìm thấy từ khóa nào</div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>
            {hasActiveFilters ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc' : 'Chưa có từ khóa nào trong danh mục'}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              style={{ marginTop: 14 }}
              onClick={handleClearFilters}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>#</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('pattern')}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>Từ khóa / Mẫu biểu thức</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'pattern' ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </div>
                </th>
                <th style={{ textAlign: 'center', width: 110 }}>Kiểu khớp</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('category')}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>Danh mục vi phạm</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'category' ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </div>
                </th>
                <th style={{ textAlign: 'center', width: 130, cursor: 'pointer' }} onClick={() => toggleSort('severity')}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <span>Mức độ</span>
                    <ArrowUpDown size={12} style={{ color: sortField === 'severity' ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </div>
                </th>
                <th style={{ textAlign: 'center', width: 120 }}>Phạm vi</th>
                <th style={{ textAlign: 'center', width: 120 }}>Trạng thái</th>
                <th>Ghi chú kiểm duyệt</th>
                <th style={{ textAlign: 'center', width: 120 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const isRegex = item.matchType === 'REGEX'
                const catInfo = getCategoryInfo(item.category)
                const severityClass =
                  item.severity === 'ERROR' ? 'rejected' :
                  item.severity === 'WARNING' ? 'pending' : 'paid'

                return (
                  <tr
                    key={item.id}
                    className="admin-interactive-row"
                    style={{ opacity: item.active ? 1 : 0.6 }}
                  >
                    {/* Số thứ tự */}
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                      {page * pageSize + index + 1}
                    </td>

                    {/* Từ khóa / Mẫu Regex */}
                    <td>
                      <div className="lexicon-pattern-wrap">
                        <div
                          className={`lexicon-pattern-code ${isRegex ? 'is-regex' : ''}`}
                          onClick={() => copyToClipboard(item.pattern)}
                          title="Bấm để sao chép từ khóa / chuỗi regex"
                        >
                          <span>{item.pattern}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.pattern)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 2,
                            color: copiedPattern === item.pattern ? 'var(--c-success)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Sao chép"
                        >
                          {copiedPattern === item.pattern ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>

                    {/* Kiểu khớp */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`lexicon-type-pill ${item.matchType?.toLowerCase()}`}>
                        {isRegex && <Code size={11} style={{ marginRight: 2 }} />}
                        <span>{item.matchType === 'WORD' ? 'Từ đơn' : item.matchType === 'PHRASE' ? 'Cụm từ' : 'Regex'}</span>
                      </span>
                    </td>

                    {/* Danh mục */}
                    <td>
                      <span className={`lexicon-cat-tag ${catInfo.colorClass}`} title={item.category}>
                        <span>{catInfo.label}</span>
                      </span>
                    </td>

                    {/* Mức độ */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`admin-status-pill ${severityClass}`}>
                        <span className="status-dot" />
                        <span>{item.severity}</span>
                      </span>
                    </td>

                    {/* Phạm vi */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="lexicon-scope-tag" title={`Áp dụng cho: ${item.scope}`}>
                        {getScopeLabel(item.scope)}
                      </span>
                    </td>

                    {/* Trạng thái BẬT / TẮT (Toggle switch) */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={`lexicon-toggle-btn ${item.active ? 'is-active' : 'is-inactive'}`}
                        onClick={() => handleToggleActive(item)}
                        title="Bấm để bật / tắt quy tắc kiểm duyệt này"
                      >
                        {item.active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{item.active ? 'Bật' : 'Tắt'}</span>
                      </button>
                    </td>

                    {/* Ghi chú */}
                    <td>
                      <div
                        style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 240, lineHeight: 1.4 }}
                        className="line-clamp-2"
                        title={item.note || 'Không có ghi chú'}
                      >
                        {item.note || '—'}
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="admin-action-btn-primary"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => handleOpenEdit(item)}
                          title="Chỉnh sửa từ khóa"
                        >
                          <Edit2 size={13} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn-danger"
                          style={{ padding: '5px 8px', fontSize: 12 }}
                          onClick={() => handleDelete(item)}
                          title="Xóa khỏi từ điển"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHÂN TRANG & SỐ LƯỢNG MỤC */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '0 4px', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            Hiển thị <strong>{items.length}</strong> / <strong>{totalElements}</strong> mục từ điển
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
            <span>Số dòng:</span>
            <select
              className="admin-select"
              style={{ padding: '3px 8px', fontSize: 12, height: 28 }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={15} />
              <span>Trước</span>
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', padding: '0 8px' }}>
              Trang {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn-secondary sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Sau</span>
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM / CHỈNH SỬA TỪ KHÓA KIỂM DUYỆT */}
      {/* ========================================================================= */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          title={editingItem ? 'Chỉnh sửa từ khóa kiểm duyệt' : 'Thêm từ khóa mới vào từ điển'}
          onClose={() => setModalOpen(false)}
          width={580}
        >
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Danh mục */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Danh mục vi phạm <span style={{ color: 'var(--c-danger)' }}>*</span>
                </label>
                <select
                  className="admin-select"
                  style={{ width: '100%' }}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  {CATEGORY_OPTIONS.filter((c) => c.value).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kiểu khớp & Mức độ nghiêm trọng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Kiểu khớp <span style={{ color: 'var(--c-danger)' }}>*</span>
                  </label>
                  <select
                    className="admin-select"
                    style={{ width: '100%' }}
                    value={formData.matchType}
                    onChange={(e) => setFormData({ ...formData, matchType: e.target.value })}
                  >
                    <option value="WORD">Từ đơn (WORD - ranh giới từ)</option>
                    <option value="PHRASE">Cụm từ (PHRASE)</option>
                    <option value="REGEX">Biểu thức chính quy (REGEX)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Mức độ nghiêm trọng <span style={{ color: 'var(--c-danger)' }}>*</span>
                  </label>
                  <select
                    className="admin-select"
                    style={{ width: '100%' }}
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="ERROR">ERROR (Chặn phê duyệt / Bắt buộc sửa)</option>
                    <option value="WARNING">WARNING (Cảnh báo xem xét)</option>
                    <option value="INFO">INFO (Thông tin tham khảo)</option>
                    <option value="CONTEXT">CONTEXT (Cần ngữ cảnh LLM)</option>
                  </select>
                </div>
              </div>

              {/* Mẫu gợi ý nhanh nếu là REGEX */}
              {formData.matchType === 'REGEX' && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
                    Mẫu Regex thường dùng:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { label: 'Số điện thoại VN', pattern: '(?<!\\d)(?:\\+?84|0)(?:[\\s.\\-]?\\d){8,10}(?!\\d)' },
                      { label: 'Tài khoản MXH (@handle)', pattern: '(?<![\\w.])@[A-Za-z0-9_.]{3,}' },
                      { label: 'Website / Đường link URL', pattern: 'https?://[^\\s<>\'"]+|www\\.[^\\s<>\'"]+' },
                      { label: 'Cam kết điểm TOEIC', pattern: '\\b(?:cam\\s*kết|đảm\\s*bảo)\\s*(?:\\d{3}\\+|toeic)\\b' }
                    ].map((sample) => (
                      <button
                        key={sample.label}
                        type="button"
                        className="modal-preset-chip"
                        onClick={() => {
                          setFormData({ ...formData, pattern: sample.pattern, matchType: 'REGEX' })
                        }}
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Từ khóa / Biểu thức Regex */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Từ khóa hoặc Biểu thức Regex <span style={{ color: 'var(--c-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="search-input-wrap"
                  style={{
                    width: '100%',
                    fontFamily: formData.matchType === 'REGEX' ? 'monospace' : 'inherit',
                    fontSize: 14,
                    padding: '9px 12px',
                    boxSizing: 'border-box'
                  }}
                  placeholder={formData.matchType === 'REGEX' ? 'ví dụ: (?<!\\d)0\\d{9}(?!\\d)' : 'ví dụ: cờ bạc online'}
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  required
                />

                {/* Live Regex Validation Feedback */}
                {formData.matchType === 'REGEX' && formData.pattern && (
                  <div className={`regex-validator-box ${regexError ? 'invalid' : 'valid'}`}>
                    {regexError ? (
                      <>
                        <AlertCircle size={14} />
                        <span>Cú pháp Regex lỗi: {regexError}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Cú pháp Regex hợp lệ</span>
                      </>
                    )}
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                  Hệ thống tự động hỗ trợ chống lách luật (leetspeak, dấu chen giữa, khoảng trắng cố ý).
                </div>
              </div>

              {/* Phạm vi áp dụng & Ngôn ngữ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Phạm vi áp dụng (Scope)
                  </label>
                  <select
                    className="admin-select"
                    style={{ width: '100%' }}
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  >
                    <option value="ALL">Toàn bộ khóa học (ALL)</option>
                    <option value="TITLE_DESC">Tiêu đề & Mô tả (TITLE_DESC)</option>
                    <option value="BODY">Nội dung bài học (BODY)</option>
                    <option value="QUESTION">Câu hỏi & Lựa chọn (QUESTION)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Ngôn ngữ
                  </label>
                  <select
                    className="admin-select"
                    style={{ width: '100%' }}
                    value={formData.lang}
                    onChange={(e) => setFormData({ ...formData, lang: e.target.value })}
                  >
                    <option value="vi">Tiếng Việt (vi)</option>
                    <option value="en">Tiếng Anh (en)</option>
                  </select>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Ghi chú kiểm duyệt
                </label>
                <input
                  type="text"
                  className="search-input-wrap"
                  style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}
                  placeholder="Lý do đưa từ này vào danh mục kiểm duyệt..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              {/* Checkbox Kích hoạt */}
              <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                  />
                  <span>Kích hoạt quy tắc kiểm duyệt này ngay lập tức</span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="admin-action-btn-primary"
                disabled={saving || Boolean(regexError)}
                style={{ padding: '8px 20px', fontSize: 14 }}
              >
                {saving ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm vào từ điển'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
