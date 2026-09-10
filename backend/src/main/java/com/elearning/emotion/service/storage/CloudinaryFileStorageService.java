package com.elearning.emotion.service.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.elearning.emotion.config.CloudinaryProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * Luu anh/audio/video len Cloudinary (thay vi dia local) - xem FileStorageService.
 * Bat implementation nay bang app.storage.provider=cloudinary (application.yml / .env).
 *
 * Cach xu ly theo loai file:
 * - IMAGE: upload() thuong, resource_type=image.
 * - AUDIO: upload() thuong, resource_type=video (Cloudinary khong co resource_type rieng cho
 *   audio, file .mp3/.wav duoc xem la "video" khong co hinh). File audio bai giang thuong <20MB
 *   nen khong can chunk.
 * - VIDEO: BAT BUOC dung uploadLarge() (chunked upload) vi Cloudinary yeu cau chunk upload cho
 *   MOI file > 100MB khi goi qua API (khong chi la khuyen nghi). Video bai giang dai ~1.5 tieng,
 *   ~500MB se luon roi vao truong hop nay.
 *
 * *** LUU Y QUAN TRONG VE HAN MUC ***
 * Goi Cloudinary FREE chi cho phep video toi da 100MB/file (xem https://cloudinary.com/pricing,
 * muc "Compare plans"). De upload video ~500MB / 1.5 tieng nhu yeu cau cua he thong nay, tai
 * khoan Cloudinary BAT BUOC phai nang cap len goi tra phi (vd Plus, gioi han 2GB/video). Neu van
 * dang dung goi Free, upload video >100MB se bi Cloudinary tra ve loi va thay bang exception ben
 * duoi. Neu chi phi la van de, cân nhac dung Cloudinary cho IMAGE/AUDIO va mot dich vu chuyen
 * video (Bunny Stream, Mux, S3+CloudFront) cho VIDEO rieng.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "cloudinary")
public class CloudinaryFileStorageService implements FileStorageService {

    /** Kich thuoc moi chunk khi upload video lon. Cloudinary khuyen nghi 20MB, toi thieu 5MB. */
    private static final long CHUNK_SIZE_BYTES = 20L * 1024 * 1024;

    private final Cloudinary cloudinary;
    private final CloudinaryProperties properties;

    @jakarta.annotation.PostConstruct
    void logActive() {
        log.info(">>> Storage provider dang active: CLOUDINARY (cloud_name: {})", properties.getCloudName());
    }

    @Override
    public StoredFile store(MultipartFile file, MediaCategory category) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File rong");
        }
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
        String today = LocalDate.now().toString();
        // public_id: giu cau truc thu muc ro rang tren Cloudinary (de con tim/quan ly tren dashboard)
        String publicId = properties.getFolder() + "/" + category.name().toLowerCase() + "/" + today + "/" + UUID.randomUUID();
        String cloudinaryResourceType = category == MediaCategory.IMAGE ? "image" : "video"; // Cloudinary: audio cung la "video"

        try {
            Map<?, ?> result;
            if (category == MediaCategory.VIDEO) {
                // Chunked upload - bat buoc voi file > 100MB, dung duoc cho ca file nho hon
                result = cloudinary.uploader().uploadLarge(file.getInputStream(), ObjectUtils.asMap(
                        "resource_type", cloudinaryResourceType,
                        "public_id", publicId,
                        "chunk_size", CHUNK_SIZE_BYTES,
                        "eager_async", true
                ));
            } else {
                result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                        "resource_type", cloudinaryResourceType,
                        "public_id", publicId
                ));
            }

            String secureUrl = (String) result.get("secure_url");
            Integer durationSec = null;
            Object duration = result.get("duration"); // Cloudinary tra ve so giay (double) cho audio/video
            if (duration instanceof Number number) {
                durationSec = (int) Math.round(number.doubleValue());
            }

            return new StoredFile(secureUrl, original, file.getSize(), publicId, durationSec);
        } catch (IOException e) {
            // Truong hop pho bien nhat: video > 100MB nhung tai khoan van o goi Free (xem ghi chu class)
            throw new IllegalArgumentException(
                    "Upload len Cloudinary that bai: " + e.getMessage()
                            + ". Neu file video lon, kiem tra han muc goi Cloudinary dang dung (Free toi da 100MB/video).",
                    e);
        }
    }

    @Override
    public void delete(String publicId, MediaCategory category) {
        if (publicId == null || publicId.isBlank()) return;
        String cloudinaryResourceType = category == MediaCategory.IMAGE ? "image" : "video";
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", cloudinaryResourceType));
        } catch (IOException e) {
            log.warn("Khong the xoa file tren Cloudinary: {}", publicId, e);
        }
    }
}