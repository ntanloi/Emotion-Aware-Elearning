import { useState, useMemo, useEffect } from 'react'
import FlashcardCard from '@shared/components/FlashcardCard.jsx'
import ConfirmDeleteModal from '@teacher/components/ConfirmDeleteModal.jsx'
import VocabWordModal from '@teacher/components/modals/VocabWordModal.jsx'
import { useVocabLibraryPage, useDeleteVocabWord } from '@teacher/hooks/useTeacherVocabWords.js'
import {
  Plus,
  Library,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
} from 'lucide-react'

const POS_FILTERS = [
  { value: 'ALL', label: 'Tất cả từ loại' },
  { value: 'NOUN', label: 'Danh từ (N)' },
  { value: 'VERB', label: 'Động từ (V)' },
  { value: 'ADJECTIVE', label: 'Tính từ (Adj)' },
  { value: 'ADVERB', label: 'Trạng từ (Adv)' },
  { value: 'PHRASE', label: 'Cụm từ (Phrase)' },
]

const PAGE_SIZE_OPTIONS = [12, 24, 36]

/**
 * TeacherVocabLibraryPage — quản lý TOÀN BỘ từ vựng của giáo viên.
 * Hoàn toàn Phân trang Server-side (Server-side Pagination):
 * Nhấn qua page nào thì CHỈ LOAD đúng dữ liệu của page đó từ database/backend,
 * không tải trước hàng loạt, tiết kiệm tối đa đọc ghi dữ liệu và credit trên Cloudinary.
 */
