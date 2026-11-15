import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Clock, FileText, CheckCircle2, User, Play, RotateCcw, Award, BookOpen } from 'lucide-react'
import { listTests, getMyTestAttempts } from '@student/api/tests.js'
import Skeleton from '@shared/components/ui/Skeleton.jsx'
import EmptyState from '@shared/components/ui/EmptyState.jsx'
import anhDeThiImg from '@/assets/banners/anhDeThi.png'
import '@student/components/tests/tests.css'

export default function TestListPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('LIBRARY') // LIBRARY | HISTORY
  const [tests, setTests] = useState([])
  const [myAttempts, setMyAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('ALL') // ALL | SYSTEM | COMMUNITY
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sourceFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'LIBRARY') {
        const params = {
          source: sourceFilter === 'ALL' ? undefined : sourceFilter,
        }
        const data = await listTests(params)
        setTests(data?.content || data || [])
      } else {
        const data = await getMyTestAttempts({ size: 20 })
        setMyAttempts(data?.content || data || [])
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu đề thi:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTests = useMemo(() => {
    if (!searchTerm.trim()) return tests
    const q = searchTerm.toLowerCase().trim()
    return tests.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.authorName?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    )
  }, [tests, searchTerm])

  return (
    <div className="tests-container">
      {/* Banner giới thiệu thư viện đề */}
      <div className="tests-header-banner">
        <img
          src={anhDeThiImg}
          alt="Banner Thư viện đề thi TOEIC"
          className="tests-banner-bg-img"
        />
        <div className="tests-banner-content">
          <h1 className="tests-banner-title">Thư viện đề thi TOEIC</h1>
          <p className="tests-banner-desc">
            Rèn luyện kỹ năng với đề thi chuẩn định dạng ETS 120 phút hoặc tùy chọn luyện tập theo từng Part. Hệ thống tự động chấm điểm và quy đổi thang điểm TOEIC 10–990.
          </p>
        </div>
      </div>

      {/* Tabs chuyển đổi Thư viện đề / Lịch sử của tôi */}
      <div className="tests-filter-bar">
        <div className="tests-tabs-group">
          <button
            type="button"
            className={`tests-tab-btn ${activeTab === 'LIBRARY' ? 'active' : ''}`}
            onClick={() => setActiveTab('LIBRARY')}
          >
            <BookOpen size={16} />
            <span>Thư viện đề thi</span>
          </button>
          <button
            type="button"
            className={`tests-tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            <RotateCcw size={16} />
            <span>Lịch sử làm bài</span>
          </button>
        </div>

        {activeTab === 'LIBRARY' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Ô tìm kiếm */}
            <div className="tests-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm đề thi theo tên hoặc tác giả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter nguồn đề */}
            <div className="tests-tabs-group">
              <button
                type="button"
                className={`tests-tab-btn ${sourceFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setSourceFilter('ALL')}
              >
                Tất cả nguồn
              </button>
              <button
                type="button"
                className={`tests-tab-btn ${sourceFilter === 'SYSTEM' ? 'active' : ''}`}
                onClick={() => setSourceFilter('SYSTEM')}
              >
                Đề Hệ thống
              </button>
              <button
                type="button"
                className={`tests-tab-btn ${sourceFilter === 'COMMUNITY' ? 'active' : ''}`}
                onClick={() => setSourceFilter('COMMUNITY')}
              >
                Đề Cộng đồng
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nội dung danh sách */}
      {loading ? (
        <div className="tests-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="test-card">
              <Skeleton width="40%" height={20} style={{ marginBottom: 12 }} />
              <Skeleton width="80%" height={24} style={{ marginBottom: 8 }} />
              <Skeleton width="60%" height={16} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={36} />
            </div>
          ))}
        </div>
      ) : activeTab === 'LIBRARY' ? (
        filteredTests.length === 0 ? (
          <EmptyState
            title="Chưa tìm thấy đề thi phù hợp"
            description="Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn nguồn đề khác."
          />
        ) : (
          <div className="tests-grid">
            {filteredTests.map((test) => (
              <div key={test.id} className="test-card">
                <div className="test-card-badges">
                  <span
                    className={`badge-source ${
                      test.source === 'SYSTEM' ? 'badge-source-system' : 'badge-source-community'
                    }`}
                  >
                    {test.source === 'SYSTEM' ? 'Hệ thống' : 'Cộng đồng'}
                  </span>
                  <span className="part-pill">Phiên bản {test.version || 1}</span>
                </div>

                <h3 className="test-card-title">{test.title}</h3>
                <div className="test-card-author">
                  Biên soạn bởi: <strong>{test.authorName || 'Hệ thống'}</strong>
                </div>

                <div className="test-card-meta">
                  <div className="test-card-meta-item">
                    <Clock size={14} />
                    <span>{test.totalMinutes || 120} phút</span>
                  </div>
                  <div className="test-card-meta-item">
                    <FileText size={14} />
                    <span>{test.totalQuestions || 200} câu</span>
                  </div>
                </div>

                {/* Các Part có trong đề */}
                <div className="test-card-parts">
                  {(test.parts || []).map((p) => (
                    <span key={p.partNo} className="part-pill">
                      Part {p.partNo} ({p.questionCount}c)
                    </span>
                  ))}
                </div>

                <div className="test-card-footer">
                  <span className="test-card-attempts">
                    {test.attemptCount || 0} lượt thi
                  </span>
                  <button
                    type="button"
                    className="btn-test-action"
                    onClick={() => navigate(`/tests/${test.id}`)}
                  >
                    <Play size={14} />
                    <span>Làm bài</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Tab Lịch sử làm bài */
        myAttempts.length === 0 ? (
          <EmptyState
            title="Bạn chưa có lượt làm bài thi nào"
            description="Hãy chọn một đề thi trong thư viện để thử sức và theo dõi tiến độ của bạn."
            action={
              <button
                type="button"
                className="btn-test-action"
                onClick={() => setActiveTab('LIBRARY')}
              >
                Khám phá đề thi ngay
              </button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myAttempts.map((att) => (
              <div
                key={att.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: att.status === 'COMPLETED' ? 'var(--good-soft)' : 'var(--warn-soft)',
                        color: att.status === 'COMPLETED' ? 'var(--good)' : 'var(--warn)',
                        fontWeight: 600,
                      }}
                    >
                      {att.status === 'COMPLETED' ? 'Đã hoàn thành' : att.status === 'TIMED_OUT' ? 'Hết giờ' : 'Đang làm'}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                      Chế độ: {att.mode === 'FULL' ? 'Thi thử (Full test)' : 'Luyện tập'}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 16, color: 'var(--text)' }}>
                    {att.testTitle}
                  </h4>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                    Bắt đầu lúc: {att.startedAt ? new Date(att.startedAt).toLocaleString('vi-VN') : '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'right' }}>
                    {att.scoreTotal != null ? (
                      <div>
                        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                          {att.scoreTotal}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}> / 990</span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Nghe: {att.scoreListening} • Đọc: {att.scoreReading}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                          {att.totalCorrect || 0} / {att.totalQuestions || 0}
                        </span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Câu đúng</div>
                      </div>
                    )}
                  </div>

                  {att.status === 'IN_PROGRESS' ? (
                    <button
                      type="button"
                      className="btn-test-action"
                      onClick={() => navigate(`/tests/attempts/${att.id}`)}
                    >
                      <RotateCcw size={14} />
                      <span>Làm tiếp</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={{
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        padding: '7px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onClick={() => navigate(`/tests/attempts/${att.id}/result`)}
                    >
                      <Award size={14} />
                      <span>Xem kết quả</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
