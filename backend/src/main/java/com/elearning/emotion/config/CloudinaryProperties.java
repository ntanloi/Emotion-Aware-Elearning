package com.elearning.emotion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Thong tin ket noi Cloudinary. Lay tu Dashboard Cloudinary (Settings > Access Keys) sau khi
 * dang ky tai khoan tai https://cloudinary.com. KHONG commit api-secret vao git - luon truyen
 * qua bien moi truong (.env / CLOUDINARY_* trong docker-compose, CI secrets...).
 */
@Component
@ConfigurationProperties(prefix = "app.cloudinary")
@Getter
@Setter
public class CloudinaryProperties {
    private String cloudName;
    private String apiKey;
    private String apiSecret;
    /** Thu muc goc tren Cloudinary de nhom rieng media cua app nay (vd 1 acc Cloudinary dung chung nhieu du an). */
    private String folder = "elearning";
}
