package com.elearning.emotion.service.report;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyReportScheduler {

    private final DailyReportGeneratorService dailyReportGeneratorService;

    /**
     * Tự động tổng hợp báo cáo ngày cho mọi học viên có hoạt động vào lúc 23:55 hàng đêm (giờ Việt Nam)
     */
    @Scheduled(cron = "0 55 23 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runNightlyDailyReportJob() {
        log.info("Bắt đầu chạy Cron Job tổng hợp Báo cáo ngày (23:55 VN)...");
        try {
            int count = dailyReportGeneratorService.generateTodayReportsForAllActiveStudents();
            log.info("Hoàn tất Cron Job tổng hợp Báo cáo ngày: Đã tạo {} báo cáo.", count);
        } catch (Exception e) {
            log.error("Lỗi khi chạy Cron Job tổng hợp Báo cáo ngày: {}", e.getMessage(), e);
        }
    }
}