export default function TeacherVocabLibraryPage() {
  const deleteWord = useDeleteVocabWord()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [posFilter, setPosFilter] = useState('ALL')
  const [pageIndex, setPageIndex] = useState(0) // 0-indexed cho Spring Data Pageable
  const [pageSize, setPageSize] = useState(12)

  const [wordModal, setWordModal] = useState({ open: false, word: null })
  const [deletingWord, setDeletingWord] = useState(null)

  // Debounce tìm kiếm 350ms để không gọi API liên tục mỗi khi gõ phím
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPageIndex(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Lấy dữ liệu phân trang từ Server theo đúng pageIndex, pageSize, search, filter hiện tại
  const {
    data: pageData,
    isLoading,
    isFetching,
    refetch,
  } = useVocabLibraryPage({
    page: pageIndex,
    size: pageSize,
    search: debouncedSearch,
    partOfSpeech: posFilter,
  })

  // Dữ liệu từ Spring Data Page
  const words = pageData?.content || []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)
  const displayPage = pageIndex + 1

  const handlePageChange = (newPageNum) => {
    const newIdx = newPageNum - 1
    if (newIdx >= 0 && newIdx < totalPages && newIdx !== pageIndex) {
      setPageIndex(newIdx)
      const el = document.getElementById('vocab-library-section')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 80, behavior: 'smooth' })
      }
    }
  }

  const handlePosChange = (newPos) => {
    setPosFilter(newPos)
    setPageIndex(0)
  }

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize)
    setPageIndex(0)
  }

  // Danh sách các số trang cần hiển thị trên thanh điều hướng
  const pageNumbers = useMemo(() => {
    const pages = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      let start = Math.max(1, displayPage - 2)
      let end = Math.min(totalPages, start + maxVisible - 1)
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1)
      }
      for (let i = start; i <= end; i++) pages.push(i)
    }
    return pages
  }, [totalPages, displayPage])

  const startIndex = totalElements > 0 ? pageIndex * pageSize + 1 : 0
  const endIndex = Math.min((pageIndex + 1) * pageSize, totalElements)

  return (
    <div className="vocab-library-container">
      {/* Thanh tiêu đề chính */}
      <div className="teacher-toolbar" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ margin: 0 }}>Thư viện từ vựng</h2>
            {totalElements > 0 && (
              <span className="badge neutral" style={{ fontSize: 12 }}>
                {totalElements} từ
              </span>
            )}
          </div>
          <p className="text-dim text-sm" style={{ marginTop: 4 }}>
            Quản lý kho từ vựng cá nhân — tải theo từng trang theo yêu cầu để tối ưu hóa tài nguyên.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Tải lại dữ liệu trang hiện tại"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px' }}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setWordModal({ open: true, word: null })}
          >
            <Plus size={16} />
            <span>Tạo từ mới</span>
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="vocab-lib-filter-bar card" style={{ padding: '14px 18px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* Ô tìm kiếm */}
          <div className="teacher-search-box" style={{ flex: '1 1 280px', maxWidth: 420 }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo từ, phiên âm hoặc nghĩa..."
            />
            {searchInput && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => {
                  setSearchInput('')
                  setDebouncedSearch('')
                  setPageIndex(0)
                }}
                title="Xóa tìm kiếm"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Lọc loại từ & Cấu hình phân trang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal size={14} style={{ color: 'var(--text-dim)' }} />
              <select
                className="teacher-select sm"
                value={posFilter}
                onChange={(e) => handlePosChange(e.target.value)}
              >
                {POS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
              <span>Hiển thị:</span>
              <select
                className="teacher-select sm"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                title="Số thẻ load từ server cho mỗi trang"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} từ / trang
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Thông tin số lượng kết quả */}
        {totalElements > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 12,
              paddingTop: 10,
              borderTop: '1px solid var(--border)',
              fontSize: 12.5,
              color: 'var(--text-dim)',
            }}
          >
            <span>
              Đang hiển thị <strong>{startIndex} - {endIndex}</strong> trong tổng số <strong>{totalElements}</strong> từ vựng
              {(debouncedSearch || posFilter !== 'ALL') && ` (kết quả lọc)`}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {isFetching && <Loader2 size={13} className="spin" style={{ color: 'var(--accent)' }} />}
              <span>
                Trang <strong>{displayPage}</strong> / <strong>{totalPages}</strong>
              </span>
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <p className="text-dim">Đang tải dữ liệu từ vựng từ máy chủ...</p>
        </div>
      )}

      {/* Trạng thái trống */}
      {!isLoading && words.length === 0 && (
        <div className="empty-state mt-16">
          <div className="icon">
            <Library size={24} />
          </div>
          <p>
            {totalElements === 0 && (debouncedSearch || posFilter !== 'ALL')
              ? 'Không tìm thấy từ nào phù hợp với điều kiện tìm kiếm.'
              : 'Bạn chưa có từ vựng nào trong thư viện. Bấm "+ Tạo từ mới" để bắt đầu.'}
          </p>
          {(debouncedSearch || posFilter !== 'ALL') && (
            <button
              type="button"
              className="btn secondary sm mt-8"
              onClick={() => {
                setSearchInput('')
                setDebouncedSearch('')
                setPosFilter('ALL')
                setPageIndex(0)
              }}
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      )}

      {/* LƯỚI TỪ VỰNG: Chỉ hiển thị các từ của trang đang được load */}
      {!isLoading && words.length > 0 && (
        <>
          <div className="vocab-set-grid mt-16" style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity 0.2s' }}>
            {words.map((w) => (
              <div key={w.id} className="vocab-word-tile editable-block">
                <div className="editable-actions">
                  <button type="button" onClick={() => setWordModal({ open: true, word: w })} title="Sửa từ này">
                    <Pencil size={13} />
                  </button>
                  <button type="button" className="danger" onClick={() => setDeletingWord(w)} title="Xoá khỏi thư viện">
                    <Trash2 size={13} />
                  </button>
                </div>
                <FlashcardCard
                  key={w.id}
                  word={w.word}
                  ipa={w.ipa}
                  partOfSpeech={w.partOfSpeech}
                  meaningVi={w.meaningVi}
                  imageUrl={w.imageUrl}
                  audioUkUrl={w.audioUkUrl}
                  audioUsUrl={w.audioUsUrl}
                  examples={w.examples}
                />
              </div>
            ))}
          </div>

          {/* THANH ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION) */}
          {totalPages > 1 && (
            <div className="vocab-pagination-bar">
              <div className="vocab-pagination-info">
                <span>
                  Trang {displayPage} / {totalPages} (Tổng {totalElements} từ)
                </span>
              </div>

              <div className="vocab-pagination-controls">
                {/* Trang đầu */}
                <button
                  type="button"
                  className="vocab-page-btn"
                  onClick={() => handlePageChange(1)}
                  disabled={displayPage === 1 || isFetching}
                  title="Về trang đầu"
                >
                  <ChevronsLeft size={16} />
                </button>

                {/* Trang trước */}
                <button
                  type="button"
                  className="vocab-page-btn"
                  onClick={() => handlePageChange(displayPage - 1)}
                  disabled={displayPage === 1 || isFetching}
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Các nút số trang */}
                {pageNumbers[0] > 1 && (
                  <>
                    <button
                      type="button"
                      className="vocab-page-btn"
                      onClick={() => handlePageChange(1)}
                      disabled={isFetching}
                    >
                      1
                    </button>
                    {pageNumbers[0] > 2 && <span className="vocab-page-ellipsis">...</span>}
                  </>
                )}

                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`vocab-page-btn ${num === displayPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(num)}
                    disabled={isFetching}
                  >
                    {num}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                      <span className="vocab-page-ellipsis">...</span>
                    )}
                    <button
                      type="button"
                      className="vocab-page-btn"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={isFetching}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                {/* Trang sau */}
                <button
                  type="button"
                  className="vocab-page-btn"
                  onClick={() => handlePageChange(displayPage + 1)}
                  disabled={displayPage === totalPages || isFetching}
                  title="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>

                {/* Trang cuối */}
                <button
                  type="button"
                  className="vocab-page-btn"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={displayPage === totalPages || isFetching}
                  title="Đến trang cuối"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal sửa / tạo từ */}
      <VocabWordModal
        open={wordModal.open}
        word={wordModal.word}
        onClose={() => setWordModal({ open: false, word: null })}
      />

      {/* Modal xác nhận xóa */}
      <ConfirmDeleteModal
        open={!!deletingWord}
        title="Xoá từ vựng"
        description={`Xoá hẳn "${deletingWord?.word}" khỏi thư viện? Từ này sẽ biến mất khỏi TẤT CẢ các Bộ từ vựng đang dùng nó.`}
        onClose={() => setDeletingWord(null)}
        onConfirm={() => deleteWord.mutateAsync(deletingWord.id)}
      />
    </div>
  )
}
