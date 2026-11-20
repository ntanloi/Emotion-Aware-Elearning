import { Component } from 'react'

/**
 * Bắt lỗi render của trang con để không bị trắng toàn màn hình.
 * Tự reset khi người dùng chuyển sang trang khác (resetKey đổi).
 */
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[RouteErrorBoundary]', error, info?.componentStack)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Trang này gặp sự cố</h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
          Có lỗi xảy ra khi hiển thị nội dung. Bạn có thể tải lại trang hoặc quay về trang chủ.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
          >
            Tải lại trang
          </button>
          <a
            href="/"
            style={{ padding: '8px 16px', borderRadius: 8, background: '#4f46e5', color: '#fff', textDecoration: 'none' }}
          >
            Về trang chủ
          </a>
        </div>
      </div>
    )
  }
}
