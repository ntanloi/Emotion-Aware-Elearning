package com.elearning.emotion.service;

import com.elearning.emotion.config.RewardProperties;
import com.elearning.emotion.entity.Order;
import com.elearning.emotion.entity.RewardEscrow;
import com.elearning.emotion.entity.RewardEscrowVideo;
import com.elearning.emotion.repository.RewardEscrowRepository;
import com.elearning.emotion.repository.RewardEscrowVideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardEscrowService {

    private final RewardEscrowRepository escrowRepo;
    private final RewardEscrowVideoRepository escrowVideoRepo;
    private final RewardProperties props;

    @Transactional
    public RewardEscrow createFor(Order order, List<String> videoIds, BigDecimal amount, LocalDateTime holdingUntil) {
        var existing = escrowRepo.findByOrderId(order.getId());
        if (existing.isPresent()) {
            return existing.get(); // gọi lại không tạo trùng
        }

        LocalDateTime deadline = holdingUntil != null ? holdingUntil
                : LocalDateTime.now().plusDays(props.getHoldingDays());

        RewardEscrow e = escrowRepo.save(RewardEscrow.builder()
                .orderId(order.getId())
                .userId(order.getUser().getId())
                .courseId(order.getCourse().getId())
                .teacherId(order.getCourse().getTeacher().getId())
                .amount(amount)
                .status("HOLDING")
                .requiredPercent(props.getRequiredVideoPercent())
                .policyVersion(props.getPolicyVersion())
                .holdingUntil(deadline)
                .build());

        for (String videoId : videoIds) {
            escrowVideoRepo.save(new RewardEscrowVideo(e.getId(), videoId));
        }

        log.info("Created RewardEscrow #{} for order {} with {} trackable videos, amount={}, holdingUntil={}",
                e.getId(), order.getOrderCode(), videoIds.size(), amount, deadline);
        return e;
    }
}
