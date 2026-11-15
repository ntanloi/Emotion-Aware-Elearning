package com.elearning.emotion.service.emotion;

import com.elearning.emotion.config.EmotionAlertProperties;
import com.elearning.emotion.repository.SessionBucketStatsRepository.StudentBucketRow;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Tầng 2: Phân tích Episode tiêu cực (Bối rối / Mất tập trung) của từng học sinh.
 * Phân biệt giữa phản ứng thoáng qua (1 bucket lẻ) và episode thực sự (Sustained vs Recurring).
 */
@Component
@RequiredArgsConstructor
public class StudentEpisodeAnalyzer {

    private final EmotionAlertProperties properties;

    public enum Type {
        SUSTAINED,  // Tiêu cực liên tục không gián đoạn
        RECURRING   // Tiêu cực lặp lại (có khoảng hồi phục xen kẽ <= maxRecoveryGapBuckets)
    }

    public record Episode(
            String userId,
            int startBucket,
            int endBucket,
            int negBuckets,
            Type type,
            long confused,
            long bored
    ) {}

    /**
     * Phân tích danh sách mẫu theo học sinh & bucket để trích xuất các Episode tiêu cực xác nhận.
     */
    public List<Episode> analyze(List<StudentBucketRow> rows) {
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        // Gom theo học sinh và gom theo bucketIndex (phòng trường hợp 1 học sinh xem nhiều lần)
        Map<String, Map<Integer, long[]>> userBucketMap = new LinkedHashMap<>();
        for (var r : rows) {
            if (r.getUserId() == null || r.getBucketIndex() == null) continue;
            var bucketMap = userBucketMap.computeIfAbsent(r.getUserId(), k -> new TreeMap<>());
            long[] acc = bucketMap.computeIfAbsent(r.getBucketIndex(), k -> new long[4]); // total, noFace, confused, bored
            acc[0] += nz(r.getTotal());
            acc[1] += nz(r.getNoFace());
            acc[2] += nz(r.getConfused());
            acc[3] += nz(r.getBored());
        }

        List<Episode> out = new ArrayList<>();
        for (var e : userBucketMap.entrySet()) {
            String userId = e.getKey();
            Map<Integer, long[]> buckets = e.getValue();

            List<Integer> neg = new ArrayList<>();
            List<long[]> cb = new ArrayList<>();

            for (var bEntry : buckets.entrySet()) {
                int bIdx = bEntry.getKey();
                long[] acc = bEntry.getValue();
                long total = acc[0];
                long noFace = acc[1];
                long valid = total - noFace;

                // Dưới ngưỡng mẫu hợp lệ tối thiểu -> MISSING (không phạt, không tính là tiêu cực)
                if (valid < properties.getMinValidSamplesPerBucket()) {
                    continue;
                }

                long confused = acc[2];
                long bored = acc[3];
                double ratio = (double) (confused + bored) / valid;

                // Đạt ngưỡng tiêu cực cá nhân (studentNegThreshold)
                if (ratio >= properties.getStudentNegThreshold()) {
                    neg.add(bIdx);
                    cb.add(new long[]{confused, bored});
                }
            }

            int i = 0;
            while (i < neg.size()) {
                int j = i;
                long totalConfused = cb.get(i)[0];
                long totalBored = cb.get(i)[1];
                boolean hasRecoveryGap = false;

                while (j + 1 < neg.size()) {
                    int dist = neg.get(j + 1) - neg.get(j) - 1;
                    if (dist > properties.getMaxRecoveryGapBuckets()) {
                        break;
                    }
                    if (dist > 0) {
                        hasRecoveryGap = true;
                    }
                    j++;
                    totalConfused += cb.get(j)[0];
                    totalBored += cb.get(j)[1];
                }

                int nNegBuckets = j - i + 1;
                // n >= minNegBucketsPerEpisode (mặc định 2) => Loại bỏ thoáng qua (n=1)
                if (nNegBuckets >= properties.getMinNegBucketsPerEpisode()) {
                    Type type = hasRecoveryGap ? Type.RECURRING : Type.SUSTAINED;
                    out.add(new Episode(
                            userId,
                            neg.get(i),
                            neg.get(j),
                            nNegBuckets,
                            type,
                            totalConfused,
                            totalBored
                    ));
                }
                i = j + 1;
            }
        }
        return out;
    }

    private static long nz(Long v) {
        return v == null ? 0L : v;
    }
}
