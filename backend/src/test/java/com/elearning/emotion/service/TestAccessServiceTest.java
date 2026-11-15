package com.elearning.emotion.service;

import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.ToeicTest;
import com.elearning.emotion.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TestAccessServiceTest {

    @Mock
    private CourseAccessService courseAccessService;

    @InjectMocks
    private TestAccessService testAccessService;

    private User author;
    private User otherUser;
    private ToeicTest publishedSystemTest;
    private ToeicTest draftTest;
    private ToeicTest courseTest;
    private Course course;

    @BeforeEach
    void setUp() {
        author = User.builder().id("author-1").build();
        otherUser = User.builder().id("user-2").build();
        course = Course.builder().id("course-1").build();

        publishedSystemTest = ToeicTest.builder()
                .id("test-sys-1")
                .source("SYSTEM")
                .status("PUBLISHED")
                .author(author)
                .build();

        draftTest = ToeicTest.builder()
                .id("test-draft-1")
                .source("COMMUNITY")
                .status("DRAFT")
                .author(author)
                .build();

        courseTest = ToeicTest.builder()
                .id("test-course-1")
                .source("COURSE")
                .status("PUBLISHED")
                .course(course)
                .author(author)
                .build();
    }

    @Test
    @DisplayName("Chưa đăng nhập thì không thể làm bất kỳ đề nào")
    void testUnauthenticatedBlocked() {
        assertThrows(SecurityException.class, () ->
                testAccessService.validateCanTakeTest(null, publishedSystemTest));
        assertThrows(SecurityException.class, () ->
                testAccessService.validateCanTakeTest("", publishedSystemTest));
    }

    @Test
    @DisplayName("Đề SYSTEM đã PUBLISHED: mọi học viên đã đăng nhập đều làm được, không cần ghi danh khóa")
    void testPublishedSystemTestAccessible() {
        assertDoesNotThrow(() ->
                testAccessService.validateCanTakeTest(otherUser.getId(), publishedSystemTest));
    }

    @Test
    @DisplayName("Đề DRAFT: chỉ tác giả hoặc ADMIN mới được làm thử, người khác bị chặn")
    void testDraftTestAccess() {
        when(courseAccessService.isAdmin(author.getId())).thenReturn(false);
        when(courseAccessService.isAdmin(otherUser.getId())).thenReturn(false);

        // Tác giả -> OK
        assertDoesNotThrow(() ->
                testAccessService.validateCanTakeTest(author.getId(), draftTest));

        // Người dùng khác -> Chặn SecurityException
        assertThrows(SecurityException.class, () ->
                testAccessService.validateCanTakeTest(otherUser.getId(), draftTest));

        // Admin -> OK
        when(courseAccessService.isAdmin("admin-id")).thenReturn(true);
        assertDoesNotThrow(() ->
                testAccessService.validateCanTakeTest("admin-id", draftTest));
    }

    @Test
    @DisplayName("Đề COURSE: phải thông qua kiểm tra ghi danh khóa học của CourseAccessService")
    void testCourseTestRequiresEnrollment() {
        doNothing().when(courseAccessService).validateCanLearn(otherUser.getId(), course);
        assertDoesNotThrow(() ->
                testAccessService.validateCanTakeTest(otherUser.getId(), courseTest));
        verify(courseAccessService, times(1)).validateCanLearn(otherUser.getId(), course);

        // Khi chưa ghi danh khóa học
        doThrow(new SecurityException("Bạn cần ghi danh khóa học")).when(courseAccessService)
                .validateCanLearn("unenrolled-user", course);
        assertThrows(SecurityException.class, () ->
                testAccessService.validateCanTakeTest("unenrolled-user", courseTest));
    }
}
