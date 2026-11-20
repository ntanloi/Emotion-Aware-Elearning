package com.elearning.emotion.service;

import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletReconciliationService {

    @PersistenceContext
    private final EntityManager em;

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public record Discrepancy(String rule, String description, List<Object> offendingIds) {}

    @Transactional(readOnly = true)
    public List<Discrepancy> runReconciliation() {
        List<Discrepancy> discrepancies = new ArrayList<>();

        // 1. Mỗi đơn PAID: ba phần cộng lại bằng số tiền đã trả
        check(discrepancies, "CHECK_1_ORDERS_SPLIT",
                "Đơn PAID có tổng 3 phần phí khác paid_amount",
                "SELECT id FROM orders WHERE status = 'PAID' AND paid_amount IS NOT NULL AND platform_fee + reward_escrow_amount + teacher_amount <> paid_amount");

        // 2. Số dư ví khớp tổng sổ cái
        check(discrepancies, "CHECK_2_STUDENT_WALLET_LEDGER",
                "Số dư ví học viên không khớp tổng sổ cái wallet_entries",
                "SELECT w.user_id FROM student_wallets w LEFT JOIN (SELECT user_id, SUM(CASE WHEN bucket = 'CASH' THEN amount ELSE 0 END) cash, SUM(CASE WHEN bucket = 'BONUS' THEN amount ELSE 0 END) bonus FROM wallet_entries GROUP BY user_id) s ON s.user_id = w.user_id WHERE w.cash_balance <> COALESCE(s.cash, 0) OR w.bonus_balance <> COALESCE(s.bonus, 0)");

        // 3. Escrow lệch với đơn hàng
        check(discrepancies, "CHECK_3_ESCROW_ORDER_MATCH",
                "Escrow có số tiền hoặc trạng thái đơn hàng không khớp",
                "SELECT e.id FROM reward_escrows e JOIN orders o ON o.id = e.order_id WHERE o.status <> 'PAID' OR o.reward_escrow_amount <> e.amount");

        // 4. Escrow đã quyết toán nhưng thiếu bút toán
        check(discrepancies, "CHECK_4_CLAIMED_ESCROW_LEDGER",
                "Escrow CLAIMED nhưng thiếu bút toán REWARD trong wallet_entries",
                "SELECT e.id FROM reward_escrows e LEFT JOIN wallet_entries w ON w.escrow_id = e.id AND w.type = 'REWARD' WHERE e.status = 'CLAIMED' AND w.id IS NULL");

        check(discrepancies, "CHECK_5_RELEASED_ESCROW_LEDGER",
                "Escrow RELEASED nhưng thiếu bút toán REWARD_RELEASE trong teacher_wallet_entries",
                "SELECT e.id FROM reward_escrows e LEFT JOIN teacher_wallet_entries t ON t.order_id = e.order_id AND t.type = 'REWARD_RELEASE' WHERE e.status = 'RELEASED' AND t.id IS NULL");

        // 5. Yêu cầu rút PENDING hoặc PAID phải có các dòng WITHDRAW cộng lại đúng bằng số tiền
        check(discrepancies, "CHECK_6_WITHDRAWALS_PENDING_OR_PAID",
                "Yêu cầu rút PENDING/PAID có tổng dòng WITHDRAW không bằng amount",
                "SELECT w.id FROM wallet_withdrawals w LEFT JOIN (SELECT withdrawal_id, -SUM(amount) total FROM wallet_entries WHERE type = 'WITHDRAW' GROUP BY withdrawal_id) e ON e.withdrawal_id = w.id WHERE w.status IN ('PENDING', 'PAID') AND COALESCE(e.total, 0) <> w.amount");

        // 6. Yêu cầu REJECTED phải có các dòng hoàn bằng đúng số đã trừ
        check(discrepancies, "CHECK_7_WITHDRAWALS_REJECTED",
                "Yêu cầu rút REJECTED có tổng dòng WITHDRAW_REVERSE không bằng amount",
                "SELECT w.id FROM wallet_withdrawals w LEFT JOIN (SELECT withdrawal_id, SUM(amount) total FROM wallet_entries WHERE type = 'WITHDRAW_REVERSE' GROUP BY withdrawal_id) r ON r.withdrawal_id = w.id WHERE w.status = 'REJECTED' AND COALESCE(r.total, 0) <> w.amount");

        // 7. Mỗi học viên chỉ có một yêu cầu PENDING
        check(discrepancies, "CHECK_8_MULTIPLE_PENDING_WITHDRAWALS",
                "Học viên có nhiều hơn 1 yêu cầu rút PENDING cùng lúc",
                "SELECT user_id FROM wallet_withdrawals WHERE status = 'PENDING' GROUP BY user_id HAVING COUNT(*) > 1");

        if (!discrepancies.isEmpty()) {
            log.error("[WalletReconciliation] Phát hiện {} vi phạm đối soát sổ cái ví!", discrepancies.size());
            for (Discrepancy d : discrepancies) {
                log.error("[WalletReconciliation] {}: {} -> IDs: {}", d.rule(), d.description(), d.offendingIds());
            }
            notifyAdmins(discrepancies);
        } else {
            log.info("[WalletReconciliation] Đối soát thành công, không phát hiện vi phạm.");
        }

        return discrepancies;
    }

    private void check(List<Discrepancy> list, String rule, String desc, String sql) {
        try {
            @SuppressWarnings("unchecked")
            List<Object> results = em.createNativeQuery(sql).getResultList();
            if (results != null && !results.isEmpty()) {
                list.add(new Discrepancy(rule, desc, results));
            }
        } catch (Exception ex) {
            log.error("[WalletReconciliation] Lỗi khi thực hiện kiểm tra {}: {}", rule, ex.getMessage(), ex);
        }
    }

    private void notifyAdmins(List<Discrepancy> discrepancies) {
        try {
            List<User> admins = userRepository.findByRoleOrderByCreatedAtAsc("ADMIN");
            for (User admin : admins) {
                notificationService.send(
                        admin.getId(),
                        "Cảnh báo đối soát ví hệ thống",
                        "Phát hiện " + discrepancies.size() + " lỗi lệch sổ cái trong đợt đối soát đêm nay. Vui lòng kiểm tra ngay.",
                        "FINANCE",
                        null,
                        "/admin/finance?tab=rewards-escrow"
                );
            }
        } catch (Exception ex) {
            log.warn("[WalletReconciliation] Không thể gửi thông báo admin: {}", ex.getMessage());
        }
    }
}
