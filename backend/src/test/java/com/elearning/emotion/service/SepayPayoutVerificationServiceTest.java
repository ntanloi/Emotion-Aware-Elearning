package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.dto.SepayPayoutCheckResult;
import com.elearning.emotion.entity.PaymentTransaction;
import com.elearning.emotion.entity.PayoutRequest;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SepayPayoutVerificationServiceTest {

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    private PaymentProperties paymentProperties;
    private SepayPayoutVerificationService service;

    private User teacher;
    private PayoutRequest payoutRequest;

    @BeforeEach
    void setUp() {
        paymentProperties = new PaymentProperties();
        service = new SepayPayoutVerificationService(paymentTransactionRepository, paymentProperties);

        teacher = User.builder()
                .id("teacher-uuid-123456")
                .teacherCode("GV1001")
                .fullName("Lê Hoàng Nam")
                .email("nam.le@test.edu.vn")
                .role("TEACHER")
                .build();

        payoutRequest = PayoutRequest.builder()
                .id("payout-uuid-7890")
                .teacher(teacher)
                .amount(new BigDecimal("562000"))
                .bankId("MB")
                .bankAccountNo("0398123456")
                .bankAccountName("LE HOANG NAM")
                .status("PENDING")
                .build();
    }

    @Test
    @DisplayName("Thành công: Khớp 100% số tiền, mã giảng viên và tài khoản nhận")
    void verifyPayout_Success_WhenAllCriteriaMatch() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx-1")
                .sepayId(1001L)
                .referenceCode("FT26110800123")
                .transferType("out")
                .transferAmount(new BigDecimal("562000"))
                .content("RUT GV1001 0398123456")
                .description("GD: -562000 VND TK 0123... Chuyen den LE HOANG NAM STK 0398123456 MB. ND: RUT GV1001 0398123456")
                .transactionDate(LocalDateTime.now())
                .status("UNMATCHED")
                .build();

        when(paymentTransactionRepository.findOutgoingByReference("FT26110800123"))
                .thenReturn(List.of(tx));

        SepayPayoutCheckResult result = service.verifyPayoutTransaction(payoutRequest, "FT26110800123");

        assertTrue(result.matched());
        assertTrue(result.checks().amountMatched());
        assertTrue(result.checks().teacherCodeMatched());
        assertTrue(result.checks().bankAccountMatched());
        assertEquals(new BigDecimal("562000"), result.checks().actualAmount());
        assertEquals("GV1001", result.checks().expectedTeacherCode());
        assertEquals("0398123456", result.checks().expectedBankAccount());
        assertNotNull(result.transaction());
        assertEquals(1001L, result.transaction().sepayId());
    }

    @Test
    @DisplayName("Thất bại: Sai lệch số tiền (Amount Mismatch)")
    void verifyPayout_Fails_WhenAmountMismatch() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx-2")
                .sepayId(1002L)
                .referenceCode("FT26110800124")
                .transferType("out")
                .transferAmount(new BigDecimal("500000")) // Yêu cầu 562.000 đ
                .content("RUT GV1001 0398123456")
                .transactionDate(LocalDateTime.now())
                .status("UNMATCHED")
                .build();

        when(paymentTransactionRepository.findOutgoingByReference("FT26110800124"))
                .thenReturn(List.of(tx));

        SepayPayoutCheckResult result = service.verifyPayoutTransaction(payoutRequest, "FT26110800124");

        assertFalse(result.matched());
        assertFalse(result.checks().amountMatched());
        assertTrue(result.checks().teacherCodeMatched());
        assertTrue(result.checks().bankAccountMatched());
        assertTrue(result.message().contains("Số tiền SePay"));
    }

    @Test
    @DisplayName("Thất bại: Không đúng mã giảng viên (Teacher Code Mismatch)")
    void verifyPayout_Fails_WhenTeacherCodeMismatch() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx-3")
                .sepayId(1003L)
                .referenceCode("FT26110800125")
                .transferType("out")
                .transferAmount(new BigDecimal("562000"))
                .content("CHUYEN TIEN CHO BAN 0398123456") // Không có GV1001
                .transactionDate(LocalDateTime.now())
                .status("UNMATCHED")
                .build();

        when(paymentTransactionRepository.findOutgoingByReference("FT26110800125"))
                .thenReturn(List.of(tx));

        SepayPayoutCheckResult result = service.verifyPayoutTransaction(payoutRequest, "FT26110800125");

        assertFalse(result.matched());
        assertTrue(result.checks().amountMatched());
        assertFalse(result.checks().teacherCodeMatched());
        assertTrue(result.message().contains("mã giảng viên"));
    }

    @Test
    @DisplayName("Thất bại: Không đúng số tài khoản thụ hưởng (Bank Account Mismatch)")
    void verifyPayout_Fails_WhenBankAccountMismatch() {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id("tx-4")
                .sepayId(1004L)
                .referenceCode("FT26110800126")
                .transferType("out")
                .transferAmount(new BigDecimal("562000"))
                .content("RUT GV1001 0999888777") // STK khác với 0398123456
                .transactionDate(LocalDateTime.now())
                .status("UNMATCHED")
                .build();

        when(paymentTransactionRepository.findOutgoingByReference("FT26110800126"))
                .thenReturn(List.of(tx));

        SepayPayoutCheckResult result = service.verifyPayoutTransaction(payoutRequest, "FT26110800126");

        assertFalse(result.matched());
        assertTrue(result.checks().amountMatched());
        assertTrue(result.checks().teacherCodeMatched());
        assertFalse(result.checks().bankAccountMatched());
        assertTrue(result.message().contains("số tài khoản"));
    }

    @Test
    @DisplayName("Thất bại: Không tìm thấy giao dịch tiền ra nào trên SePay")
    void verifyPayout_Fails_WhenNoTransactionFound() {
        when(paymentTransactionRepository.findOutgoingByReference("FT_NON_EXIST"))
                .thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findUnmatchedOutgoingByAmount(any()))
                .thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findRecentOutgoing(any()))
                .thenReturn(Collections.emptyList());

        SepayPayoutCheckResult result = service.verifyPayoutTransaction(payoutRequest, "FT_NON_EXIST");

        assertFalse(result.matched());
        assertTrue(result.message().contains("Không tìm thấy giao dịch chuyển tiền"));
    }
}
