package com.elearning.emotion.service;

import com.elearning.emotion.dto.NotificationDto;
import com.elearning.emotion.dto.NotificationListDto;
import com.elearning.emotion.entity.Notification;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.NotificationRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final com.elearning.emotion.service.realtime.RealtimePublisher realtimePublisher;

    @Transactional
    public void send(String userId, String title, String content, String type, String referenceId, String link) {
        if (userId == null) return;
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        Notification notif = Notification.builder()
                .user(user)
                .title(title)
                .content(content)
                .type(type != null ? type : "SYSTEM")
                .referenceId(referenceId)
                .link(link)
                .isRead(false)
                .build();
        Notification saved = notificationRepository.save(notif);
        log.info("Sent notification to user {}: {}", userId, title);

        try {
            long unread = notificationRepository.countByUserIdAndIsReadFalse(userId);
            realtimePublisher.publishToUser(userId, "notification", java.util.Map.of(
                    "notification", NotificationDto.from(saved),
                    "unreadCount", unread
            ));
        } catch (Exception ex) {
            log.warn("[NotificationService] Không thể phát sự kiện realtime cho user {}: {}", userId, ex.getMessage());
        }
    }

    @Transactional
    public void createNotification(String userId, String title, String content, String type, String link) {
        send(userId, title, content, type, null, link);
    }

    public NotificationListDto getMyNotifications(String userId, int limit) {
        int safeLimit = limit > 0 ? limit : 20;
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(
                userId,
                PageRequest.of(0, safeLimit)
        );
        long unread = notificationRepository.countByUserIdAndIsReadFalse(userId);
        List<NotificationDto> dtos = list.stream().map(NotificationDto::from).toList();
        return new NotificationListDto(dtos, unread);
    }

    @Transactional
    public void markAsRead(String notificationId, String userId) {
        Notification notif = notificationRepository.findByIdAndUserId(notificationId, userId).orElse(null);
        if (notif != null && !Boolean.TRUE.equals(notif.getIsRead())) {
            notif.setIsRead(true);
            notificationRepository.save(notif);
        }
    }

    @Transactional
    public void markAllAsRead(String userId) {
        notificationRepository.markAllAsRead(userId);
    }
}
