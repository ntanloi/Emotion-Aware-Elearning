package com.elearning.emotion.controller;

import com.elearning.emotion.dto.NotificationListDto;
import com.elearning.emotion.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public NotificationListDto getNotifications(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false, defaultValue = "20") int limit
    ) {
        if (userId == null) {
            throw new SecurityException("Vui lòng đăng nhập để xem thông báo");
        }
        return notificationService.getMyNotifications(userId, limit);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        if (userId == null) {
            throw new SecurityException("Vui lòng đăng nhập");
        }
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal String userId) {
        if (userId == null) {
            throw new SecurityException("Vui lòng đăng nhập");
        }
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }
}
