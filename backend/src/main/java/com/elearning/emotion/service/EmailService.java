package com.elearning.emotion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Gửi email OTP qua Brevo HTTP API (cổng 443).
 * Lý do: Render (gói free) chặn outbound SMTP cổng 25/465/587 nên không thể dùng Gmail SMTP.
 */
@Service
@Slf4j
public class EmailService {

    private static final String BREVO_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${brevo.sender-email:}")
    private String brevoSenderEmail;

    @Value("${spring.mail.sender-name:E-Learning AI}")
    private String senderName;

    @Value("${app.frontend-url:${FRONTEND_URL:https://testdeploy-weld-chi.vercel.app}}")
    private String frontendUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * Lấy URL gốc công khai để chèn asset ảnh/icon vào email (Retina 2x).
     */
    public String getBaseUrl() {
        String url = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.trim() : "https://testdeploy-weld-chi.vercel.app";
        while (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        if (url.contains("localhost") || url.contains("127.0.0.1")) {
            return "https://testdeploy-weld-chi.vercel.app";
        }
        return url;
    }

    /**
     * 6 ô số hiển thị như thẻ riêng lẻ nhưng nằm trong MỘT khối duy nhất có user-select: all,
     * nên nhấp/chạm một lần là chọn toàn bộ mã. Các ô là inline-block viết liền nhau (không khoảng trắng,
     * không dùng td) để khi copy ra đúng chuỗi "123456", không có tab hay dấu cách.
     */
    private String buildDigitCells(String otpCode, String colorHex) {
        if (otpCode == null || otpCode.isBlank()) {
            return "<td style=\"padding: 10px 20px; font-size: 26px; font-weight: 800; color: " + colorHex + ";\">------</td>";
        }
        String clean = otpCode.trim();
        StringBuilder sb = new StringBuilder();
        sb.append("<td align=\"center\" style=\"padding: 0; font-size: 0; line-height: 0; cursor: pointer; -webkit-user-select: all; -moz-user-select: all; user-select: all;\">");
        for (int i = 0; i < clean.length(); i++) {
            sb.append("<span style=\"display: inline-block; width: 44px; height: 52px; line-height: 52px; margin: 0 4px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; text-align: center; vertical-align: middle; font-size: 26px; font-weight: 800; color: ")
              .append(colorHex)
              .append("; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\">")
              .append(clean.charAt(i))
              .append("</span>");
        }
        sb.append("</td>");
        return sb.toString();
    }

    /**
     * Gợi ý sao chép (icon + chữ). Email không chạy được JavaScript nên không thể ghi clipboard trực tiếp;
     * người dùng chạm/nhấp vào mã để chọn toàn bộ rồi sao chép, vẫn ở lại trong email.
     */
    private String buildCopyHint(String baseUrl, String colorHex) {
        return "<table border=\"0\" cellspacing=\"0\" cellpadding=\"0\" align=\"center\" style=\"margin: 0 auto;\"><tr>"
                + "<td style=\"padding-right: 6px;\"><img src=\"" + baseUrl + "/images/email/icon-copy.png\" width=\"16\" height=\"16\" alt=\"\" "
                + "style=\"display: block; border: 0; width: 16px; height: 16px;\" /></td>"
                + "<td style=\"font-size: 12.5px; font-weight: 600; color: " + colorHex + ";\">Nhấn vào mã để chọn toàn bộ, rồi sao chép</td>"
                + "</tr></table>";
    }

    /**
     * Kiểm tra đã cấu hình Brevo (API key + email người gửi đã xác minh) hay chưa
     */
    public boolean isConfigured() {
        return brevoApiKey != null && !brevoApiKey.isBlank()
                && brevoSenderEmail != null && !brevoSenderEmail.isBlank();
    }

    /**
     * Gửi email mã OTP xác thực đăng ký tài khoản
     */
    public boolean sendRegisterOtpEmail(String toEmail, String fullName, String otpCode) {
        String cleanFullName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "bạn";
        String htmlContent = buildRegisterOtpHtml(cleanFullName, otpCode);
        String subject = "[E-Learning AI] Mã xác thực OTP đăng ký tài khoản: " + otpCode;

        if (!isConfigured()) {
            log.warn("[EmailService] Chưa cấu hình BREVO_API_KEY / BREVO_SENDER_EMAIL. Không gửi mail tới '{}'.", toEmail);
            return false;
        }

        try {
            sendViaBrevo(toEmail.trim(), subject, htmlContent);
            log.info("[EmailService] Đã gửi mã OTP đăng ký thành công đến: {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("[EmailService] Lỗi gửi email OTP đăng ký qua Brevo tới '{}': {}", toEmail, e.getMessage());
            return false;
        }
    }

    /**
     * Gửi email mã OTP đặt lại mật khẩu
     */
    public boolean sendResetPasswordOtpEmail(String toEmail, String fullName, String otpCode) {
        String cleanFullName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "bạn";
        String htmlContent = buildResetPasswordOtpHtml(cleanFullName, otpCode);
        String subject = "[E-Learning AI] Mã xác thực OTP đặt lại mật khẩu: " + otpCode;

        if (!isConfigured()) {
            log.warn("[EmailService] Chưa cấu hình BREVO_API_KEY / BREVO_SENDER_EMAIL. Không gửi mail tới '{}'.", toEmail);
            return false;
        }

        try {
            sendViaBrevo(toEmail.trim(), subject, htmlContent);
            log.info("[EmailService] Đã gửi mã OTP đặt lại mật khẩu thành công đến: {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("[EmailService] Lỗi gửi email đặt lại mật khẩu qua Brevo tới '{}': {}", toEmail, e.getMessage());
            return false;
        }
    }

    private void sendViaBrevo(String toEmail, String subject, String htmlBody) throws Exception {
        Map<String, Object> payload = Map.of(
                "sender", Map.of("name", senderName, "email", brevoSenderEmail.trim()),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "htmlContent", htmlBody
        );
        String json = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder(URI.create(BREVO_URL))
                .timeout(Duration.ofSeconds(10))
                .header("api-key", brevoApiKey.trim())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            throw new IOException("Brevo trả về HTTP " + response.statusCode() + ": " + response.body());
        }
    }

    private String buildRegisterOtpHtml(String fullName, String otpCode) {
        String safeName = (fullName != null && !fullName.isBlank())
                ? fullName.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").trim()
                : "bạn";
        String cleanOtp = (otpCode != null) ? otpCode.trim() : "";
        String baseUrl = getBaseUrl();
        String digitCells = buildDigitCells(cleanOtp, "#1d4ed8");

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã xác thực OTP - E-Learning AI</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
                <tr>
                  <td align="center">
                    <!-- Main Card Container -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03); border: 1px solid #e2e8f0;">
                      
                      <!-- Top Accent Gradient Bar -->
                      <tr>
                        <td height="5" style="background: linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #0d9488 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                      </tr>

                      <!-- Header Section -->
                      <tr>
                        <td style="padding: 36px 36px 20px; text-align: center;">
                          <!-- Brand Logo Icon (Retina 2x) -->
                          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 14px;">
                            <tr>
                              <td align="center">
                                <img src="{{baseUrl}}/images/email/logo-brand.png" width="56" height="56" alt="E-Learning AI" style="display: block; border: 0; width: 56px; height: 56px; border-radius: 14px; box-shadow: 0 10px 18px -4px rgba(37, 99, 235, 0.35);" />
                              </td>
                            </tr>
                          </table>

                          <!-- Brand Name & Tagline -->
                          <h1 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.4px;">E-Learning AI</h1>
                          <p style="margin: 5px 0 0; color: #64748b; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Hệ Thống Học TOEIC &amp; Nhận Diện Cảm Xúc Thông Minh</p>

                          <!-- Subtle Divider -->
                          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                            <tr>
                              <td height="1" style="background-color: #f1f5f9; font-size: 0; line-height: 0;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Content Body -->
                      <tr>
                        <td style="padding: 10px 36px 36px;">
                          <!-- Title -->
                          <h2 style="margin: 0 0 14px; color: #0f172a; font-size: 18px; font-weight: 700;">Xác thực tài khoản người dùng</h2>
                          
                          <p style="margin: 0 0 12px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Xin chào <strong>{{fullName}}</strong>,
                          </p>
                          
                          <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Cảm ơn bạn đã lựa chọn đăng ký tài khoản tại <strong>E-Learning AI</strong>. Để xác thực địa chỉ email và hoàn tất thủ tục đăng ký, vui lòng sử dụng mã xác thực OTP (One-Time Password) dưới đây:
                          </p>

                          <!-- OTP Verification Box (UX/UI Pro Max 6-Digit Cards) -->
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px 16px; margin: 0 0 24px; text-align: center;">
                            <tr>
                              <td align="center">
                                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 14px;">MÃ XÁC THỰC CỦA BẠN</div>
                                
                                <!-- 6 Digit Individual Cells -->
                                <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 12px;">
                                  <tr>
                                    {{digitCells}}
                                  </tr>
                                </table>

                                {{copyHint}}
                              </td>
                            </tr>
                          </table>

                          <!-- Professional Information Cards (Replacing raw emojis) -->
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <!-- Row 1: Thời hạn -->
                            <tr>
                              <td style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 12px 14px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td width="36" valign="top" style="padding-right: 12px;">
                                      <img src="{{baseUrl}}/images/email/icon-timer.png" width="30" height="30" alt="Thời hạn" style="display: block; border: 0; width: 30px; height: 30px;" />
                                    </td>
                                    <td valign="middle">
                                      <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 2px;">
                                        Thời hạn sử dụng: 5 phút
                                      </div>
                                      <div style="font-size: 12px; line-height: 1.45; color: #b45309;">
                                        Mã xác thực có hiệu lực trong vòng 5 phút. Quá thời gian trên bạn sẽ cần yêu cầu mã mới.
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <tr><td height="8" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>

                            <!-- Row 2: Bảo mật -->
                            <tr>
                              <td style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 12px 14px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td width="36" valign="top" style="padding-right: 12px;">
                                      <img src="{{baseUrl}}/images/email/icon-shield.png" width="30" height="30" alt="Bảo mật" style="display: block; border: 0; width: 30px; height: 30px;" />
                                    </td>
                                    <td valign="middle">
                                      <div style="font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 2px;">
                                        Bảo mật tài khoản tuyệt đối
                                      </div>
                                      <div style="font-size: 12px; line-height: 1.45; color: #15803d;">
                                        Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên hệ thống E-Learning AI.
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <!-- Footer Notice -->
                          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                            Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email hoặc thông báo cho bộ phận hỗ trợ của chúng tôi.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 36px; text-align: center;">
                          <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                            Email được gửi tự động từ hệ thống bảo mật <strong>E-Learning AI</strong>.
                          </p>
                          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                            © 2026 E-Learning AI • Nền tảng Học tiếng Anh trực tuyến &amp; Nhận diện cảm xúc AI
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """
                .replace("{{baseUrl}}", baseUrl)
                .replace("{{fullName}}", safeName)
                .replace("{{digitCells}}", digitCells)
                .replace("{{copyHint}}", buildCopyHint(baseUrl, "#1d4ed8"))
                .replace("{{otpCode}}", cleanOtp);
    }

    private String buildResetPasswordOtpHtml(String fullName, String otpCode) {
        String safeName = (fullName != null && !fullName.isBlank())
                ? fullName.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").trim()
                : "bạn";
        String cleanOtp = (otpCode != null) ? otpCode.trim() : "";
        String baseUrl = getBaseUrl();
        String digitCells = buildDigitCells(cleanOtp, "#0284c7");

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã xác thực đặt lại mật khẩu - E-Learning AI</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
                <tr>
                  <td align="center">
                    <!-- Main Card Container -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.03); border: 1px solid #e2e8f0;">
                      
                      <!-- Top Accent Gradient Bar (Sky/Indigo) -->
                      <tr>
                        <td height="5" style="background: linear-gradient(90deg, #0284c7 0%, #2563eb 50%, #7c3aed 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                      </tr>

                      <!-- Header Section -->
                      <tr>
                        <td style="padding: 36px 36px 20px; text-align: center;">
                          <!-- Brand Logo Icon (giống icon trang chủ của web, Retina 3x) -->
                          <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 14px;">
                            <tr>
                              <td align="center">
                                <img src="{{baseUrl}}/images/email/logo-brand.png" width="56" height="56" alt="E-Learning AI" style="display: block; border: 0; width: 56px; height: 56px; border-radius: 14px; box-shadow: 0 10px 18px -4px rgba(37, 99, 235, 0.35);" />
                              </td>
                            </tr>
                          </table>

                          <!-- Brand Name & Tagline -->
                          <h1 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.4px;">E-Learning AI</h1>
                          <p style="margin: 5px 0 0; color: #64748b; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">Yêu Cầu Thiết Lập Lại Mật Khẩu</p>

                          <!-- Subtle Divider -->
                          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                            <tr>
                              <td height="1" style="background-color: #f1f5f9; font-size: 0; line-height: 0;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Content Body -->
                      <tr>
                        <td style="padding: 10px 36px 36px;">
                          <!-- Title -->
                          <h2 style="margin: 0 0 14px; color: #0f172a; font-size: 18px; font-weight: 700;">Khôi phục quyền truy cập</h2>
                          
                          <p style="margin: 0 0 12px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Xin chào <strong>{{fullName}}</strong>,
                          </p>
                          
                          <p style="margin: 0 0 24px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này trên hệ thống <strong>E-Learning AI</strong>. Để tạo mật khẩu mới, bạn vui lòng sử dụng mã xác thực OTP (One-Time Password) dưới đây:
                          </p>

                          <!-- OTP Verification Box (UX/UI Pro Max 6-Digit Cards) -->
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px 16px; margin: 0 0 24px; text-align: center;">
                            <tr>
                              <td align="center">
                                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 14px;">MÃ OTP ĐẶT LẠI MẬT KHẨU</div>
                                
                                <!-- 6 Digit Individual Cells -->
                                <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 0 auto 12px;">
                                  <tr>
                                    {{digitCells}}
                                  </tr>
                                </table>

                                {{copyHint}}
                              </td>
                            </tr>
                          </table>

                          <!-- Professional Information Cards (Replacing raw emojis) -->
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                            <!-- Row 1: Thời hạn -->
                            <tr>
                              <td style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 12px 14px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td width="36" valign="top" style="padding-right: 12px;">
                                      <img src="{{baseUrl}}/images/email/icon-timer.png" width="30" height="30" alt="Thời hạn" style="display: block; border: 0; width: 30px; height: 30px;" />
                                    </td>
                                    <td valign="middle">
                                      <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 2px;">
                                        Thời hạn sử dụng: 5 phút
                                      </div>
                                      <div style="font-size: 12px; line-height: 1.45; color: #b45309;">
                                        Mã xác thực có hiệu lực trong vòng 5 phút. Quá thời gian trên bạn sẽ cần gửi lại yêu cầu mới.
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <tr><td height="8" style="font-size: 0; line-height: 0;">&nbsp;</td></tr>

                            <!-- Row 2: Cảnh báo an toàn -->
                            <tr>
                              <td style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 12px 14px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                    <td width="36" valign="top" style="padding-right: 12px;">
                                      <img src="{{baseUrl}}/images/email/icon-shield-alert.png" width="30" height="30" alt="Cảnh báo an toàn" style="display: block; border: 0; width: 30px; height: 30px;" />
                                    </td>
                                    <td valign="middle">
                                      <div style="font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 2px;">
                                        Cảnh báo an toàn tài khoản
                                      </div>
                                      <div style="font-size: 12px; line-height: 1.45; color: #b91c1c;">
                                        Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và mật khẩu hiện tại của bạn vẫn an toàn tuyệt đối.
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <!-- Footer Notice -->
                          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                            Nếu bạn nghi ngờ tài khoản bị xâm phạm, vui lòng đổi mật khẩu ngay sau khi đăng nhập hoặc liên hệ đội ngũ quản trị.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 36px; text-align: center;">
                          <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                            Email được gửi tự động từ hệ thống bảo mật <strong>E-Learning AI</strong>.
                          </p>
                          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                            © 2026 E-Learning AI • Nền tảng Học tiếng Anh trực tuyến &amp; Nhận diện cảm xúc AI
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """
                .replace("{{baseUrl}}", baseUrl)
                .replace("{{fullName}}", safeName)
                .replace("{{digitCells}}", digitCells)
                .replace("{{copyHint}}", buildCopyHint(baseUrl, "#0284c7"))
                .replace("{{otpCode}}", cleanOtp);
    }
}
