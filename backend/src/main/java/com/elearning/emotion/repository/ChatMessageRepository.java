package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);
    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    long countByConversation_User_IdAndSenderAndCreatedAtAfter(String userId, String sender, LocalDateTime after);
}
