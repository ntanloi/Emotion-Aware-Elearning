package com.elearning.emotion.controller;

import com.elearning.emotion.config.RealtimeProperties;
import com.elearning.emotion.service.realtime.RealtimeHub;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class RealtimeControllerTest {

    @Mock
    private RealtimeHub realtimeHub;
    @Mock
    private HttpServletResponse response;
    @Mock
    private Authentication authentication;

    private RealtimeProperties properties;
    private RealtimeController controller;

    @BeforeEach
    void setUp() {
        properties = new RealtimeProperties();
        properties.setEnabled(true);
        properties.setTimeoutMinutes(30);
        controller = new RealtimeController(properties, realtimeHub);
    }

    @Test
    @DisplayName("stream: Đăng ký emitter vào RealtimeHub và set response headers")
    void testStreamRegistration() throws IOException {
        String userId = "test-user-id";
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();

        SseEmitter emitter = controller.stream(userId, authentication, null, response);

        assertNotNull(emitter);
        verify(response).setHeader("Cache-Control", "no-cache, no-transform");
        verify(response).setHeader("X-Accel-Buffering", "no");
        verify(realtimeHub).register(eq(userId), eq("ADMIN"), eq(emitter), eq(null));
    }

    @Test
    @DisplayName("stream: Ném 503 khi realtime feature flag bị tắt")
    void testStreamWhenDisabled() {
        properties.setEnabled(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.stream("user-1", authentication, null, response)
        );

        assertEquals(503, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("stream: Ném 401 khi userId null (chưa đăng nhập)")
    void testStreamWhenUnauthorized() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.stream(null, authentication, null, response)
        );

        assertEquals(401, ex.getStatusCode().value());
    }
}
