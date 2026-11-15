package com.elearning.emotion.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@Slf4j
public class EmailService {

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String host;

    @Value("${spring.mail.port:587}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${spring.mail.sender-name:E-Learning AI}")
    private String senderName;

    /**
     * Kiểm tra xem cấu hình tài khoản gửi mail SMTP đã được thiết lập hay chưa
     */
    public boolean isConfigured() {
        return username != null && !username.isBlank() && password != null && !password.isBlank();
    }

    /**
     * Gửi email mã OTP xác thực đăng ký tài khoản qua Gmail
     */
    public boolean sendRegisterOtpEmail(String toEmail, String fullName, String otpCode) {
        String cleanFullName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "bạn";
        String htmlContent = buildRegisterOtpHtml(cleanFullName, otpCode);
        String subject = "[E-Learning AI] Mã xác thực OTP đăng ký tài khoản: " + otpCode;

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            log.warn("[EmailService] Chưa cấu hình SMTP Gmail (MAIL_USERNAME / MAIL_PASSWORD trong .env). Mã OTP cho '{}': {}", toEmail, otpCode);
            return false;
        }

        try {
            sendSmtpEmail(toEmail.trim(), subject, htmlContent);
            log.info("[EmailService] Đã gửi mã OTP đăng ký thành công qua Gmail đến: {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("[EmailService] Lỗi gửi email qua Gmail SMTP: {}. Mã OTP cho '{}': {}", e.getMessage(), toEmail, otpCode);
            return false;
        }
    }

    /**
     * Gửi email mã OTP đặt lại mật khẩu qua Gmail
     */
    public boolean sendResetPasswordOtpEmail(String toEmail, String fullName, String otpCode) {
        String cleanFullName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : "bạn";
        String htmlContent = buildResetPasswordOtpHtml(cleanFullName, otpCode);
        String subject = "[E-Learning AI] Mã xác thực OTP đặt lại mật khẩu: " + otpCode;

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            log.warn("[EmailService] Chưa cấu hình SMTP Gmail (MAIL_USERNAME / MAIL_PASSWORD trong .env). Mã OTP đặt lại mật khẩu cho '{}': {}", toEmail, otpCode);
            return false;
        }

        try {
            sendSmtpEmail(toEmail.trim(), subject, htmlContent);
            log.info("[EmailService] Đã gửi mã OTP đặt lại mật khẩu thành công qua Gmail đến: {}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("[EmailService] Lỗi gửi email đặt lại mật khẩu qua Gmail SMTP: {}. Mã OTP cho '{}': {}", e.getMessage(), toEmail, otpCode);
            return false;
        }
    }

    private void sendSmtpEmail(String toEmail, String subject, String htmlBody) throws Exception {
        int targetPort = (port > 0) ? port : 465;
        Socket socket;
        BufferedReader reader;
        BufferedWriter writer;

        if (targetPort == 465) {
            // SMTPS (Implicit SSL) - Cổng mặc định an toàn & ổn định nhất của Gmail
            SSLSocket sslSocket = (SSLSocket) SSLSocketFactory.getDefault().createSocket(host, 465);
            sslSocket.setSoTimeout(10000);
            socket = sslSocket;
            reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

            expectResponse(reader, "220");
            sendLine(writer, "EHLO localhost");
            readUntilEndOfResponse(reader);
        } else {
            // STARTTLS (Cổng 587)
            socket = new Socket(host, targetPort);
            socket.setSoTimeout(10000);
            reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

            expectResponse(reader, "220");
            sendLine(writer, "EHLO localhost");
            readUntilEndOfResponse(reader);

            sendLine(writer, "STARTTLS");
            expectResponse(reader, "220");

            SSLSocket sslSocket = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault())
                    .createSocket(socket, host, targetPort, true);
            sslSocket.setSoTimeout(10000);
            socket = sslSocket;
            reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

            sendLine(writer, "EHLO localhost");
            readUntilEndOfResponse(reader);
        }

        // Xác thực AUTH LOGIN
        sendLine(writer, "AUTH LOGIN");
        expectResponse(reader, "334");

