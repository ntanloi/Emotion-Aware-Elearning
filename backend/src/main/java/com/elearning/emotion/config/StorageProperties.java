package com.elearning.emotion.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * app.storage.upload-dir: thu muc vat ly luu file tren o dia (dev).
 * app.storage.public-base-url: tien to URL de client tai file ve (qua WebMvcConfig serve static).
 * Khi len production, doi LocalFileStorageService bang S3/MinIO ma khong dong den noi khac
 * dang goi FileStorageService (interface tach rieng, xem service/storage/).
 */
@Component
@ConfigurationProperties(prefix = "app.storage")
@Getter
@Setter
public class StorageProperties {
    private String uploadDir = "uploads";
    private String publicBaseUrl = "/uploads";
    private long maxFileSizeMb = 50;
}
