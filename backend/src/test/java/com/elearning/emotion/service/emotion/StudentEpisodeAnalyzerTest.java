package com.elearning.emotion.service.emotion;

import com.elearning.emotion.config.EmotionAlertProperties;
import com.elearning.emotion.repository.SessionBucketStatsRepository.StudentBucketRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class StudentEpisodeAnalyzerTest {

    private EmotionAlertProperties properties;
    private StudentEpisodeAnalyzer analyzer;

    @BeforeEach
    void setUp() {
        properties = new EmotionAlertProperties();
        // Cấu hình mặc định:
        // studentNegThreshold = 0.50
        // minValidSamplesPerBucket = 3
        // minNegBucketsPerEpisode = 2
        // maxRecoveryGapBuckets = 3
        analyzer = new StudentEpisodeAnalyzer(properties);
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
    @DisplayName("Test 1: 1 bucket NEG duy nhất -> rỗng (lọc phản ứng thoáng qua n=1)")
    void testSingleNegBucketFilteredOut() {
        // Bucket 5: 10 mẫu, 0 noFace, 6 confused (ratio = 0.6 >= 0.5)
        List<StudentBucketRow> rows = List.of(
                createRow("user1", 5, 10, 0, 6, 0)
        );

        List<StudentEpisodeAnalyzer.Episode> episodes = analyzer.analyze(rows);
        assertTrue(episodes.isEmpty(), "Bucket NEG đơn lẻ phải bị lọc bỏ vì n=1");
    }

    @Test
    @DisplayName("Test 2: 2 bucket NEG cách nhau 2 bucket OK -> 1 episode RECURRING")
    void testRecurringEpisodeWithGap() {
        // Bucket 5: NEG (ratio = 6/10 = 0.6)
        // Bucket 6: OK (ratio = 1/10 = 0.1)
        // Bucket 7: OK (ratio = 1/10 = 0.1)
        // Bucket 8: NEG (ratio = 5/10 = 0.5)
        // Khoảng cách: 8 - 5 - 1 = 2 <= maxRecoveryGapBuckets (3) -> 1 episode RECURRING
        List<StudentBucketRow> rows = List.of(
                createRow("user1", 5, 10, 0, 6, 0),
                createRow("user1", 6, 10, 0, 1, 0),
                createRow("user1", 7, 10, 0, 1, 0),
                createRow("user1", 8, 10, 0, 5, 0)
        );

        List<StudentEpisodeAnalyzer.Episode> episodes = analyzer.analyze(rows);
        assertEquals(1, episodes.size());
        StudentEpisodeAnalyzer.Episode ep = episodes.get(0);
        assertEquals("user1", ep.userId());
        assertEquals(5, ep.startBucket());
        assertEquals(8, ep.endBucket());
        assertEquals(2, ep.negBuckets());
        assertEquals(StudentEpisodeAnalyzer.Type.RECURRING, ep.type());
        assertEquals(11, ep.confused());
    }

    @Test
    @DisplayName("Test 3: 3 bucket NEG liền nhau -> 1 episode SUSTAINED")
    void testSustainedEpisodeConsecutive() {
        // Bucket 10, 11, 12 đều NEG, liền nhau không có khoảng trống
        List<StudentBucketRow> rows = List.of(
                createRow("user1", 10, 10, 0, 7, 0),
                createRow("user1", 11, 10, 0, 6, 1),
                createRow("user1", 12, 10, 0, 5, 1)
        );

        List<StudentEpisodeAnalyzer.Episode> episodes = analyzer.analyze(rows);
        assertEquals(1, episodes.size());
        StudentEpisodeAnalyzer.Episode ep = episodes.get(0);
        assertEquals(10, ep.startBucket());
        assertEquals(12, ep.endBucket());
        assertEquals(3, ep.negBuckets());
        assertEquals(StudentEpisodeAnalyzer.Type.SUSTAINED, ep.type());
    }

    @Test
    @DisplayName("Test 4: 2 bucket NEG cách nhau 4 bucket OK (> 30s) -> 2 cụm riêng biệt, đều bị lọc -> rỗng")
    void testSeparateClustersFilteredOut() {
        // Bucket 5: NEG
        // Bucket 6, 7, 8, 9: OK (khoảng cách: 10 - 5 - 1 = 4 > maxRecoveryGapBuckets 3)
        // Bucket 10: NEG
        List<StudentBucketRow> rows = List.of(
                createRow("user1", 5, 10, 0, 6, 0),
                createRow("user1", 6, 10, 0, 1, 0),
                createRow("user1", 7, 10, 0, 1, 0),
                createRow("user1", 8, 10, 0, 1, 0),
                createRow("user1", 9, 10, 0, 1, 0),
                createRow("user1", 10, 10, 0, 6, 0)
        );

        List<StudentEpisodeAnalyzer.Episode> episodes = analyzer.analyze(rows);
        assertTrue(episodes.isEmpty(), "Hai cụm cách nhau > 3 buckets đều có n=1 nên phải bị loại");
    }

    @Test
    @DisplayName("Test 5: 1 bucket NEG, 1 bucket MISSING (< 3 mẫu), 1 bucket NEG -> vẫn gom thành episode vì MISSING không reset khoảng đếm")
    void testMissingBucketDoesNotBreakEpisode() {
        // Bucket 5: NEG (6/10 = 0.6)
        // Bucket 6: MISSING (total = 2 < minValidSamplesPerBucket 3)
        // Bucket 7: NEG (5/10 = 0.5)
        // Khoảng cách giữa 5 và 7 là 1 <= 3 -> vẫn gom được
        List<StudentBucketRow> rows = List.of(
                createRow("user1", 5, 10, 0, 6, 0),
                createRow("user1", 6, 2, 0, 2, 0), // valid < 3 -> bỏ qua không phạt
                createRow("user1", 7, 10, 0, 5, 0)
        );

        List<StudentEpisodeAnalyzer.Episode> episodes = analyzer.analyze(rows);
        assertEquals(1, episodes.size());
        StudentEpisodeAnalyzer.Episode ep = episodes.get(0);
        assertEquals(5, ep.startBucket());
        assertEquals(7, ep.endBucket());
        assertEquals(2, ep.negBuckets());
    }

    @Test
    @DisplayName("Test 6: Cùng 1 học sinh xem đoạn đó 3 lần -> không bị đếm trùng, max 1 episode phủ mỗi bucket")
    void testMultipleViewsBySameStudentNotDuplicated() {
        // Cùng user1 xem bucket 5 và bucket 6 lặp lại trong 3 lần khác nhau
        List<StudentBucketRow> rows = List.of(
                createRow("user1", 5, 10, 0, 6, 0),
                createRow("user1", 6, 10, 0, 7, 0),
                createRow("user1", 5, 10, 0, 5, 0),
                createRow("user1", 6, 10, 0, 6, 0),
                createRow("user1", 5, 10, 0, 7, 0),
                createRow("user1", 6, 10, 0, 6, 0)
        );

        List<StudentEpisodeAnalyzer.Episode> episodes = analyzer.analyze(rows);
        assertEquals(1, episodes.size(), "Chỉ được tạo duy nhất 1 episode cho user1, không nhân đôi/nhân ba");
        StudentEpisodeAnalyzer.Episode ep = episodes.get(0);
        assertEquals(5, ep.startBucket());
        assertEquals(6, ep.endBucket());
        assertEquals(2, ep.negBuckets());
    }
}
