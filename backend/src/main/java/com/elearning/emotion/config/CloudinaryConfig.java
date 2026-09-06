package com.elearning.emotion.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/** Khoi tao Cloudinary client. Chi duoc dang ky khi app.storage.provider=cloudinary. */
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "cloudinary")
public class CloudinaryConfig {

    private final CloudinaryProperties properties;

    @PostConstruct
    void validate() {
        if (!StringUtils.hasText(properties.getCloudName())
                || !StringUtils.hasText(properties.getApiKey())
                || !StringUtils.hasText(properties.getApiSecret())) {
            throw new IllegalStateException(
                    "app.storage.provider=cloudinary nhung thieu CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / "
                            + "CLOUDINARY_API_SECRET. Dien vao file .env (xem .env.example).");
        }
    }

    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", properties.getCloudName(),
                "api_key", properties.getApiKey(),
                "api_secret", properties.getApiSecret(),
                "secure", true
        ));
    }
}
