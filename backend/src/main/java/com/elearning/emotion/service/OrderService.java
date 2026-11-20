package com.elearning.emotion.service;

import com.elearning.emotion.config.PaymentProperties;
import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.config.WalletProperties;
import com.elearning.emotion.dto.*;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final TeacherWalletEntryRepository teacherWalletEntryRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final PaymentProperties paymentProperties;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;
    private final WalletTopupService walletTopupService;
    private final ContentItemRepository contentItemRepository;
    private final RewardProperties rewardProperties;
    private final WalletProperties walletProperties;
    private final EnrollmentLifecycleService enrollmentLifecycleService;
    private final RewardEscrowService rewardEscrowService;
    private final SepayPayoutVerificationService sepayPayoutVerificationService;

    private static final Pattern ORDER_CODE_PATTERN = Pattern.compile("ELN[A-Z0-9]{8}", Pattern.CASE_INSENSITIVE);
    private static final Pattern TOPUP_CODE_PATTERN = Pattern.compile("NAP[A-Z0-9]{8}", Pattern.CASE_INSENSITIVE);

    /**
     * H1: Tạo đơn hàng mới hoặc trả về đơn hàng PENDING còn hạn cho khóa học.
     * QR sử dụng tài khoản ngân hàng của nền tảng (cấu hình trong app.payment.*).
     */
    @Transactional
    public OrderDto createOrder(String userId, String courseId) {
        if (!walletProperties.isLegacyQrEnabled()) {
            throw new IllegalArgumentException("Hệ thống đã chuyển sang thanh toán bằng ví học viên. Vui lòng nạp tiền vào ví để mua khóa học.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng"));

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khóa học"));

        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new IllegalArgumentException("Khóa học chưa được công khai");
        }

        if (enrollmentRepository.existsByUserIdAndCourseId(userId, courseId)
                || orderRepository.existsByUserIdAndCourseIdAndStatus(userId, courseId, "PAID")) {
            throw new IllegalArgumentException("Bạn đã sở hữu khóa học này rồi");
        }

        BigDecimal price = course.getPrice() != null ? course.getPrice().setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Khóa học này miễn phí, hãy nhấn Đăng ký trực tiếp");
        }

        // Tái sử dụng đơn PENDING gần nhất nếu còn hiệu lực
        var existingOrderOpt = orderRepository.findFirstByUserIdAndCourseIdAndStatusOrderByCreatedAtDesc(userId, courseId, "PENDING");
        LocalDateTime now = LocalDateTime.now();

        if (existingOrderOpt.isPresent()) {
            Order existingOrder = existingOrderOpt.get();
            boolean isExpired = existingOrder.getExpiredAt() != null && existingOrder.getExpiredAt().isBefore(now);
            if (!isExpired) {
                boolean amountChanged = existingOrder.getAmount() == null || existingOrder.getAmount().compareTo(price) != 0;
                if (amountChanged) {
                    existingOrder.setAmount(price);
                }
                String freshQrUrl = generatePlatformVietQrUrl(existingOrder.getOrderCode(), price);
                if (amountChanged || !freshQrUrl.equals(existingOrder.getQrUrl())) {
                    existingOrder.setQrUrl(freshQrUrl);
                    existingOrder = orderRepository.save(existingOrder);
                }
                return toDto(existingOrder);
            }
        }

        // Tạo orderCode ngẫu nhiên dạng ELN + 8 ký tự viết hoa
        String shortCode = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        String orderCode = "ELN" + shortCode;

        // QR dùng tài khoản nền tảng
        String qrUrl = generatePlatformVietQrUrl(orderCode, price);

        LocalDateTime expiredAt = now.plusHours(paymentProperties.getOrderExpireHours());

        Order order = Order.builder()
                .orderCode(orderCode)
                .user(user)
                .course(course)
                .amount(price)
                .status("PENDING")
                .paymentMethod("VIETQR")
                .platformFee(BigDecimal.ZERO)
                .teacherAmount(BigDecimal.ZERO)
                .qrUrl(qrUrl)
                .expiredAt(expiredAt)
                .build();

        Order saved = orderRepository.save(order);
        log.info("Created order {} for user {} on course {} with amount {}, expiresAt {}",
                orderCode, userId, courseId, price, expiredAt);
        return toDto(saved);
    }

    @Transactional
    public OrderDto getOrder(String orderId, String userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(userId)) {
            User requester = userRepository.findById(userId).orElse(null);
            if (requester == null || !"ADMIN".equals(requester.getRole())) {
                throw new IllegalArgumentException("Bạn không có quyền xem đơn hàng này");
            }
        }

        if ("PENDING".equals(order.getStatus())) {
            String freshQrUrl = generatePlatformVietQrUrl(order.getOrderCode(), order.getAmount());
            if (!freshQrUrl.equals(order.getQrUrl())) {
                order.setQrUrl(freshQrUrl);
                order = orderRepository.save(order);
            }
        }

        return toDto(order);
    }

    @Transactional(readOnly = true)
    public List<OrderDto> getMyOrders(String userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public OrderDto cancelOrder(String orderId, String userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));

        if (!order.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Bạn không có quyền hủy đơn hàng này");
        }

        if (!"PENDING".equals(order.getStatus())) {
            throw new IllegalArgumentException("Chỉ có thể hủy đơn hàng đang chờ thanh toán (PENDING).");
        }

        order.setStatus("CANCELLED");
        return toDto(orderRepository.save(order));
    }

    /**
     * H1: Webhook tiếp nhận biến động số dư SePay.
     * - Chỉ nhận tiền vào (transferType = in)
     * - Kiểm tra tài khoản nhận đúng tài khoản nền tảng
     * - Ghi vào payment_transactions trước (khóa sepay_id duy nhất chống duplicate)
     * - Tách mã ELN...
     * - Khóa bi quan (PESSIMISTIC_WRITE) đơn hàng
     * - So số tiền khớp 100%
     * - Nếu đơn PAID: ghi danh, tính hoa hồng, ghi dòng SALE vào ví giảng viên (hold 7 ngày), gửi thông báo.
     */
    @Transactional
    public Map<String, Object> processSepayWebhook(SepayWebhookPayload payload, String rawPayload) {
        log.info("Processing SePay webhook: id={}, transferType={}, amount={}, content={}",
                payload.id(), payload.transferType(), payload.transferAmount(), payload.content());

        // Nếu là giao dịch tiền ra (transferType = out), chuyển sang luồng xử lý tiền chuyển đi của Admin/Hệ thống
        if (payload.transferType() != null && "out".equalsIgnoreCase(payload.transferType())) {
            return processOutgoingSepayWebhook(payload, rawPayload);
        }

        // 1. Chỉ nhận tiền vào (transferType = in)
        if (payload.transferType() != null && !"in".equalsIgnoreCase(payload.transferType())) {
            log.info("Ignored non-incoming transferType: {}", payload.transferType());
            return Map.of("success", true, "message", "Ignored transferType: " + payload.transferType());
        }

        // 2. Kiểm tra id giao dịch và chống xử lý lặp lại (Idempotency)
        if (payload.id() != null && paymentTransactionRepository.existsBySepayId(payload.id())) {
            log.warn("SePay transaction with sepay_id={} already processed. Skipping duplicate.", payload.id());
            return Map.of("success", true, "message", "Duplicate transaction ignored: " + payload.id());
        }

        LocalDateTime txDate = parseDateTime(payload.transactionDate());
        BigDecimal transferAmount = payload.transferAmount() != null
                ? payload.transferAmount().setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        PaymentTransaction tx = PaymentTransaction.builder()
                .sepayId(payload.id())
                .gateway("SePay")
                .transactionDate(txDate)
                .accountNumber(payload.accountNumber())
                .subAccount(payload.subAccount())
                .transferType(payload.transferType())
                .transferAmount(transferAmount)
                .accumulated(payload.accumulated())
                .code(payload.code())
                .content(payload.content())
                .referenceCode(payload.referenceCode())
                .description(payload.description())
                .status("UNMATCHED")
                .rawPayload(rawPayload)
                .build();

        // 2b. Nếu payload thiếu id từ SePay, lưu UNMATCHED và tuyệt đối không kích hoạt đơn hàng
        if (payload.id() == null) {
            tx.setAdminNote("Webhook payload thiếu mã định danh giao dịch (id) từ SePay");
            paymentTransactionRepository.save(tx);
            log.warn("SePay webhook payload missing transaction id, recorded as UNMATCHED");
            return Map.of("success", false, "message", "Missing transaction id, recorded as UNMATCHED");
        }

        // 3. Kiểm tra tài khoản nhận đúng của nền tảng (ưu tiên STK Admin trong CSDL, fallback sang app.payment.*)
        PlatformBankInfo platformBank = getPlatformBankInfo();
        String expectedAccountNo = platformBank.accountNo();
        String fallbackAccountNo = paymentProperties.getAccountNo();

        boolean hasAccount = payload.accountNumber() != null && !payload.accountNumber().isBlank();
        boolean accountMatch = hasAccount && (
                (expectedAccountNo != null && !expectedAccountNo.isBlank() && expectedAccountNo.trim().equalsIgnoreCase(payload.accountNumber().trim()))
                || (fallbackAccountNo != null && !fallbackAccountNo.isBlank() && fallbackAccountNo.trim().equalsIgnoreCase(payload.accountNumber().trim()))
        );

        if (!accountMatch) {
            tx.setStatus("UNMATCHED");
            if (!hasAccount) {
                tx.setAdminNote("Payload không có số tài khoản nhận (accountNumber). Giao dịch không hợp lệ.");
            } else {
                tx.setAdminNote("Tài khoản nhận (" + payload.accountNumber() + ") không khớp với tài khoản nền tảng (" + expectedAccountNo + ")");
            }
            paymentTransactionRepository.save(tx);
            log.warn("SePay transaction {} sent to invalid or wrong account {}", payload.id(), payload.accountNumber());
            return Map.of("success", true, "message", "Account mismatch, recorded as UNMATCHED");
        }

        // 4. Tìm mã nạp NAPxxxxxxxx hoặc mã đơn cũ ELNxxxxxxxx
        String textToSearch = (payload.content() != null ? payload.content() : "") + " "
                + (payload.code() != null ? payload.code() : "") + " "
                + (payload.description() != null ? payload.description() : "");

        BigDecimal amount = transferAmount.setScale(0, RoundingMode.HALF_UP);

        Matcher topup = TOPUP_CODE_PATTERN.matcher(textToSearch);
        if (topup.find()) {
            return walletTopupService.handleTopup(tx, topup.group().toUpperCase(), amount);
        }

        Matcher eln = ORDER_CODE_PATTERN.matcher(textToSearch);
        if (eln.find()) {
            Order order = orderRepository.findByOrderCode(eln.group().toUpperCase()).orElse(null);
            if (order != null) {
                return walletTopupService.creditToOrderOwner(tx, order, amount,
                        "Chuyển khoản theo mã đơn cũ " + order.getOrderCode() + ", đã cộng vào ví");
            }
        }

        tx.setStatus("UNMATCHED");
        tx.setAdminNote("Không tìm thấy mã đơn hàng ELN... hoặc mã nạp NAP... trong nội dung chuyển khoản");
        paymentTransactionRepository.save(tx);
        log.warn("No ELN order code or NAP topup code found in SePay content: {}", textToSearch);
        return Map.of("success", true, "message", "No order code or topup code found, recorded as UNMATCHED");
    }

    /**
     * Xử lý webhook luồng tiền ra (transferType = out) của Admin khi chuyển khoản giải ngân cho giảng viên.
     */
    @Transactional
    public Map<String, Object> processOutgoingSepayWebhook(SepayWebhookPayload payload, String rawPayload) {
        log.info("Processing outgoing SePay webhook: id={}, amount={}, content={}",
                payload.id(), payload.transferAmount(), payload.content());

        if (payload.id() != null && paymentTransactionRepository.existsBySepayId(payload.id())) {
            log.warn("SePay outgoing transaction with sepay_id={} already processed. Skipping duplicate.", payload.id());
            return Map.of("success", true, "message", "Duplicate outgoing transaction ignored: " + payload.id());
        }

        LocalDateTime txDate = parseDateTime(payload.transactionDate());
        BigDecimal transferAmount = payload.transferAmount() != null
                ? payload.transferAmount().setScale(0, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        PaymentTransaction tx = PaymentTransaction.builder()
                .sepayId(payload.id())
                .gateway(payload.gateway() != null ? payload.gateway() : "SePay")
                .transactionDate(txDate)
                .accountNumber(payload.accountNumber())
                .subAccount(payload.subAccount())
                .transferType("out")
                .transferAmount(transferAmount)
                .accumulated(payload.accumulated())
                .code(payload.code())
                .content(payload.content())
                .referenceCode(payload.referenceCode())
                .description(payload.description())
                .kind("PAYOUT")
                .status("UNMATCHED")
                .rawPayload(rawPayload)
                .build();

        if (payload.id() == null) {
            tx.setAdminNote("Webhook payload tiền ra thiếu mã định danh giao dịch (id) từ SePay");
            paymentTransactionRepository.save(tx);
            return Map.of("success", false, "message", "Missing transaction id, recorded as UNMATCHED");
        }

        // Tự động tìm và khớp với các yêu cầu rút tiền đang chờ (PENDING)
        List<PayoutRequest> pendingPayouts = payoutRequestRepository.findByStatus("PENDING");
        PayoutRequest matchedPayout = null;

        for (PayoutRequest p : pendingPayouts) {
            String checkRef = payload.referenceCode() != null && !payload.referenceCode().isBlank()
                    ? payload.referenceCode()
                    : String.valueOf(payload.id());
            SepayPayoutCheckResult check = sepayPayoutVerificationService.verifyPayoutTransaction(p, checkRef);
            if (check.matched()) {
                matchedPayout = p;
                break;
            }
        }

        if (matchedPayout != null) {
            tx.setStatus("MATCHED");
            tx.setPayoutRequest(matchedPayout);
            String teacherName = matchedPayout.getTeacher() != null ? matchedPayout.getTeacher().getFullName() : "N/A";
            String teacherCode = matchedPayout.getTeacher() != null ? matchedPayout.getTeacher().getTeacherCode() : "N/A";
            tx.setAdminNote("Tự động nhận diện giao dịch chuyển tiền SePay cho giảng viên: "
                    + teacherName + " (Mã GV: " + teacherCode + ") - STK: " + matchedPayout.getBankAccountNo());
            paymentTransactionRepository.save(tx);

            try {
                realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of(
                        "reason", "SEPAY_PAYOUT_DETECTED",
                        "payoutId", matchedPayout.getId(),
                        "sepayId", tx.getSepayId(),
                        "amount", tx.getTransferAmount()
                ));
            } catch (Exception ignored) {}

            log.info("Successfully matched outgoing SePay transaction {} with payout request {}", tx.getSepayId(), matchedPayout.getId());
            return Map.of("success", true, "message", "Matched outgoing payout transaction", "payoutId", matchedPayout.getId());
        } else {
            tx.setAdminNote("Giao dịch chi tiền SePay chưa khớp với yêu cầu rút tiền nào (chưa đúng số tiền, mã GV hoặc STK)");
            paymentTransactionRepository.save(tx);
            log.info("Outgoing SePay transaction {} recorded as UNMATCHED", tx.getSepayId());
            return Map.of("success", true, "message", "Recorded unmatched outgoing transaction");
        }
    }

    /**
     * Hoàn tất đơn hàng PAID: Ghi danh chu kỳ học, tính hoa hồng, tách 5/10/85, tạo escrow và ghi ví giảng viên.
     */
    @Transactional
    public void fulfillOrder(Order order, BigDecimal paidAmount, String source) {
        LocalDateTime now = LocalDateTime.now();
        order.setStatus("PAID");
        order.setPaidAt(now);
        order.setPaidAmount(paidAmount);

        // Tính toán hoa hồng và phần của giảng viên
        BigDecimal feePercent = paymentProperties.getPlatformFeePercent() != null
                ? paymentProperties.getPlatformFeePercent() : BigDecimal.ZERO;

        List<String> videoIds = List.of();
        BigDecimal escrowPercent = BigDecimal.ZERO;
        User teacher = order.getCourse().getTeacher();

        if (rewardProperties.isEnabled() && "WALLET".equals(order.getPaymentMethod()) && teacher != null) {
            videoIds = contentItemRepository.findTrackableVideoIds(order.getCourse().getId());
            if (!videoIds.isEmpty()) {
                escrowPercent = rewardProperties.getEscrowPercent();
            }
        }

        // Ghi rõ lý do khi KHÔNG giữ hộ 10% để dễ dò lỗi cấu hình
        if (escrowPercent.signum() <= 0) {
            log.info("[Escrow] Order {} KHÔNG tạo giữ hộ: reward.enabled={}, paymentMethod={}, teacher={}, trackableVideos={}",
                    order.getOrderCode(), rewardProperties.isEnabled(), order.getPaymentMethod(),
                    teacher != null, videoIds.size());
        }

        BigDecimal platformFee = pct(paidAmount, feePercent);
        BigDecimal escrow = pct(paidAmount, escrowPercent);
        BigDecimal teacherAmount = paidAmount.subtract(platformFee).subtract(escrow);

        order.setPlatformFee(platformFee);
        order.setRewardEscrowAmount(escrow);
        order.setTeacherAmount(teacherAmount);
        order.setFeePercent(feePercent);
        order.setEscrowPercent(escrowPercent);
        order.setPolicyVersion(rewardProperties.getPolicyVersion());
        order.setAccessMonths(order.getCourse().getAccessMonths());
        orderRepository.save(order);

        // Kích hoạt ghi danh học viên và mở chu kỳ học
        Enrollment enrollment = enrollmentLifecycleService.openCycle(order);

        if (escrow.signum() > 0) {
            rewardEscrowService.createFor(order, videoIds, escrow, enrollment.getExpiresAt());
        }

        // Ghi sổ cái ví giảng viên (SALE) khả dụng ngay lập tức với teacherAmount (đã trừ escrow)
        if (teacher != null && !teacherWalletEntryRepository.existsByOrderIdAndType(order.getId(), "SALE")) {
            TeacherWalletEntry entry = TeacherWalletEntry.builder()
                    .teacher(teacher)
                    .order(order)
                    .type("SALE")
                    .amount(teacherAmount)
                    .availableAt(now)
                    .description("Bán khóa học: " + order.getCourse().getTitle() + " (Đơn: " + order.getOrderCode() + ")")
                    .build();
            teacherWalletEntryRepository.save(entry);
            log.info("Recorded wallet SALE entry of {} VND for teacher {}, availableAt {}",
                    teacherAmount, teacher.getId(), now);

            String teacherNotif;
            if (escrow.signum() > 0) {
                teacherNotif = "Khóa học \"" + order.getCourse().getTitle() + "\" vừa có học viên ghi danh thành công. "
                        + "Số tiền " + String.format("%,d", teacherAmount.longValue()) + " đ đã được cộng vào số dư khả dụng của bạn. "
                        + "Số tiền " + String.format("%,d", escrow.longValue()) + " đ (10%) đang được giữ hộ theo chương trình thưởng học tập.";
            } else {
                teacherNotif = "Khóa học \"" + order.getCourse().getTitle() + "\" vừa có học viên ghi danh thành công. "
                        + "Số tiền " + String.format("%,d", teacherAmount.longValue()) + " đ đã được cộng vào số dư khả dụng của bạn.";
            }

            // Thông báo cho Giảng viên
            notificationService.send(
                    teacher.getId(),
                    "Có học viên mới đăng ký khóa học!",
                    teacherNotif,
                    "FINANCE",
                    order.getId(),
                    "/dashboard/teacher?tab=transactions"
            );
        }

        // Thông báo cho Học viên
        notificationService.send(
                order.getUser().getId(),
                "Thanh toán thành công!",
                "Bạn đã thanh toán thành công khóa học \"" + order.getCourse().getTitle() + "\". Chúc bạn học tập hiệu quả!",
                "PAYMENT",
                order.getId(),
                "/courses/" + order.getCourse().getId() + "/learn"
        );

        // Phát sự kiện realtime cho học viên sở hữu đơn hàng để Modal đóng/thông báo ngay lập tức
        try {
            realtimePublisher.publishToUser(order.getUser().getId(), "payment", Map.of(
                    "orderId", order.getId(),
                    "orderCode", order.getOrderCode(),
                    "status", "PAID"
            ));
        } catch (Exception ex) {
            log.warn("[OrderService] Không thể phát sự kiện payment PAID: {}", ex.getMessage());
        }
    }

    public static BigDecimal pct(BigDecimal base, BigDecimal percent) {
        if (percent == null || percent.signum() <= 0) return BigDecimal.ZERO;
        return base.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    /**
     * H1: Admin khớp thủ công giao dịch SePay chưa khớp (UNMATCHED / AMOUNT_MISMATCH) với một mã đơn hàng.
     * Bắt buộc có ghi chú và ghi vào audit_logs.
     */
    @Transactional
    public OrderDto manualMatchTransaction(String adminId, String txId, String orderCode, String adminNote) {
        if (adminNote == null || adminNote.trim().isBlank()) {
            throw new IllegalArgumentException("Bắt buộc phải nhập ghi chú đối soát khi khớp đơn thủ công.");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        PaymentTransaction tx = paymentTransactionRepository.findById(txId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giao dịch ngân hàng"));

        if ("MATCHED".equals(tx.getStatus())) {
            throw new IllegalArgumentException("Giao dịch này đã được khớp trước đó.");
        }

        Order order = orderRepository.findByOrderCodeWithLock(orderCode)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng mã " + orderCode));

        if ("PAID".equals(order.getStatus())) {
            throw new IllegalArgumentException("Đơn hàng này đã ở trạng thái thanh toán PAID.");
        }

        tx.setStatus("MATCHED");
        tx.setOrder(order);
        tx.setAdminNote("Khớp thủ công bởi Admin (" + admin.getFullName() + "): " + adminNote.trim());
        paymentTransactionRepository.save(tx);

        fulfillOrder(order, tx.getTransferAmount(), "MANUAL_MATCH_ADMIN");

        auditService.log(admin, "MANUAL_MATCH_TRANSACTION", "PAYMENT_TRANSACTION", txId,
                "Khớp thủ công giao dịch SePay #" + tx.getSepayId() + " (" + tx.getTransferAmount() + " đ) vào đơn " + orderCode + ". Lý do: " + adminNote.trim());

        return toDto(order);
    }

    /**
     * H1: Admin duyệt chi yêu cầu rút tiền của giảng viên (APPROVED).
     * BẮT BUỘC: Kiểm tra giao dịch SePay ở luồng tiền chuyển đi của Admin.
     * Xác thực 3 tiêu chuẩn:
     * 1. Đúng số tiền
     * 2. Đúng mã giảng viên
     * 3. Đúng số tài khoản nhận của giảng viên
     */
    @Transactional
    public PayoutRequestDto approvePayout(String adminId, String payoutId, String transactionRef, String adminNote) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        PayoutRequest req = payoutRequestRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu rút tiền"));

        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalArgumentException("Yêu cầu này không ở trạng thái chờ duyệt (PENDING).");
        }

        // BẮT BUỘC: Kiểm tra luồng tiền chuyển đi trên SePay
        SepayPayoutCheckResult checkResult = sepayPayoutVerificationService.verifyPayoutTransaction(req, transactionRef);
        if (!checkResult.matched()) {
            throw new IllegalArgumentException("Không thể duyệt chi! Xác thực SePay thất bại: " + checkResult.message());
        }

        // Cập nhật trạng thái giao dịch SePay thành MATCHED và liên kết với yêu cầu rút
        PaymentTransaction tx = null;
        if (checkResult.transaction() != null && checkResult.transaction().sepayId() != null) {
            tx = paymentTransactionRepository.findBySepayId(checkResult.transaction().sepayId()).orElse(null);
            if (tx != null) {
                tx.setStatus("MATCHED");
                tx.setPayoutRequest(req);
                String tCode = req.getTeacher() != null ? req.getTeacher().getTeacherCode() : "";
                tx.setAdminNote("Đã duyệt chi giải ngân thành công cho giảng viên "
                        + (req.getTeacher() != null ? req.getTeacher().getFullName() : "")
                        + " (Mã GV: " + tCode + ") - STK: " + req.getBankAccountNo());
                paymentTransactionRepository.save(tx);
            }
        }

        LocalDateTime now = LocalDateTime.now();
        req.setStatus("APPROVED");
        String effectiveRef = (tx != null && tx.getReferenceCode() != null && !tx.getReferenceCode().isBlank())
                ? tx.getReferenceCode()
                : (transactionRef != null && !transactionRef.trim().isBlank() ? transactionRef.trim() : (tx != null ? String.valueOf(tx.getSepayId()) : "SEPAY"));
        req.setTransactionRef(effectiveRef);
        req.setAdminNote(adminNote != null ? adminNote.trim() : null);
        req.setProcessedAt(now);
        req.setProcessedBy(admin);
        PayoutRequest saved = payoutRequestRepository.save(req);

        // Ghi một dòng PAYOUT âm vào sổ cái ví giảng viên
        TeacherWalletEntry payoutEntry = TeacherWalletEntry.builder()
                .teacher(req.getTeacher())
                .payoutRequest(saved)
                .type("PAYOUT")
                .amount(req.getAmount().negate())
                .availableAt(now)
                .description("Rút tiền về STK " + req.getBankAccountNo() + " (" + req.getBankId() + ") - Mã GD SePay: " + effectiveRef)
                .build();
        teacherWalletEntryRepository.save(payoutEntry);

        notificationService.send(
                req.getTeacher().getId(),
                "Yêu cầu rút tiền đã được giải ngân thành công",
                "Số tiền " + String.format("%,d", req.getAmount().longValue()) + " đ đã được chuyển vào tài khoản "
                        + req.getBankAccountNo() + " (" + req.getBankId() + "). Mã giao dịch SePay: " + effectiveRef,
                "FINANCE",
                saved.getId(),
                "/dashboard/teacher?tab=transactions"
        );

        auditService.log(admin, "PAYOUT_APPROVED", "PAYOUT_REQUEST", payoutId,
                "Duyệt chi yêu cầu rút " + req.getAmount() + " đ cho giảng viên " + req.getTeacher().getEmail()
                        + " (Mã GV: " + (req.getTeacher() != null ? req.getTeacher().getTeacherCode() : "") + "). Mã GD SePay: " + effectiveRef);

        try {
            realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of("reason", "PAYOUT_APPROVED", "payoutId", payoutId));
        } catch (Exception ignored) {}

        return PayoutRequestDto.from(saved, tx);
    }

    /**
     * Kiểm tra SePay độc lập trước khi duyệt chi (dùng cho modal xem trước của Admin).
     */
    @Transactional(readOnly = true)
    public SepayPayoutCheckResult checkPayoutSepay(String payoutId, String transactionRef) {
        PayoutRequest req = payoutRequestRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu rút tiền"));
        return sepayPayoutVerificationService.verifyPayoutTransaction(req, transactionRef);
    }

    /**
     * H1: Admin từ chối yêu cầu rút tiền của giảng viên (REJECTED).
     */
    @Transactional
    public PayoutRequestDto rejectPayout(String adminId, String payoutId, String reason) {
        if (reason == null || reason.trim().isBlank()) {
            throw new IllegalArgumentException("Bắt buộc phải nhập lý do từ chối yêu cầu rút tiền.");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy quản trị viên"));

        PayoutRequest req = payoutRequestRepository.findById(payoutId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu rút tiền"));

        if (!"PENDING".equals(req.getStatus())) {
            throw new IllegalArgumentException("Yêu cầu này không ở trạng thái chờ duyệt (PENDING).");
        }

        req.setStatus("REJECTED");
        req.setAdminNote(reason.trim());
        req.setProcessedAt(LocalDateTime.now());
        req.setProcessedBy(admin);
        PayoutRequest saved = payoutRequestRepository.save(req);

        notificationService.send(
                req.getTeacher().getId(),
                "Yêu cầu rút tiền không được chấp thuận",
                "Yêu cầu rút " + String.format("%,d", req.getAmount().longValue()) + " đ đã bị từ chối. Lý do: " + reason.trim(),
                "FINANCE",
                saved.getId(),
                "/dashboard/teacher?tab=transactions"
        );

        auditService.log(admin, "PAYOUT_REJECTED", "PAYOUT_REQUEST", payoutId,
                "Từ chối yêu cầu rút " + req.getAmount() + " đ của giảng viên " + req.getTeacher().getEmail() + ". Lý do: " + reason.trim());

        try {
            realtimePublisher.publishToRole("ADMIN", "admin-stats", Map.of("reason", "PAYOUT_REJECTED", "payoutId", payoutId));
        } catch (Exception ignored) {}

        return PayoutRequestDto.from(saved);
    }

    /**
     * Job: Quét và đánh dấu các đơn hàng PENDING đã quá 24h là EXPIRED
     */
    @Transactional
    public int expireOverdueOrders() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(paymentProperties.getOrderExpireHours());
        List<Order> overdueOrders = orderRepository.findPendingOrdersOlderThan(threshold);
        if (overdueOrders.isEmpty()) return 0;

        for (Order o : overdueOrders) {
            o.setStatus("EXPIRED");
            o.setExpiredAt(LocalDateTime.now());
            if (o.getUser() != null) {
                try {
                    realtimePublisher.publishToUser(o.getUser().getId(), "payment", Map.of(
                            "orderId", o.getId(),
                            "orderCode", o.getOrderCode(),
                            "status", "EXPIRED"
                    ));
                } catch (Exception ex) {
                    log.warn("[OrderService] Không thể phát sự kiện payment EXPIRED: {}", ex.getMessage());
                }
            }
        }
        orderRepository.saveAll(overdueOrders);
        log.info("Expired {} overdue PENDING orders older than {}", overdueOrders.size(), threshold);
        return overdueOrders.size();
    }

    // =========================================================================
    // QUẢN TRỊ ADMIN (QUERY & LISTING)
    // =========================================================================

    @Transactional(readOnly = true)
    public Page<OrderDto> getAdminOrders(String status, String q, Pageable pageable) {
        Specification<Order> spec = Specification.where(null);
        if (status != null && !status.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status.toUpperCase()));
        }
        if (q != null && !q.isBlank()) {
            String pattern = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("orderCode")), pattern),
                    cb.like(cb.lower(root.get("user").get("fullName")), pattern),
                    cb.like(cb.lower(root.get("user").get("email")), pattern),
                    cb.like(cb.lower(root.get("course").get("title")), pattern)
            ));
        }
        return orderRepository.findAll(spec, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Page<PaymentTransactionDto> getPaymentTransactions(String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            return paymentTransactionRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable)
                    .map(PaymentTransactionDto::from);
        }
        return paymentTransactionRepository.findAll(pageable).map(PaymentTransactionDto::from);
    }

    @Transactional(readOnly = true)
    public Page<PayoutRequestDto> getAdminPayoutRequests(String status, Pageable pageable) {
        Page<PayoutRequest> page;
        if (status != null && !status.isBlank()) {
            page = payoutRequestRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable);
        } else {
            page = payoutRequestRepository.findAll(pageable);
        }
        return page.map(req -> {
            PaymentTransaction tx = paymentTransactionRepository.findByPayoutRequestId(req.getId()).orElse(null);
            return PayoutRequestDto.from(req, tx);
        });
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminFinanceSummary() {
        BigDecimal totalRevenue = orderRepository.sumTotalPaidRevenue();
        long paidOrdersCount = orderRepository.countByStatus("PAID");
        long pendingOrdersCount = orderRepository.countByStatus("PENDING");
        long expiredOrdersCount = orderRepository.countByStatus("EXPIRED");
        long totalOrdersCount = orderRepository.count();

        long pendingPayoutCount = payoutRequestRepository.countByStatus("PENDING");
        BigDecimal pendingPayoutAmount = payoutRequestRepository.sumTotalPendingPayout();
        long approvedPayoutCount = payoutRequestRepository.countByStatus("APPROVED");
        BigDecimal approvedPayoutAmount = payoutRequestRepository.sumTotalApprovedPayout();
        long rejectedPayoutCount = payoutRequestRepository.countByStatus("REJECTED");

        long unmatchedTxCount = paymentTransactionRepository.countByStatus("UNMATCHED")
                + paymentTransactionRepository.countByStatus("AMOUNT_MISMATCH");
        long matchedTxCount = paymentTransactionRepository.countByStatus("MATCHED");
        BigDecimal totalMatchedInflow = paymentTransactionRepository.sumTotalMatchedInflow();
        long totalTxCount = paymentTransactionRepository.count();

        Map<String, Object> res = new HashMap<>();
        res.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);
        res.put("paidOrdersCount", paidOrdersCount);
        res.put("pendingOrdersCount", pendingOrdersCount);
        res.put("expiredOrdersCount", expiredOrdersCount);
        res.put("totalOrdersCount", totalOrdersCount);

        res.put("pendingPayoutCount", pendingPayoutCount);
        res.put("pendingPayoutAmount", pendingPayoutAmount != null ? pendingPayoutAmount : BigDecimal.ZERO);
        res.put("approvedPayoutCount", approvedPayoutCount);
        res.put("approvedPayoutAmount", approvedPayoutAmount != null ? approvedPayoutAmount : BigDecimal.ZERO);
        res.put("rejectedPayoutCount", rejectedPayoutCount);

        res.put("unmatchedTxCount", unmatchedTxCount);
        res.put("matchedTxCount", matchedTxCount);
        res.put("totalMatchedInflow", totalMatchedInflow != null ? totalMatchedInflow : BigDecimal.ZERO);
        res.put("totalTxCount", totalTxCount);
        return res;
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    public record PlatformBankInfo(String bankId, String accountNo, String accountName, String template) {}

    /**
     * Lấy thông tin tài khoản ngân hàng của nền tảng để sinh VietQR:
     * - Ưu tiên 1: Tài khoản do Quản trị viên (ADMIN) cấu hình trong cơ sở dữ liệu (qua trang Hồ sơ cá nhân).
     * - Ưu tiên 2: Cấu hình mặc định trong application.yml (app.payment.*).
     */
    public PlatformBankInfo getPlatformBankInfo() {
        try {
            List<User> admins = userRepository.findByRoleOrderByCreatedAtAsc("ADMIN");
            for (User admin : admins) {
                if (admin.getBankAccountNo() != null && !admin.getBankAccountNo().isBlank()) {
                    String bankId = (admin.getBankId() != null && !admin.getBankId().isBlank())
                            ? admin.getBankId().trim() : paymentProperties.getBankId();
                    String accountName = (admin.getBankAccountName() != null && !admin.getBankAccountName().isBlank())
                            ? admin.getBankAccountName().trim().toUpperCase() : paymentProperties.getAccountName();
                    return new PlatformBankInfo(bankId, admin.getBankAccountNo().trim(), accountName, paymentProperties.getTemplate());
                }
            }
        } catch (Exception ex) {
            log.warn("Could not load admin bank account from DB, falling back to properties: {}", ex.getMessage());
        }

        return new PlatformBankInfo(
                paymentProperties.getBankId(),
                paymentProperties.getAccountNo(),
                paymentProperties.getAccountName(),
                paymentProperties.getTemplate()
        );
    }

    public String generatePlatformVietQrUrl(String code, BigDecimal amount) {
        PlatformBankInfo info = getPlatformBankInfo();
        String encodedAccountName = URLEncoder.encode(info.accountName(), StandardCharsets.UTF_8);
        String encodedAddInfo = URLEncoder.encode(code, StandardCharsets.UTF_8);

        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            long amountLong = amount.longValue();
            return String.format("https://img.vietqr.io/image/%s-%s-%s.png?amount=%d&addInfo=%s&accountName=%s",
                    info.bankId(),
                    info.accountNo(),
                    info.template(),
                    amountLong,
                    encodedAddInfo,
                    encodedAccountName
            );
        } else {
            return String.format("https://img.vietqr.io/image/%s-%s-%s.png?addInfo=%s&accountName=%s",
                    info.bankId(),
                    info.accountNo(),
                    info.template(),
                    encodedAddInfo,
                    encodedAccountName
            );
        }
    }

    public String generatePlatformVietQrUrl(String code) {
        return generatePlatformVietQrUrl(code, null);
    }

    public OrderDto toDto(Order order) {
        PlatformBankInfo info = getPlatformBankInfo();
        String qrUrl = generatePlatformVietQrUrl(order.getOrderCode(), order.getAmount());
        return OrderDto.from(order, info.bankId(), info.accountNo(), info.accountName(), qrUrl);
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
}
