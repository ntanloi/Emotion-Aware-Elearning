package com.elearning.emotion.service;

import com.elearning.emotion.entity.ToeicTest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TestAccessService {

    private final CourseAccessService courseAccessService;

    /**
     * Kiem tra quyen lam de thi cua nguoi dung.
     * - De chua PUBLISHED: chi tac gia hoac ADMIN duoc xem/lam thu.
     * - De PUBLISHED nguon COURSE: bat buoc da ghi danh khoa hoc chua de (hoac giao vien chu khoa / admin).
     * - De PUBLISHED nguon SYSTEM hoac COMMUNITY: chi can da dang nhap he thong.
     */
    public void validateCanTakeTest(String userId, ToeicTest test) {
        if (userId == null || userId.isBlank()) {
            throw new SecurityException("Cần đăng nhập để làm đề thi");
        }
        if (test == null) {
            throw new IllegalArgumentException("Không tìm thấy đề thi");
        }

        boolean isAdmin = courseAccessService.isAdmin(userId);
        boolean isAuthor = test.getAuthor() != null && userId.equals(test.getAuthor().getId());

        if (!"PUBLISHED".equalsIgnoreCase(test.getStatus())) {
            if (!isAdmin && !isAuthor) {
                throw new SecurityException("Đề thi chưa được xuất bản");
            }
            return;
        }

        // De da PUBLISHED
        if ("COURSE".equalsIgnoreCase(test.getSource()) && test.getCourse() != null) {
            courseAccessService.validateCanLearn(userId, test.getCourse());
        }
    }

    public boolean canManageTest(String userId, ToeicTest test) {
        if (userId == null || test == null) return false;
        if (courseAccessService.isAdmin(userId)) return true;
        return test.getAuthor() != null && userId.equals(test.getAuthor().getId());
    }
}
