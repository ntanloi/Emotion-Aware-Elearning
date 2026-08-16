package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, String> {
}
