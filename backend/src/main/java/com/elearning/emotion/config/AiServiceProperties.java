package com.elearning.emotion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.ai-service")
@Getter @Setter
public class AiServiceProperties {
    private String baseUrl = "http://localhost:8000";
    private int timeoutMs = 4000;
}
