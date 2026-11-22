package com.elearning.emotion.moderation;

import com.elearning.emotion.config.RealtimeProperties;
import com.elearning.emotion.controller.*;
import com.elearning.emotion.entity.Role;
import com.elearning.emotion.service.realtime.RealtimeAppEvent;
import com.elearning.emotion.service.realtime.RealtimeHub;
import com.elearning.emotion.service.realtime.RealtimePublisher;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Ma trận phân quyền ADMIN / MODERATOR (Kiểm duyệt viên):
 * - Nghiệp vụ kiểm duyệt (khóa học, đề thi, đánh giá, từ điển, hồ sơ giảng viên): chỉ MODERATOR.
 * - Tài chính, ví, chính sách, quản lý người dùng, tạo kiểm duyệt viên: chỉ ADMIN.
 * - Tổng quan thống kê và nhật ký: dùng chung (dữ liệu được lọc theo role).
 */
@ExtendWith(MockitoExtension.class)
class ModeratorRoleAuthorizationTest {

    @Mock
    private RealtimeProperties realtimeProperties;
    @Mock
    private RealtimeHub realtimeHub;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private static String classRule(Class<?> clazz) {
        PreAuthorize ann = clazz.getAnnotation(PreAuthorize.class);
        assertNotNull(ann, clazz.getSimpleName() + " phải có @PreAuthorize ở class level");
        return ann.value();
    }

    private static String methodRule(Class<?> clazz, String methodName) {
        Method m = Arrays.stream(clazz.getDeclaredMethods())
                .filter(x -> x.getName().equals(methodName))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Không tìm thấy method " + methodName));
        PreAuthorize ann = m.getAnnotation(PreAuthorize.class);
        assertNotNull(ann, clazz.getSimpleName() + "." + methodName + " phải có @PreAuthorize riêng");
        return ann.value();
    }

    @Test
    @DisplayName("Controller kiểm duyệt CHỈ dành cho MODERATOR")
    void moderationControllersAreModeratorOnly() {
        List<Class<?>> moderation = List.of(
                AdminModerationController.class,
                AdminLexiconController.class,
                AdminReportController.class,
                AdminReviewController.class,
                AdminToeicTestController.class
        );
        for (Class<?> c : moderation) {
            String rule = classRule(c);
            assertTrue(rule.contains("MODERATOR"), c.getSimpleName() + " phải yêu cầu MODERATOR: " + rule);
            assertFalse(rule.contains("ADMIN"), c.getSimpleName() + " không được mở cho ADMIN: " + rule);
        }
    }

    @Test
    @DisplayName("Tài chính, ví và chính sách CHỈ dành cho ADMIN")
    void financeWalletPolicyAreAdminOnly() {
        List<Class<?>> adminOnly = List.of(
                AdminFinanceController.class,
                AdminWalletController.class,
                AdminPolicyController.class
        );
        for (Class<?> c : adminOnly) {
            String rule = classRule(c);
            assertTrue(rule.contains("ADMIN"), c.getSimpleName() + " phải yêu cầu ADMIN");
            assertFalse(rule.contains("MODERATOR"), c.getSimpleName() + " không được mở cho MODERATOR: " + rule);
        }
    }

    @Test
    @DisplayName("AdminController: người dùng/tạo kiểm duyệt viên chỉ ADMIN; khóa học/giảng viên chỉ MODERATOR")
    void adminControllerMethodsAreSplitByRole() {
        String[] adminOnly = {"getUsers", "updateUserStatus", "createModerator"};
        String[] moderatorOnly = {"getPendingTeachers", "approveTeacher", "rejectTeacher", "getCourses",
                "getCourseReviewDetails", "getCoursePreview", "getContentItemPreview", "reAuditWithAi",
                "approveCourse", "rejectCourse", "suspendCourse", "restoreCourse"};
        for (String m : adminOnly) {
            String rule = methodRule(AdminController.class, m);
            assertTrue(rule.contains("ADMIN") && !rule.contains("MODERATOR"), m + " chỉ ADMIN: " + rule);
        }
        for (String m : moderatorOnly) {
            String rule = methodRule(AdminController.class, m);
            assertTrue(rule.contains("MODERATOR") && !rule.contains("ADMIN"), m + " chỉ MODERATOR: " + rule);
        }
    }

    @Test
    @DisplayName("MODERATOR không thể tự đăng ký công khai")
    void moderatorCannotSelfRegister() {
        assertFalse(Role.isValidRegisterRole("MODERATOR"));
        assertFalse(Role.isValidRegisterRole("ADMIN"));
        assertTrue(Role.isValidRegisterRole("STUDENT"));
        assertTrue(Role.isValidRegisterRole("TEACHER"));
    }

    @Test
    @DisplayName("Sự kiện kiểm duyệt realtime được gửi tới cả ADMIN và MODERATOR")
    void moderationEventsReachAdminAndModerator() {
        when(realtimeProperties.isEnabled()).thenReturn(true);
        when(realtimeHub.nextEventId()).thenReturn("1", "2");

        RealtimePublisher publisher = new RealtimePublisher(realtimeProperties, realtimeHub, eventPublisher);
        publisher.publishToModerationStaff("admin-stats", Map.of("reason", "COURSE_SUBMITTED"));

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(eventPublisher, times(2)).publishEvent(captor.capture());

        List<String> roles = captor.getAllValues().stream()
                .map(o -> ((RealtimeAppEvent) o).getRealtimeEvent().targetRole())
                .toList();
        assertEquals(List.of("ADMIN", "MODERATOR"), roles);
    }
}