        sendLine(writer, Base64.getEncoder().encodeToString(username.trim().getBytes(StandardCharsets.UTF_8)));
        expectResponse(reader, "334");

        // Mật khẩu ứng dụng (xóa khoảng trắng nếu copy từ Google App Password dạng 4 cụm)
        String cleanPassword = password.replace(" ", "").trim();
        sendLine(writer, Base64.getEncoder().encodeToString(cleanPassword.getBytes(StandardCharsets.UTF_8)));
        expectResponse(reader, "235");

        // Thiết lập người gửi và người nhận
        sendLine(writer, "MAIL FROM:<" + username.trim() + ">");
        expectResponse(reader, "250");

        sendLine(writer, "RCPT TO:<" + toEmail.trim() + ">");
        expectResponse(reader, "250");

        sendLine(writer, "DATA");
        expectResponse(reader, "354");

        // Header chuẩn MIME UTF-8
        String encodedSubject = "=?UTF-8?B?" + Base64.getEncoder().encodeToString(subject.getBytes(StandardCharsets.UTF_8)) + "?=";
        String encodedSender = "=?UTF-8?B?" + Base64.getEncoder().encodeToString(senderName.getBytes(StandardCharsets.UTF_8)) + "?=";

        sendLine(writer, "From: " + encodedSender + " <" + username.trim() + ">");
        sendLine(writer, "To: <" + toEmail.trim() + ">");
        sendLine(writer, "Subject: " + encodedSubject);
        sendLine(writer, "MIME-Version: 1.0");
        sendLine(writer, "Content-Type: text/html; charset=UTF-8");
        sendLine(writer, "Content-Transfer-Encoding: base64");
        sendLine(writer, "");

        // Gửi nội dung HTML mã hóa Base64
        String base64Content = Base64.getMimeEncoder().encodeToString(htmlBody.getBytes(StandardCharsets.UTF_8));
        writer.write(base64Content);
        writer.write("\r\n.\r\n");
        writer.flush();
        expectResponse(reader, "250");

