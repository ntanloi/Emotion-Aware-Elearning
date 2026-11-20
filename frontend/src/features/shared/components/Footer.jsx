import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react'
import Modal from './ui/Modal.jsx'

import { getVnYear } from '@shared/utils/dateTime.js'
/**
 * Footer - Thiết kế chân trang đa cột hiện đại chuẩn SaaS / EdTech
 * Tối ưu hóa hiển thị trên Desktop, Tablet và Mobile.
 * Tích hợp hệ thống thông tin quy chuẩn, bảo mật cảm xúc và liên kết điều hướng nhanh.
 */
export default function Footer() {
  const [modalType, setModalType] = useState(null)

  const closeModal = () => setModalType(null)

  return (
    <footer className="app-footer no-print">
      {/* Khối nội dung chính (4 Cột) */}
      <div className="app-footer-main">
        <div className="app-footer-container">
          <div className="app-footer-grid">
            {/* Cột 1: Thương hiệu & Sứ mệnh */}
            <div className="app-footer-col app-footer-col-brand">
              <Link to="/courses" className="app-footer-brand-logo">
                <span className="navbar-brand-badge">
                  <GraduationCap size={18} strokeWidth={2.2} />
                </span>
                <span className="app-footer-brand-name">E-Learning AI</span>
              </Link>

              <p className="app-footer-brand-desc">
                Hệ thống học tiếng Anh và luyện thi TOEIC tiên phong kết hợp Trí tuệ nhân tạo nhận diện cảm xúc. 
                Giúp người học duy trì động lực, phát hiện lỗ hổng kiến thức và bứt phá điểm số hiệu quả.
              </p>

              <div className="app-footer-badges">
                <span className="app-footer-badge">AI Emotion-Aware</span>
                <span className="app-footer-badge">ETS Standard</span>
                <span className="app-footer-badge">KLTN 2026</span>
              </div>

              <div className="app-footer-status">
                <span className="app-footer-status-indicator" />
                <span>Hệ thống máy chủ vận hành ổn định</span>
              </div>
            </div>

            {/* Cột 2: Học viên & Luyện thi */}
            <div className="app-footer-col">
              <h4 className="app-footer-col-title">Học tập & Luyện thi</h4>
              <ul className="app-footer-links">
                <li>
                  <Link to="/courses">
                    <ChevronRight size={13} />
                    <span>Khóa học TOEIC toàn diện</span>
                  </Link>
                </li>
                <li>
                  <Link to="/tests">
                    <ChevronRight size={13} />
                    <span>Thư viện đề thi thử ETS</span>
                  </Link>
                </li>
                <li>
                  <Link to="/flashcards/review">
                    <ChevronRight size={13} />
                    <span>Ôn tập Flashcards thông minh</span>
                  </Link>
                </li>
                <li>
                  <Link to="/reports">
                    <ChevronRight size={13} />
                    <span>Báo cáo học tập & Cảm xúc</span>
                  </Link>
                </li>
                <li>
                  <Link to="/wallet">
                    <ChevronRight size={13} />
                    <span>Ví học tập & Hoàn phí</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cột 3: Giảng viên & Hợp tác */}
            <div className="app-footer-col">
              <h4 className="app-footer-col-title">Giảng viên & Đào tạo</h4>
              <ul className="app-footer-links">
                <li>
                  <Link to="/dashboard/teacher">
                    <ChevronRight size={13} />
                    <span>Bảng điều khiển Giảng viên</span>
                  </Link>
                </li>
                <li>
                  <Link to="/teacher/courses">
                    <ChevronRight size={13} />
                    <span>Quản lý bài giảng & Khóa học</span>
                  </Link>
                </li>
                <li>
                  <Link to="/teacher/tests">
                    <ChevronRight size={13} />
                    <span>Biên soạn & Quản lý đề thi</span>
                  </Link>
                </li>
                <li>
                  <button type="button" className="app-footer-link-btn" onClick={() => setModalType('revenue')}>
                    <ChevronRight size={13} />
                    <span>Chính sách chia sẻ doanh thu</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="app-footer-link-btn" onClick={() => setModalType('criteria')}>
                    <ChevronRight size={13} />
                    <span>Tiêu chuẩn kiểm duyệt nội dung</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Cột 4: Hỗ trợ & Thông tin liên hệ */}
            <div className="app-footer-col">
              <h4 className="app-footer-col-title">Hỗ trợ & Liên hệ</h4>
              <div className="app-footer-contact-list">
                <div className="app-footer-contact-item">
                  <Mail size={15} />
                  <span>support@elearning-ai.edu.vn</span>
                </div>
                <div className="app-footer-contact-item">
                  <Phone size={15} />
                  <span>Tổng đài: 1900 6868 (08:00 - 21:00)</span>
                </div>
                <div className="app-footer-contact-item">
                  <MapPin size={15} />
                  <span>Khu phố 6, P. Linh Trung, TP. Thủ Đức, TP.HCM</span>
                </div>
              </div>

              <div className="app-footer-support-note">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 2 }}>
                  <Clock size={13} />
                  <span>Thời gian tiếp nhận hỗ trợ</span>
                </div>
                <div>Thứ Hai – Thứ Bảy (08:00 – 21:00). Giải quyết yêu cầu kỹ thuật trong vòng 24 giờ làm việc.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Thanh bản quyền & Liên kết pháp lý dưới cùng */}
      <div className="app-footer-bottom">
        <div className="app-footer-container app-footer-bottom-flex">
          <div className="app-footer-copyright">
            © {getVnYear()} <strong>E-Learning AI</strong>. Tất cả quyền được bảo lưu. Khóa luận tốt nghiệp Hệ thống E-Learning thích ứng cảm xúc.
          </div>

          <div className="app-footer-legal-links">
            <button type="button" className="app-footer-legal-btn" onClick={() => setModalType('privacy')}>
              Chính sách bảo mật
            </button>
            <span className="app-footer-legal-sep">•</span>
            <button type="button" className="app-footer-legal-btn" onClick={() => setModalType('terms')}>
              Điều khoản sử dụng
            </button>
            <span className="app-footer-legal-sep">•</span>
            <button type="button" className="app-footer-legal-btn" onClick={() => setModalType('ethics')}>
              Đạo đức AI &amp; Trách nhiệm
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Chính sách bảo mật & Dữ liệu cảm xúc */}
      <Modal
        open={modalType === 'privacy'}
        title="Chính sách Bảo mật & Dữ liệu Cảm xúc"
        onClose={closeModal}
        width={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, color: 'var(--text-dim, #475569)', lineHeight: 1.6 }}>
          <div style={{ background: 'var(--surface-2, #f8fafc)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border, #e2e8f0)' }}>
            <strong style={{ color: 'var(--text, #0f172a)' }}>Cam kết bảo vệ quyền riêng tư học viên:</strong>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              Hệ thống E-Learning AI ứng dụng công nghệ thị giác máy tính nhằm hỗ trợ người học theo dõi mức độ tập trung, tuyệt đối không phục vụ mục đích thương mại hóa hay thu thập thông tin cá nhân trái phép.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Xử lý phân tích tại chỗ:</strong> Luồng video từ webcam của người học chỉ được trích xuất tọa độ điểm đặc trưng cảm xúc (Face Landmarks) trên bộ nhớ tạm thời của trình duyệt hoặc luồng kiểm thử.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Không lưu trữ video/hình ảnh thô:</strong> Máy chủ hoàn toàn KHÔNG lưu giữ tệp video, ảnh chụp khuôn mặt hay bất kỳ dữ liệu sinh trắc học nhận dạng cá nhân nào.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Chỉ số thống kê ẩn danh:</strong> Cơ sở dữ liệu chỉ ghi nhận chỉ số thống kê tổng hợp (tỷ lệ tập trung %, bối rối %) gắn với mốc thời gian bài học để giảng viên đánh giá chất lượng truyền tải.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Quyền tự quyết của người học:</strong> Học viên có toàn quyền bật hoặc tắt camera nhận diện cảm xúc bất cứ lúc nào trong thanh công cụ bài học.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={closeModal} style={{ padding: '8px 18px', fontSize: 13 }}>
              Đã hiểu &amp; Đồng ý
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Điều khoản sử dụng */}
      <Modal
        open={modalType === 'terms'}
        title="Điều khoản Dịch vụ & Sử dụng"
        onClose={closeModal}
        width={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, color: 'var(--text-dim, #475569)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Bản quyền nội dung:</strong> Toàn bộ video bài giảng, hệ thống câu hỏi đề thi và tài liệu học tập được bảo hộ quyền tác giả của Giảng viên và Nền tảng E-Learning AI. Nghiêm cấm mọi hành vi sao chép, tải về phát tán trái phép.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Tài khoản cá nhân:</strong> Mỗi tài khoản đăng ký chỉ phục vụ một học viên duy nhất. Hệ thống có quyền tạm khóa nếu phát hiện hành vi dùng chung tài khoản bất thường.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Chính sách ví &amp; Hoàn tiền:</strong> Số dư trong Ví học tập có thể dùng đăng ký khóa học mới hoặc rút về tài khoản ngân hàng thụ hưởng theo quy chế giao dịch minh bạch.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={closeModal} style={{ padding: '8px 18px', fontSize: 13 }}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Đạo đức AI & Trách nhiệm */}
      <Modal
        open={modalType === 'ethics'}
        title="Tiêu chuẩn Đạo đức AI & Trách nhiệm"
        onClose={closeModal}
        width={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, color: 'var(--text-dim, #475569)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>AI làm trợ lý, không thay thế con người:</strong> Các mô hình trí tuệ nhân tạo chỉ đóng vai trò phân tích tín hiệu cảm xúc và đề xuất nội dung ôn tập thích ứng, con người luôn là trung tâm làm chủ việc học.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Công bằng &amp; Không thiên kiến:</strong> Thuật toán nhận diện biểu cảm được tối ưu hóa để tương thích với đa dạng góc quay, ánh sáng và cử chỉ tự nhiên của học viên mà không tạo ra định kiến.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Quy trình kiểm duyệt bắt buộc:</strong> Mọi bài giảng và câu hỏi do AI hỗ trợ biên soạn đều phải trải qua bước kiểm duyệt của Quản trị viên và Giảng viên trước khi đến tay học viên.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={closeModal} style={{ padding: '8px 18px', fontSize: 13 }}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Chính sách chia sẻ doanh thu */}
      <Modal
        open={modalType === 'revenue'}
        title="Chính sách Chia sẻ Doanh thu Giảng viên"
        onClose={closeModal}
        width={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, color: 'var(--text-dim, #475569)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Tỷ lệ chia sẻ doanh thu 70/30:</strong> Giảng viên nhận đến 70% doanh thu thuần từ khóa học do mình biên soạn và xuất bản trên hệ thống.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Cơ chế Giữ hộ minh bạch:</strong> Khi học viên đăng ký, học phí được tạm khóa theo chính sách bảo vệ học viên. Khi học viên hoàn thành trên 70% tiến trình hoặc hết thời hạn bảo đảm, tiền tự động chuyển sang số dư khả dụng của Giảng viên.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Rút tiền linh hoạt:</strong> Giảng viên có thể gửi yêu cầu rút tiền bất kỳ lúc nào về tài khoản ngân hàng thụ hưởng đã xác minh, xử lý trong vòng 1-3 ngày làm việc.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={closeModal} style={{ padding: '8px 18px', fontSize: 13 }}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Tiêu chuẩn kiểm duyệt nội dung */}
      <Modal
        open={modalType === 'criteria'}
        title="Tiêu chuẩn Kiểm duyệt Nội dung Khóa học"
        onClose={closeModal}
        width={580}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, color: 'var(--text-dim, #475569)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Đúng định dạng bài thi TOEIC:</strong> Nội dung câu hỏi và cấu trúc bài thi phải tuân thủ nghiêm ngặt tiêu chuẩn đánh giá của ETS từ Part 1 đến Part 7.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Chất lượng truyền thông:</strong> Âm thanh nghe rõ ràng, chuẩn ngữ âm tiếng Anh; hình ảnh minh họa sắc nét và không chứa watermark bản quyền vi phạm.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent, #2563eb)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div>
                <strong>Kiểm tra tự động đa lớp:</strong> Hệ thống sử dụng từ điển chuẩn (Lexicon) và bộ luật kiểm tra ngữ pháp tự động để phát hiện sớm các lỗi sai trước khi chuyên viên Quản trị phê duyệt lần cuối.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={closeModal} style={{ padding: '8px 18px', fontSize: 13 }}>
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </footer>
  )
}
