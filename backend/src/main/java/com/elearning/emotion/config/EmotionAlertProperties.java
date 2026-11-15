package com.elearning.emotion.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.emotion.alert")
@Data
public class EmotionAlertProperties {
    /** Cỡ mẫu tối thiểu học viên khác nhau đã xem đoạn đó (BR-07) */
    private int minStudents = 5;

    /** Tỷ lệ tiêu cực tối thiểu mức video để kích hoạt cảnh báo (tỉ lệ học viên bị ảnh hưởng, khuyến nghị 0.30) */
    private double negativeRatioThreshold = 0.30;

    /** Ngưỡng xác định 1 bucket tiêu cực (NEG) của 1 học sinh: (confused + bored) / valid */
    private double studentNegThreshold = 0.5;

    /** Số mẫu hợp lệ tối thiểu trong 1 bucket 10s của 1 học sinh (dưới ngưỡng là MISSING) */
    private int minValidSamplesPerBucket = 3;

    /** Số bucket NEG tối thiểu để xác nhận episode (n = 1 là thoáng qua, bỏ qua) */
    private int minNegBucketsPerEpisode = 2;

    /** Khoảng cách hồi phục tối đa (số bucket) giữa các bucket NEG trong 1 cụm (3 bucket = 30s) */
    private int maxRecoveryGapBuckets = 3;

    /** Bù trừ độ trễ phản ứng cảm xúc của học sinh (giây) khi xác định thời điểm bắt đầu */
    private int reactionLagSeconds = 5;

    /** Hệ số nhân độ lệch chuẩn so với baseline cả video */
    private double stdDevMultiplier = 1.5;

    /** Bỏ qua bao nhiêu giây đầu video (thời gian khởi động/setup của học viên) */
    private int ignoreWarmupSeconds = 60;

    /** Số bucket 10s liên tiếp tối thiểu để coi là 1 điểm nghẽn (đã lọc ở tầng học sinh nên giảm xuống 2) */
    private int minConsecutiveBuckets = 2;

    /** Cờ cấu hình cho phép tạo dữ liệu demo học viên & cảm xúc (mặc định tắt: false) */
    private boolean demoSeedEnabled = false;
}
