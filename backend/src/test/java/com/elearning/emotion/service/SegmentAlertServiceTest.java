package com.elearning.emotion.service;

import com.elearning.emotion.config.EmotionAlertProperties;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.LessonAlert;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.AdaptiveSuggestionRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.LessonAlertRepository;
import com.elearning.emotion.repository.SessionBucketStatsRepository;
import com.elearning.emotion.repository.SessionBucketStatsRepository.StudentBucketRow;
import com.elearning.emotion.service.emotion.StudentEpisodeAnalyzer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SegmentAlertServiceTest {

    @Mock
    private ContentItemRepository contentItemRepository;
    @Mock
    private SessionBucketStatsRepository sessionBucketStatsRepository;
    @Mock
    private LessonAlertRepository lessonAlertRepository;
    @Mock
    private AdaptiveSuggestionRepository adaptiveSuggestionRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private org.springframework.transaction.PlatformTransactionManager txManager;

    private EmotionAlertProperties properties;
    private StudentEpisodeAnalyzer studentEpisodeAnalyzer;
    private SegmentAlertService segmentAlertService;

    @BeforeEach
    void setUp() {
        properties = new EmotionAlertProperties();
        properties.setMinStudents(5);
        properties.setNegativeRatioThreshold(0.30);
        properties.setStdDevMultiplier(0.8);
        properties.setMinConsecutiveBuckets(2);
        properties.setIgnoreWarmupSeconds(60);
        properties.setStudentNegThreshold(0.50);
        properties.setMinValidSamplesPerBucket(3);
        properties.setMinNegBucketsPerEpisode(2);
        properties.setMaxRecoveryGapBuckets(3);
        properties.setReactionLagSeconds(5);

        studentEpisodeAnalyzer = new StudentEpisodeAnalyzer(properties);

        segmentAlertService = new SegmentAlertService(
                contentItemRepository,
                sessionBucketStatsRepository,
                lessonAlertRepository,
                adaptiveSuggestionRepository,
                notificationService,
                properties,
                eventPublisher,
                studentEpisodeAnalyzer,
                txManager
        );
    }

    private StudentBucketRow createRow(String userId, int bucketIndex, long total, long noFace, long confused, long bored) {
        return new StudentBucketRow() {
            @Override
            public String getUserId() {
                return userId;
            }

            @Override
            public Integer getBucketIndex() {
                return bucketIndex;
            }

            @Override
            public Long getTotal() {
                return total;
            }

            @Override
            public Long getConfused() {
                return confused;
            }

            @Override
            public Long getBored() {
                return bored;
            }

            @Override
            public Long getNoFace() {
                return noFace;
            }
        };
    }

    @Test
    @DisplayName("Test 1: 20 học sinh, 8 em có episode phủ bucket 100-140s -> phát hiện alert (tỉ lệ 40%, severity MEDIUM)")
    void testDetectAlertWith20Students8Affected() {
        User teacher = User.builder().id("teacher-1").fullName("Thầy Nam").build();
        Course course = Course.builder().id("course-1").teacher(teacher).build();
        ContentItem item = ContentItem.builder()
                .id("item-1")
                .title("Lý thuyết thì Hiện tại hoàn thành")
                .course(course)
                .build();

        List<StudentBucketRow> rows = new ArrayList<>();

        // 20 học sinh xem từ bucket 6 đến 13 (60s -> 140s)
        // Buckets 6, 7, 8, 9: Tất cả 20 học sinh đều OK
        for (int b = 6; b <= 9; b++) {
            for (int s = 1; s <= 20; s++) {
                rows.add(createRow("student_" + s, b, 10, 0, 1, 0));
            }
        }

        // Buckets 10, 11, 12, 13 (100s -> 140s):
        // 8 học sinh (student_1 đến student_8) bị bối rối (confused = 7/10 >= 0.5) liên tiếp 4 bucket -> episode SUSTAINED
        // 12 học sinh còn lại bình thường (confused = 1/10)
        for (int b = 10; b <= 13; b++) {
            for (int s = 1; s <= 8; s++) {
                rows.add(createRow("student_" + s, b, 10, 0, 7, 0));
            }
            for (int s = 9; s <= 20; s++) {
                rows.add(createRow("student_" + s, b, 10, 0, 1, 0));
            }
        }

        when(sessionBucketStatsRepository.findStudentBuckets(item.getId())).thenReturn(rows);
        when(lessonAlertRepository.findOverlappingActiveAlerts(eq(item.getId()), anyInt(), anyInt()))
                .thenReturn(Collections.emptyList());
        when(lessonAlertRepository.findOverlappingAlerts(eq(item.getId()), anyInt(), anyInt()))
                .thenReturn(Collections.emptyList());
        when(lessonAlertRepository.save(any(LessonAlert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int created = segmentAlertService.processItemAlerts(item);

        assertEquals(1, created, "Phải phát hiện và tạo đúng 1 alert cho đoạn 100-140s");

        ArgumentCaptor<LessonAlert> captor = ArgumentCaptor.forClass(LessonAlert.class);
        verify(lessonAlertRepository).save(captor.capture());
        LessonAlert saved = captor.getValue();

        assertEquals(8, saved.getAffectedStudents());
        assertEquals(20, saved.getNStudents());
        assertEquals("CONFUSED", saved.getDominantState());
        assertEquals("OPEN", saved.getStatus());
        assertEquals("MEDIUM", saved.getSeverity(), "40% tỷ lệ sinh mức ưu tiên MEDIUM (trên 40% và dưới 50%)");
        // rawStartSec là bucket 10 * 10 = 100s, displayStartSec lùi reactionLagSeconds (5s) = 95s
        assertEquals(95, saved.getStartSec());
        assertEquals(140, saved.getEndSec());
        assertEquals(100, saved.getRawStartSec());

        // Kiểm tra thông báo gửi cho giáo viên có số liệu % khớp hoàn toàn với 8/20 = 40.0%
        ArgumentCaptor<String> contentCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationService).send(eq("teacher-1"), anyString(), contentCaptor.capture(), eq("VIDEO_ALERT"), any(), any());
        assertTrue(contentCaptor.getValue().contains("8/20 học viên (40.0%)"));
    }

    @Test
    @DisplayName("Test 2: 20 học sinh, chỉ 2 em có bối rối thoáng qua -> không phát hiện alert (n_affected = 0)")
    void testTransientConfusionDoesNotTriggerAlert() {
        ContentItem item = ContentItem.builder()
                .id("item-2")
                .title("Nghe hiểu Part 1")
                .build();

        List<StudentBucketRow> rows = new ArrayList<>();

        // 20 học sinh xem bucket 6 đến 13
        for (int b = 6; b <= 13; b++) {
            for (int s = 1; s <= 20; s++) {
                rows.add(createRow("student_" + s, b, 10, 0, 1, 0));
            }
        }

        // Chỉ có 2 em (student_1 và student_2) có 1 bucket duy nhất (bucket 10) bị bối rối thoáng qua
        rows.removeIf(r -> (r.getUserId().equals("student_1") || r.getUserId().equals("student_2")) && r.getBucketIndex() == 10);
        rows.add(createRow("student_1", 10, 10, 0, 8, 0));
        rows.add(createRow("student_2", 10, 10, 0, 8, 0));

        when(sessionBucketStatsRepository.findStudentBuckets(item.getId())).thenReturn(rows);

        int created = segmentAlertService.processItemAlerts(item);

        assertEquals(0, created, "Bối rối thoáng qua (1 bucket đơn lẻ) phải bị lọc bỏ, không sinh alert");
        verify(lessonAlertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 3: 2 học sinh bối rối kéo dài nhưng minStudents = 5 -> không phát hiện alert")
    void testInsufficientStudentsDoesNotTriggerAlert() {
        ContentItem item = ContentItem.builder()
                .id("item-3")
                .title("Từ vựng Chủ đề Công sở")
                .build();

        List<StudentBucketRow> rows = new ArrayList<>();

        // Chỉ có đúng 2 học sinh xem bài giảng
        for (int b = 6; b <= 13; b++) {
            rows.add(createRow("student_1", b, 10, 0, 8, 0));
            rows.add(createRow("student_2", b, 10, 0, 8, 0));
        }

        when(sessionBucketStatsRepository.findStudentBuckets(item.getId())).thenReturn(rows);

        int created = segmentAlertService.processItemAlerts(item);

        assertEquals(0, created, "Số học sinh xem (2) < minStudents (5) thì không được cảnh báo để tránh nhiễu mẫu nhỏ");
        verify(lessonAlertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test 4: Gộp nhiều alert active chồng lấn và nới rộng ranh giới chuẩn xác")
    void testMergeMultipleActiveAlerts() {
        ContentItem item = ContentItem.builder()
                .id("item-4")
                .title("Đọc hiểu Part 7")
                .build();

        List<StudentBucketRow> rows = new ArrayList<>();
        // 20 học sinh xem bucket 6 đến 13
        for (int b = 6; b <= 9; b++) {
            for (int s = 1; s <= 20; s++) {
                rows.add(createRow("student_" + s, b, 10, 0, 1, 0));
            }
        }
        // Buckets 10 đến 13: 8 em bối rối (40%)
        for (int b = 10; b <= 13; b++) {
            for (int s = 1; s <= 8; s++) {
                rows.add(createRow("student_" + s, b, 10, 0, 7, 0));
            }
            for (int s = 9; s <= 20; s++) {
                rows.add(createRow("student_" + s, b, 10, 0, 1, 0));
            }
        }

        LessonAlert alert1 = LessonAlert.builder()
                .id("alert-old-1")
                .startSec(90)
                .endSec(120)
                .rawStartSec(95)
                .status("OPEN")
                .severity("LOW")
                .affectedStudents(5)
                .nStudents(18)
                .negativeRatio(BigDecimal.valueOf(0.35))
                .build();

        LessonAlert alert2 = LessonAlert.builder()
                .id("alert-old-2")
                .startSec(120)
                .endSec(150)
                .rawStartSec(125)
                .status("OPEN")
                .severity("MEDIUM")
                .affectedStudents(6)
                .nStudents(20)
                .negativeRatio(BigDecimal.valueOf(0.38))
                .build();

        when(sessionBucketStatsRepository.findStudentBuckets(item.getId())).thenReturn(rows);
        when(lessonAlertRepository.findOverlappingActiveAlerts(eq(item.getId()), anyInt(), anyInt()))
                .thenReturn(List.of(alert1, alert2));
        when(lessonAlertRepository.findOverlappingAlerts(eq(item.getId()), anyInt(), anyInt()))
                .thenReturn(List.of(alert1, alert2));

        int created = segmentAlertService.processItemAlerts(item);

        assertEquals(0, created, "Gộp vào alert đang có nên không tạo mới alert record");
        // alert1 được nới rộng ranh giới bao quát cả [90, 150]
        assertEquals(90, alert1.getStartSec());
        assertEquals(150, alert1.getEndSec());
        assertEquals(8, alert1.getAffectedStudents());
        // alert2 bị đánh dấu là MERGED để không làm bẩn số liệu thống kê
        assertEquals("MERGED", alert2.getStatus());
        verify(lessonAlertRepository).save(alert1);
        verify(lessonAlertRepository).save(alert2);
    }

    @Test
    @DisplayName("Test 5: updateAlertStatus từ chối trạng thái nội bộ MERGED")
    void testUpdateAlertStatusRejectsMerged() {
        assertThrows(IllegalArgumentException.class, () ->
                segmentAlertService.updateAlertStatus("teacher-1", "alert-1", "MERGED")
        );
    }

    @Test
    @DisplayName("Test 6: getAlertsByTeacher loại bỏ các alert có trạng thái MERGED")
    void testGetAlertsByTeacherFiltersOutMerged() {
        LessonAlert openAlert = LessonAlert.builder()
                .id("alert-open")
                .startSec(30)
                .endSec(60)
                .status("OPEN")
                .build();

        LessonAlert mergedAlert = LessonAlert.builder()
                .id("alert-merged")
                .startSec(60)
                .endSec(90)
                .status("MERGED")
                .build();

        when(lessonAlertRepository.findByTeacherId("teacher-1")).thenReturn(List.of(openAlert, mergedAlert));

        var result = segmentAlertService.getAlertsByTeacher("teacher-1", null);
        assertEquals(1, result.size());
        assertEquals("alert-open", result.get(0).getId());
    }
}
