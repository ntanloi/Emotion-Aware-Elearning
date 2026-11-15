package com.elearning.emotion.repository;

import com.elearning.emotion.entity.EmailOtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailOtpVerificationRepository extends JpaRepository<EmailOtpVerification, String> {

    Optional<EmailOtpVerification> findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(String email, String type);

    List<EmailOtpVerification> findByEmailAndTypeAndUsedFalse(String email, String type);
}
