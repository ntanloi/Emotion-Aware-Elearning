package com.elearning.emotion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
@ConfigurationProperties(prefix = "app.reward")
@Getter
@Setter
public class RewardProperties {
    private boolean trackingEnabled = true;
    private boolean enabled = false;
    private BigDecimal escrowPercent = BigDecimal.TEN;
    private BigDecimal requiredVideoPercent = BigDecimal.valueOf(70);
    private double maxBadPercent = 30.0;
    private int minCoveragePercent = 90;
    private int binSeconds = 10;
    private double maxPlaybackRate = 1.5;
    private int holdingDays = 180;
    private int attemptWindowHours = 24;
    private int faceLostPauseBatches = 5;
    private int faceLostMaxMinutes = 10;
    private String policyVersion = "v1";

    private int framesPerSecond = 5;
    private int minAccessMonths = 6;
    private int startDeadlineDays = 365;
    private BoredIdle boredIdle = new BoredIdle();

    @Getter
    @Setter
    public static class BoredIdle {
        private boolean countsAsBad = false;
        private double minConfidence = 0.7;
        private int runMinSeconds = 60;
        private int runMaxSeconds = 300;
        private int runVideoPercent = 10;
        private int gapToleranceSeconds = 2;
    }
}
