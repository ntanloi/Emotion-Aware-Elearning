package com.elearning.emotion.service;

import com.elearning.emotion.dto.LessonAlertDto;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmotionAlertDemoService {

    private final ContentItemRepository contentItemRepository;
    private final UserRepository userRepository;
    private final LearningSessionRepository learningSessionRepository;
    private final SessionBucketStatsRepository sessionBucketStatsRepository;
    private final LessonAlertRepository lessonAlertRepository;
    private final SegmentAlertService segmentAlertService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public Map<String, Object> seedDemoData(String teacherId, String targetContentItemId, int studentCount) {
        ContentItem item;
        if (targetContentItemId != null && !targetContentItemId.isBlank()) {
            item = contentItemRepository.findById(targetContentItemId)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài giảng"));
            if (item.getCourse() == null || item.getCourse().getTeacher() == null
                    || !item.getCourse().getTeacher().getId().equals(teacherId)) {
                throw new SecurityException("Bạn không phải giảng viên sở hữu bài giảng này.");
            }
        } else {
            List<ContentItem> videos = contentItemRepository.findByTeacherIdAndType(teacherId, "VIDEO_LECTURE");
            if (videos.isEmpty()) {
                throw new IllegalStateException("Bạn chưa có bài giảng dạng VIDEO_LECTURE nào.");
            }
            item = videos.get(0);
        }

        // Xóa các alert cũ của bài này để test chính xác
        List<LessonAlert> oldAlerts = lessonAlertRepository.findByContentItemIdOrderByStartSecAsc(item.getId());
        lessonAlertRepository.deleteAll(oldAlerts);

        int count = Math.max(1, studentCount);
        List<SessionBucketStats> statsToSave = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = 1; i <= count; i++) {
            final int studentIndex = i;
            String email = "demostudent" + studentIndex + "@demo.elearning.vn";
            User student = userRepository.findByEmail(email).orElseGet(() -> {
                User u = User.builder()
                        .email(email)
                        .fullName("Demo Học Viên " + studentIndex)
                        .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .role("STUDENT")
                        .status("ACTIVE")
                        .build();
                return userRepository.save(u);
            });

            LearningSession session = LearningSession.builder()
                    .user(student)
                    .contentItem(item)
                    .status("FINISHED")
                    .hasCameraPermission(true)
                    .startTime(now.minusMinutes(30))
                    .endTime(now.minusMinutes(10))
                    .focusScore(studentIndex <= 3 ? 45.0f : 75.0f)
                    .activeSeconds(1200)
                    .build();
            session = learningSessionRepository.save(session);

            // Sinh 20 bucket 10 giây (0 - 200s)
            for (int b = 0; b <= 20; b++) {
                int total;
                int engaged = 0;
                int interested = 0;
                int neutral = 0;
                int confused = 0;
                int bored = 0;
                int noface = 0;

                if (b <= 5) {
                    // 0s - 60s: Khởi động / Warm-up
                    total = 8;
                    engaged = 4;
                    neutral = 4;
                } else if (b >= 12 && b <= 14) {
                    // 120s - 150s: Điểm nghẽn học tập (Bối rối & Chán nản cao bất thường)
                    total = 12;
                    confused = 6;
                    bored = 5;
                    neutral = 1;
                } else {
                    // Các đoạn còn lại: Trạng thái bình thường
                    total = 8;
                    engaged = 5;
                    neutral = 3;
                }

                SessionBucketStats sbs = SessionBucketStats.builder()
                        .id(new SessionBucketStatsId(session.getId(), b))
                        .contentItemId(item.getId())
                        .userId(student.getId())
                        .total(total)
                        .engaged(engaged)
                        .interested(interested)
                        .neutral(neutral)
                        .confused(confused)
                        .bored(bored)
                        .noFace(noface)
                        .build();
                statsToSave.add(sbs);
            }
        }

        sessionBucketStatsRepository.saveAll(statsToSave);
        log.info("Seeded {} demo students for contentItem {} by teacher {}", count, item.getId(), teacherId);

        // Chạy thuật toán phát hiện điểm nghẽn
        int alertsCreated = segmentAlertService.processItemAlerts(item);

        List<LessonAlertDto> alertDtos = segmentAlertService.getAlertsByLesson(teacherId, item.getId());

        String message;
        if (count >= 5) {
            message = String.format("Thành công: Đã sinh dữ liệu %d học viên. Hệ thống tự động phát hiện %d điểm nghẽn (đoạn 120s - 150s) và đã gửi thông báo đến giảng viên.",
                    count, alertDtos.size());
        } else {
            message = String.format("Thành công: Đã sinh dữ liệu %d học viên. Đúng theo quy tắc BR-07 (cần tối thiểu 5 học viên), hệ thống KHÔNG kích hoạt cảnh báo.",
                    count);
        }

        return Map.of(
                "success", true,
                "contentItemId", item.getId(),
                "lessonTitle", item.getTitle(),
                "studentCount", count,
                "alertsCreated", alertsCreated,
                "currentAlerts", alertDtos,
                "message", message
        );
    }
}
