package com.elearning.emotion.controller;

import com.elearning.emotion.dto.chat.ChatConversationDto;
import com.elearning.emotion.dto.chat.ChatMessageDto;
import com.elearning.emotion.dto.chat.CreateConversationRequest;
import com.elearning.emotion.dto.chat.SendMessageRequest;
import com.elearning.emotion.service.chat.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat/conversations")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChatConversationDto createConversation(
            @AuthenticationPrincipal String userId,
            @RequestBody(required = false) CreateConversationRequest req) {
        return chatService.createConversation(userId, req);
    }

    @GetMapping
    public List<ChatConversationDto> listConversations(@AuthenticationPrincipal String userId) {
        return chatService.listConversations(userId);
    }

    @GetMapping("/{id}/messages")
    public List<ChatMessageDto> getMessages(
            @PathVariable String id,
            @AuthenticationPrincipal String userId) {
        return chatService.getMessages(id, userId);
    }

    @PostMapping("/{id}/messages")
    public ChatMessageDto sendMessage(
            @PathVariable String id,
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody SendMessageRequest req) {
        return chatService.sendMessage(id, userId, req);
    }
}