        sendLine(writer, "QUIT");
        try {
            socket.close();
        } catch (Exception ignored) {
        }
    }

    private void sendLine(BufferedWriter writer, String line) throws IOException {
        writer.write(line + "\r\n");
        writer.flush();
    }

    private void expectResponse(BufferedReader reader, String expectedPrefix) throws IOException {
        String line = reader.readLine();
        if (line == null || !line.startsWith(expectedPrefix)) {
            throw new IOException("SMTP phản hồi không hợp lệ: " + line + " (Kỳ vọng: " + expectedPrefix + ")");
        }
    }

    private void readUntilEndOfResponse(BufferedReader reader) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.length() >= 4 && line.charAt(3) == ' ') {
                break;
            }
        }
    }

    private String buildRegisterOtpHtml(String fullName, String otpCode) {
        String safeName = (fullName != null && !fullName.isBlank())
                ? fullName.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").trim()
                : "bạn";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã xác thực OTP - E-Learning AI</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                      
                      <!-- Header với dải màu Gradient thương hiệu -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 12px;">
                            <span style="font-size: 26px;">🎓</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">E-Learning AI</h1>
                          <p style="margin: 6px 0 0; color: #e0e7ff; font-size: 13.5px; font-weight: 400;">Hệ Thống Học TOEIC &amp; Nhận Diện Cảm Xúc Thông Minh</p>
                        </td>
                      </tr>

                      <!-- Nội dung chính -->
                      <tr>
                        <td style="padding: 36px 32px 28px;">
                          <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 19px; font-weight: 600;">Xác thực tài khoản người dùng</h2>
                          <p style="margin: 0 0 14px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Xin chào <strong>{{fullName}}</strong>,
                          </p>
                          <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Cảm ơn bạn đã lựa chọn đăng ký tài khoản tại <strong>E-Learning AI</strong>. Để xác thực địa chỉ email và hoàn tất thủ tục đăng ký, vui lòng sử dụng mã xác thực OTP (One-Time Password) dưới đây:
                          </p>

                          <!-- Khung hiển thị mã OTP nổi bật -->
                          <div style="background: #f8fafc; border: 2px dashed #6366f1; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 28px 0 24px;">
                            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 1px;">Mã xác thực của bạn</div>
                            <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 12px; color: #4338ca; padding-left: 12px;">
                              {{otpCode}}
                            </div>
                          </div>

                          <!-- Lưu ý thời gian & bảo mật -->
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                            <tr>
                              <td style="font-size: 13px; line-height: 1.6; color: #475569;">
                                ⏱ <strong>Thời hạn sử dụng:</strong> Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>.<br>
                                🔒 <strong>Bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên hệ thống.
                              </td>
                            </tr>
                          </table>

                          <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #64748b;">
                            Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email hoặc thông báo cho bộ phận hỗ trợ của chúng tôi.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer chân trang -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
                          <p style="margin: 0 0 6px; font-size: 12.5px; color: #64748b;">
                            Email tự động từ hệ thống <strong>E-Learning AI</strong>.
                          </p>
                          <p style="margin: 0; font-size: 11.5px; color: #94a3b8;">
                            © 2026 E-Learning AI • Nền tảng Học tiếng Anh trực tuyến hỗ trợ AI
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
                .replace("{{fullName}}", safeName)
                .replace("{{otpCode}}", (otpCode != null) ? otpCode.trim() : "");
    }

    private String buildResetPasswordOtpHtml(String fullName, String otpCode) {
        String safeName = (fullName != null && !fullName.isBlank())
                ? fullName.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").trim()
                : "bạn";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mã xác thực đặt lại mật khẩu - E-Learning AI</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
                <tr>
                  <td align="center">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                      
                      <!-- Header với dải màu Gradient bảo mật -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 36px 30px; text-align: center;">
                          <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 12px;">
                            <span style="font-size: 26px;">🔐</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">E-Learning AI</h1>
                          <p style="margin: 6px 0 0; color: #e0e7ff; font-size: 13.5px; font-weight: 400;">Yêu Cầu Thiết Lập Lại Mật Khẩu</p>
                        </td>
                      </tr>

                      <!-- Nội dung chính -->
                      <tr>
                        <td style="padding: 36px 32px 28px;">
                          <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 19px; font-weight: 600;">Khôi phục quyền truy cập</h2>
                          <p style="margin: 0 0 14px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Xin chào <strong>{{fullName}}</strong>,
                          </p>
                          <p style="margin: 0 0 20px; font-size: 14.5px; line-height: 1.6; color: #334155;">
                            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này trên hệ thống <strong>E-Learning AI</strong>. Để tạo mật khẩu mới, bạn vui lòng sử dụng mã xác thực OTP (One-Time Password) dưới đây:
                          </p>

                          <!-- Khung hiển thị mã OTP nổi bật -->
                          <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 28px 0 24px;">
                            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 1px;">Mã OTP đặt lại mật khẩu</div>
                            <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 12px; color: #0369a1; padding-left: 12px;">
                              {{otpCode}}
                            </div>
                          </div>

                          <!-- Lưu ý thời gian & bảo mật -->
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
                            <tr>
                              <td style="font-size: 13px; line-height: 1.6; color: #475569;">
                                ⏱ <strong>Thời hạn sử dụng:</strong> Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>.<br>
                                🔒 <strong>Bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và mật khẩu của bạn vẫn an toàn.
                              </td>
                            </tr>
                          </table>

                          <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #64748b;">
                            Nếu bạn nghi ngờ tài khoản bị xâm phạm, vui lòng đổi mật khẩu ngay sau khi đăng nhập hoặc liên hệ đội ngũ quản trị.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer chân trang -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
                          <p style="margin: 0 0 6px; font-size: 12.5px; color: #64748b;">
                            Email tự động từ hệ thống <strong>E-Learning AI</strong>.
                          </p>
                          <p style="margin: 0; font-size: 11.5px; color: #94a3b8;">
                            © 2026 E-Learning AI • Nền tảng Học tiếng Anh trực tuyến hỗ trợ AI
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
                .replace("{{fullName}}", safeName)
                .replace("{{otpCode}}", (otpCode != null) ? otpCode.trim() : "");
    }
}
