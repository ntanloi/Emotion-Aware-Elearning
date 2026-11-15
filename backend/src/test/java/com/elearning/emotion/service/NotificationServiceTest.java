package com.elearning.emotion.service;

import com.elearning.emotion.entity.Notification;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.NotificationRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RealtimePublisher realtimePublisher;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, userRepository, realtimePublisher);
    }

    @Test
    @DisplayName("send: Lưu thông báo và phát sự kiện realtime push tới người dùng")
    void testSendNotificationTriggersRealtimePublisher() {
        String userId = "user-100";
        User mockUser = User.builder().id(userId).email("student@test.com").build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        Notification saved = Notification.builder()
                .id("notif-1")
                .user(mockUser)
                .title("Đề thi đã được duyệt")
                .content("Nội dung thông báo")
                .type("SYSTEM")
                .isRead(false)
                .build();
        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);
        when(notificationRepository.countByUserIdAndIsReadFalse(userId)).thenReturn(4L);

        notificationService.send(userId, "Đề thi đã được duyệt", "Nội dung thông báo", "SYSTEM", "ref-1", "/tests");

        verify(notificationRepository).save(any(Notification.class));

        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(realtimePublisher).publishToUser(eq(userId), eq("notification"), captor.capture());

        Map<String, Object> payload = captor.getValue();
        assertNotNull(payload);
        assertEquals(4L, payload.get("unreadCount"));
        assertNotNull(payload.get("notification"));
    }

    @Test
    @DisplayName("send: Bỏ qua khi không tìm thấy user")
    void testSendNotificationWhenUserNotFound() {
        when(userRepository.findById("unknown-id")).thenReturn(Optional.empty());

        notificationService.send("unknown-id", "Title", "Content", "SYSTEM", null, null);

        verify(notificationRepository, never()).save(any());
        verify(realtimePublisher, never()).publishToUser(any(), any(), any());
    }
}
