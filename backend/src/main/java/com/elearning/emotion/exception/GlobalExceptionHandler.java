package com.elearning.emotion.exception;

import com.elearning.emotion.service.StudentWalletService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(StudentWalletService.InsufficientBalanceException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientBalance(StudentWalletService.InsufficientBalanceException ex) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of(
                "code", "INSUFFICIENT_BALANCE",
                "shortfall", ex.shortfall,
                "error", ex.getMessage()
        ));
    }

    // File upload (anh/audio/video) vuot qua app.servlet.multipart.max-file-size
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleUploadTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Map.of("error", "File vuot qua dung luong toi da cho phep (550MB)."));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleForbidden(SecurityException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler({
            org.springframework.web.context.request.async.AsyncRequestNotUsableException.class,
            org.springframework.web.context.request.async.AsyncRequestTimeoutException.class,
            java.io.IOException.class
    })
    public void handleAsyncRequestNotUsable() {
        // Client ngat ket noi SSE (dong tab/chuyen trang/F5), bo qua khong ghi log loi 500
    }

    // VD: xoa Nhom hoat dong con hoat dong con ben trong -> chan lai, tra loi ro rang cho FE hien toast
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException ex, jakarta.servlet.http.HttpServletRequest request) {
        String accept = request != null ? request.getHeader("Accept") : null;
        if (accept != null && accept.contains(org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)) {
            return null;
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", msg));
    }

    // ---- Loi co so du lieu: ghi log day du len Render + tra thong bao ro rang thay vi "Internal Server Error" tron ----

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.error("[DB] Vi pham rang buoc du lieu: {}", rootMessage(ex), ex);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Dữ liệu vi phạm ràng buộc của cơ sở dữ liệu (trùng lặp hoặc đang được tham chiếu).",
                "detail", rootMessage(ex)));
    }

    @ExceptionHandler({DataAccessException.class, TransactionException.class, jakarta.persistence.PersistenceException.class})
    public ResponseEntity<Map<String, String>> handleDatabase(Exception ex) {
        String root = rootMessage(ex);
        log.error("[DB] Loi truy cap co so du lieu: {}", root, ex);
        // Het ket noi trong pool (Hikari timeout) -> 503 de phan biet voi loi code
        boolean poolBusy = root.contains("Connection is not available") || root.contains("request timed out");
        HttpStatus status = poolBusy ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;
        String msg = poolBusy
                ? "Máy chủ đang bận (hết kết nối cơ sở dữ liệu). Vui lòng thử lại sau vài giây."
                : "Lỗi cơ sở dữ liệu khi lưu dữ liệu.";
        return ResponseEntity.status(status).body(Map.of("error", msg, "detail", root));
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<Map<String, String>> handleNpe(NullPointerException ex) {
        log.error("[NPE] Loi xu ly du lieu null: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Lỗi xử lý dữ liệu trên máy chủ.",
                "detail", String.valueOf(ex.getMessage())));
    }

    private static String rootMessage(Throwable ex) {
        Throwable t = ex;
        while (t.getCause() != null && t.getCause() != t) t = t.getCause();
        String m = t.getClass().getSimpleName() + ": " + t.getMessage();
        return m.length() > 300 ? m.substring(0, 300) : m;
    }
}
