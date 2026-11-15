package com.elearning.emotion.service;

import com.elearning.emotion.event.VideoAttemptValidatedEvent;
import com.elearning.emotion.repository.RewardEscrowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RewardEventListener {

    private final RewardEscrowRepository escrowRepo;
    private final RewardSettlementService settlement;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onValidated(VideoAttemptValidatedEvent ev) {
        log.info("Received VideoAttemptValidatedEvent: userId={}, contentItemId={}", ev.userId(), ev.contentItemId());
        List<String> holdingIds = escrowRepo.findHoldingIdsForVideo(ev.userId(), ev.contentItemId());
        for (String id : holdingIds) {
            try {
                settlement.evaluate(id);
            } catch (Exception ex) {
                log.error("Xét thưởng escrow {} lỗi: {}", id, ex.getMessage(), ex);
            }
        }
    }
}
