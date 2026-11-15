package com.elearning.emotion.service;

import com.elearning.emotion.entity.StudentWallet;
import com.elearning.emotion.repository.StudentWalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

@Component
@RequiredArgsConstructor
public class StudentWalletCreator {

    private final StudentWalletRepository walletRepo;
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bo O, 0, I, 1 cho de doc
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createIfAbsent(String userId) {
        if (walletRepo.existsById(userId)) return;
        StringBuilder code = new StringBuilder("NAP");
        for (int i = 0; i < 8; i++) {
            code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        walletRepo.saveAndFlush(StudentWallet.builder()
                .userId(userId)
                .topupCode(code.toString())
                .build());
    }
}
