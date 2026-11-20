package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.dto.SepayPayoutCheckResult;
import com.elearning.emotion.entity.PaymentTransaction;
import com.elearning.emotion.entity.PayoutRequest;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.PaymentTransactionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SepayPayoutVerificationService {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentProperties paymentProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    /**
     * Kiểm tra đối soát giao dịch chuyển tiền ra trên SePay đối với một yêu cầu rút tiền của Giảng viên.
     * Tiêu chuẩn xác thực 3 lớp bắt buộc:
     * 1. Đúng số tiền (Amount Match)
     * 2. Đúng mã giảng viên (Teacher Code Match)
     * 3. Đúng số tài khoản nhận của giảng viên (Bank Account Match)
     */
    @Transactional
    public SepayPayoutCheckResult verifyPayoutTransaction(PayoutRequest req, String transactionRef) {
        if (req == null) {
            return SepayPayoutCheckResult.failure(
                    "Không tìm thấy yêu cầu rút tiền cần kiểm tra",
                    new SepayPayoutCheckResult.Checks(false, BigDecimal.ZERO, BigDecimal.ZERO, false, "", false, ""),
                    null
            );
        }

        BigDecimal expectedAmount = req.getAmount() != null
                ? req.getAmount().setScale(0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        User teacher = req.getTeacher();
        String teacherCode = (teacher != null && teacher.getTeacherCode() != null)
                ? teacher.getTeacherCode().trim()
                : "";

        String expectedBankAccount = req.getBankAccountNo() != null ? req.getBankAccountNo().trim() : "";
        String expectedAccountName = req.getBankAccountName() != null ? req.getBankAccountName().trim() : "";

        // 1. Tìm các giao dịch tiền ra (transferType = out) ứng viên trong CSDL
        List<PaymentTransaction> candidates = findCandidateTransactions(req, transactionRef, expectedAmount);

        // 2. Nếu chưa tìm thấy và đã cấu hình SePay API Key, đồng bộ trực tiếp từ SePay User API
        if (candidates.isEmpty() && paymentProperties.getSepayApiKey() != null && !paymentProperties.getSepayApiKey().isBlank()) {
            log.info("Checking directly from SePay User API for payout request: {}", req.getId());
            syncRecentTransactionsFromSepayApi();
            candidates = findCandidateTransactions(req, transactionRef, expectedAmount);
        }

        if (candidates.isEmpty()) {
            String refDetail = (transactionRef != null && !transactionRef.trim().isBlank())
                    ? " với mã giao dịch '" + transactionRef.trim() + "'"
                    : "";
            return SepayPayoutCheckResult.failure(
                    "Không tìm thấy giao dịch chuyển tiền (tiền ra) nào trên SePay" + refDetail
                            + " khớp với số tiền " + formatVND(expectedAmount)
                            + " đ. Vui lòng kiểm tra lại bạn đã chuyển khoản thành công từ tài khoản ngân hàng kết nối SePay chưa.",
                    new SepayPayoutCheckResult.Checks(false, expectedAmount, BigDecimal.ZERO, false, teacherCode, false, expectedBankAccount),
                    null
            );
        }

        // 3. Đánh giá kiểm tra từng giao dịch ứng viên, chọn giao dịch có độ khớp tốt nhất
        SepayPayoutCheckResult bestResult = null;
        for (PaymentTransaction tx : candidates) {
            SepayPayoutCheckResult result = evaluateTransaction(tx, req, expectedAmount, teacherCode, expectedBankAccount, expectedAccountName);
            if (result.matched()) {
                return result; // Khớp hoàn toàn cả 3 tiêu chí
            }
            if (bestResult == null) {
                bestResult = result;
            }
        }

        return bestResult;
    }

    private List<PaymentTransaction> findCandidateTransactions(PayoutRequest req, String transactionRef, BigDecimal expectedAmount) {
        List<PaymentTransaction> candidates = new ArrayList<>();

        // Nếu admin có truyền mã GD cụ thể (referenceCode, code, sepayId...)
        if (transactionRef != null && !transactionRef.trim().isBlank()) {
            String ref = transactionRef.trim();
            candidates.addAll(paymentTransactionRepository.findOutgoingByReference(ref));
        }

        // Nếu chưa tìm thấy bằng mã cụ thể, tìm theo số tiền chuyển đi
        if (candidates.isEmpty()) {
            List<PaymentTransaction> byAmount = paymentTransactionRepository.findUnmatchedOutgoingByAmount(expectedAmount);
            candidates.addAll(byAmount);
        }

        // Nếu vẫn trống, lấy 10 giao dịch tiền ra mới nhất để kiểm tra
        if (candidates.isEmpty()) {
            candidates.addAll(paymentTransactionRepository.findRecentOutgoing(PageRequest.of(0, 10)));
        }

        return candidates;
    }

    private SepayPayoutCheckResult evaluateTransaction(
            PaymentTransaction tx,
            PayoutRequest req,
            BigDecimal expectedAmount,
            String teacherCode,
            String expectedBankAccount,
            String expectedAccountName
    ) {
        BigDecimal actualAmount = tx.getTransferAmount() != null
                ? tx.getTransferAmount().setScale(0, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Tiêu chí 1: Đúng số tiền (100%)
        boolean amountMatched = (expectedAmount.compareTo(actualAmount) == 0);

        String searchInTx = ((tx.getContent() != null ? tx.getContent() : "") + " "
                + (tx.getDescription() != null ? tx.getDescription() : "") + " "
                + (tx.getCode() != null ? tx.getCode() : "")).toUpperCase();

        // Tiêu chí 2: Đúng mã giảng viên
        boolean teacherCodeMatched = false;
        if (!teacherCode.isBlank()) {
            teacherCodeMatched = searchInTx.contains(teacherCode.toUpperCase());
        }
        // Fallback linh hoạt: kiểm tra mã user ID ngắn, email prefix hoặc mã yêu cầu rút
        User teacher = req.getTeacher();
        if (!teacherCodeMatched && teacher != null) {
            if (teacher.getId() != null && teacher.getId().length() >= 8) {
                String shortId = teacher.getId().substring(0, 8).toUpperCase();
                teacherCodeMatched = searchInTx.contains(shortId);
            }
            if (!teacherCodeMatched && teacher.getEmail() != null) {
                String emailPrefix = teacher.getEmail().split("@")[0].toUpperCase();
                if (emailPrefix.length() >= 4) {
                    teacherCodeMatched = searchInTx.contains(emailPrefix);
                }
            }
        }
        if (!teacherCodeMatched && req.getId() != null && req.getId().length() >= 8) {
            teacherCodeMatched = searchInTx.contains(req.getId().substring(0, 8).toUpperCase());
        }

        // Tiêu chí 3: Đúng số tài khoản nhận của giảng viên
        boolean bankAccountMatched = false;
        if (!expectedBankAccount.isBlank()) {
            bankAccountMatched = searchInTx.contains(expectedBankAccount);
            if (!bankAccountMatched && expectedBankAccount.startsWith("0") && expectedBankAccount.length() > 5) {
                bankAccountMatched = searchInTx.contains(expectedBankAccount.substring(1));
            }
        }
        // Hoặc kiểm tra tên chủ tài khoản thụ hưởng trong SMS ngân hàng
        if (!bankAccountMatched && !expectedAccountName.isBlank()) {
            bankAccountMatched = searchInTx.contains(expectedAccountName.toUpperCase());
        }

        boolean fullyMatched = amountMatched && teacherCodeMatched && bankAccountMatched;

        SepayPayoutCheckResult.Checks checks = new SepayPayoutCheckResult.Checks(
                amountMatched,
                expectedAmount,
                actualAmount,
                teacherCodeMatched,
                teacherCode,
                bankAccountMatched,
                expectedBankAccount
        );

        SepayPayoutCheckResult.SepayTransactionInfo txInfo = new SepayPayoutCheckResult.SepayTransactionInfo(
                tx.getSepayId(),
                tx.getReferenceCode(),
                tx.getTransferAmount(),
                tx.getTransferType(),
                tx.getContent(),
                tx.getDescription(),
                tx.getTransactionDate(),
                tx.getAccountNumber()
        );

        if (fullyMatched) {
            return SepayPayoutCheckResult.success(
                    "Giao dịch SePay hợp lệ: Đúng số tiền (" + formatVND(actualAmount)
                            + " đ), đúng mã giảng viên (" + teacherCode + ") và tài khoản nhận (" + expectedBankAccount + ").",
                    checks,
                    txInfo
            );
        } else {
            List<String> mismatchReasons = new ArrayList<>();
            if (!amountMatched) {
                mismatchReasons.add("Số tiền SePay (" + formatVND(actualAmount) + " đ) khác số tiền rút (" + formatVND(expectedAmount) + " đ)");
            }
            if (!teacherCodeMatched) {
                mismatchReasons.add("Nội dung SePay không chứa mã giảng viên (" + teacherCode + ")");
            }
            if (!bankAccountMatched) {
                mismatchReasons.add("Nội dung SePay không chứa số tài khoản nhận (" + expectedBankAccount + ")");
            }

            return SepayPayoutCheckResult.failure(
                    "Giao dịch SePay chưa khớp điều kiện: " + String.join("; ", mismatchReasons),
                    checks,
                    txInfo
            );
        }
    }

    /**
     * Gọi SePay REST API để đồng bộ các giao dịch mới nhất khi webhook chưa kịp đẩy tới
     */
    public void syncRecentTransactionsFromSepayApi() {
        String apiKey = paymentProperties.getSepayApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://my.sepay.vn/userapi/transactions/list?limit=50"))
                    .header("Authorization", "Apikey " + apiKey.trim())
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(4))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 && response.body() != null) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode txArray = root.path("transactions");
                if (txArray.isArray()) {
                    int countNew = 0;
                    for (JsonNode item : txArray) {
                        Long id = item.path("id").asLong();
                        if (id > 0 && !paymentTransactionRepository.existsBySepayId(id)) {
                            BigDecimal amountOut = new BigDecimal(item.path("amount_out").asText("0.00"));
                            BigDecimal amountIn = new BigDecimal(item.path("amount_in").asText("0.00"));
                            String transferType = amountOut.compareTo(BigDecimal.ZERO) > 0 ? "out" : "in";
                            BigDecimal transferAmount = "out".equals(transferType) ? amountOut : amountIn;

                            LocalDateTime txDate = parseDateTime(item.path("transaction_date").asText(null));

                            PaymentTransaction tx = PaymentTransaction.builder()
                                    .sepayId(id)
                                    .gateway(item.path("bank_brand_name").asText("SePay"))
                                    .accountNumber(item.path("account_number").asText(null))
                                    .transactionDate(txDate)
                                    .transferType(transferType)
                                    .transferAmount(transferAmount.setScale(0, RoundingMode.HALF_UP))
                                    .accumulated(new BigDecimal(item.path("accumulated").asText("0.00")))
                                    .code(item.path("code").asText(null))
                                    .referenceCode(item.path("reference_number").asText(null))
                                    .content(item.path("transaction_content").asText(null))
                                    .description(item.path("body").asText(null))
                                    .status("UNMATCHED")
                                    .kind("out".equals(transferType) ? "PAYOUT" : "ORDER")
                                    .rawPayload(item.toString())
                                    .build();

                            paymentTransactionRepository.save(tx);
                            countNew++;
                        }
                    }
                    if (countNew > 0) {
                        log.info("Synced {} new transactions directly from SePay User API", countNew);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Could not sync from SePay User API: {}", ex.getMessage());
        }
    }

    private LocalDateTime parseDateTime(String raw) {
        if (raw == null || raw.isBlank()) return LocalDateTime.now();
        try {
            return LocalDateTime.parse(raw.trim(), DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception ex) {
            try {
                return LocalDateTime.parse(raw.trim(), DateTimeFormatter.ISO_DATE_TIME);
            } catch (Exception ignored) {
                return LocalDateTime.now();
            }
        }
    }

    private String formatVND(BigDecimal amount) {
        if (amount == null) return "0";
        return String.format("%,d", amount.longValue());
    }
}
