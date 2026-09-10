package com.elearning.emotion.service.storage;

import com.elearning.emotion.config.StorageProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Luu file vao dia cua server (thu muc uploads/). Chi nen dung cho DEV/test local, vi:
 * - Khong ben vung khi deploy nhieu instance / container bi xoa (Heroku, Render free tier...).
 * - Khong co CDN -> tai video/anh cho nguoi dung o xa se cham.
 * Bat implementation nay bang app.storage.provider=local (mac dinh). Doi sang Cloudinary bang
 * app.storage.provider=cloudinary, xem CloudinaryFileStorageService.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageService implements FileStorageService {

    private final StorageProperties properties;

    @jakarta.annotation.PostConstruct
    void logActive() {
        log.info(">>> Storage provider dang active: LOCAL (thu muc: {})", properties.getUploadDir());
    }

    @Override
    public StoredFile store(MultipartFile file, MediaCategory category) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File rong");
        }
        try {
            String subDir = category.name().toLowerCase(); // image | audio | video
            String today = LocalDate.now().toString(); // phan tan file theo ngay, tranh 1 thu muc qua nhieu file
            Path targetDir = Path.of(properties.getUploadDir(), subDir, today);
            Files.createDirectories(targetDir);

            String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
            String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : "";
            String storedName = UUID.randomUUID() + ext;

            Path targetPath = targetDir.resolve(storedName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String relativePath = subDir + "/" + today + "/" + storedName;
            String publicUrl = properties.getPublicBaseUrl() + "/" + relativePath;
            return new StoredFile(publicUrl, original, file.getSize(), relativePath, null);
        } catch (IOException e) {
            throw new UncheckedIOException("Khong the luu file", e);
        }
    }

    @Override
    public void delete(String publicId, MediaCategory category) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            Path path = Path.of(properties.getUploadDir(), publicId);
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Khong the xoa file local: {}", publicId, e);
        }
    }
}