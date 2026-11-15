package com.elearning.emotion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
@ConfigurationProperties(prefix = "app.payment")
@Getter
@Setter
public class PaymentProperties {
    private String bankId = "MB";
    private String accountNo = "";
    private String accountName = "E-Learning AI";
    private String template = "compact2";
    /**
     * B3: API Key xác thực Webhook gửi từ SePay (cấu hình trong dashboard SePay).
     * Mặc định là null - nếu chưa cấu hình thì webhook từ chối (fail-closed, trả 503).
     */
    private String sepayApiKey = null;

    /**
     * H1: Tỷ lệ hoa hồng nền tảng (Platform fee) giữ lại, mặc định 5%
     */
    private BigDecimal platformFeePercent = BigDecimal.valueOf(5);

    /**
     * H1: Số tiền rút tối thiểu mỗi lần yêu cầu (VNĐ), mặc định 50.000 VNĐ
     */
    private BigDecimal minPayoutAmount = BigDecimal.valueOf(50000);

    /**
     * H1: Thời gian đơn hàng PENDING tự động hết hạn (giờ), mặc định 24 giờ
     */
    private int orderExpireHours = 24;
}
