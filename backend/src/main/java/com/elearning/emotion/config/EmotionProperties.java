package com.elearning.emotion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.emotion")
@Getter @Setter
public class EmotionProperties {
    private String defaultMode = "frame";
    private int batchSize = 6;
    private int captureIntervalSeconds = 10;
    private float minConfidenceThreshold = 0.5f;
}
