package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ChatConversation;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, String> {
    List<ChatConversation> findByUserIdOrderByStartedAtDesc(String userId, Pageable pageable);
    Optional<ChatConversation> findByIdAndUserId(String id, String userId);
}
