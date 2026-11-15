package com.elearning.emotion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
@ConfigurationProperties(prefix = "app.wallet")
@Getter
@Setter
public class WalletProperties {
    private boolean legacyQrEnabled = true;
    private boolean withdrawBonusAllowed = true;
    private BigDecimal minWithdraw = BigDecimal.valueOf(50000);
    private int cashWithdrawHoldMonths = 1;
}
