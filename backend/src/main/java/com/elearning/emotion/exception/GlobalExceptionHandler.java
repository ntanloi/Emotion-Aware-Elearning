package com.elearning.emotion.exception;

import com.elearning.emotion.service.StudentWalletService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
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
}
