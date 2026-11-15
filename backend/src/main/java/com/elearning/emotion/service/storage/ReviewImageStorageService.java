package com.elearning.emotion.service.storage;

import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.ReviewImageRepository;
import com.elearning.emotion.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.List;

/**
 * Dịch vụ xử lý ảnh đánh giá khóa học an toàn (Phase 0):
 * - Kiểm tra định dạng thực tế qua ImageIO (chỉ nhận JPG, PNG, WEBP).
 * - Tái mã hóa (Re-encode) để xóa sạch dữ liệu EXIF (GPS, metadata thiết bị).
 * - Giới hạn dung lượng tối đa 5 MB.
 * - Thu nhỏ kích thước tối đa 1600px để tối ưu lưu trữ và hiển thị.
 * - Scheduled job dọn dẹp ảnh mồ côi quá 24h.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewImageStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final int MAX_DIMENSION = 1600;

    private final FileStorageService fileStorageService;
    private final MediaAssetRepository mediaAssetRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final UserRepository userRepository;

    // Giới hạn tần suất: Tối đa 10 ảnh / phút / người dùng
    private final Map<String, List<Long>> uploadTimestampsByUser = new java.util.concurrent.ConcurrentHashMap<>();

    private void checkRateLimit(String userId) {
        if (userId == null) return;
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L; // 1 phút
        List<Long> timestamps = uploadTimestampsByUser.compute(userId, (k, list) -> {
            if (list == null) list = new ArrayList<>();
            list.removeIf(t -> t < windowStart);
            return list;
        });
        if (timestamps.size() >= 10) {
            throw new IllegalArgumentException("Bạn đã tải lên quá nhiều ảnh trong thời gian ngắn. Vui lòng chờ 1 phút trước khi thử lại.");
        }
        timestamps.add(now);
    }

    /**
     * Tải lên và khử độc ảnh đánh giá khóa học
     */
    @Transactional
    public MediaAsset storeReviewImage(String userId, MultipartFile file) {
        checkRateLimit(userId);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn file ảnh tải lên");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Dung lượng ảnh vượt quá giới hạn tối đa 5 MB");
        }

        String originalName = file.getOriginalFilename();
        String ext = "";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Chỉ chấp nhận các định dạng ảnh: JPG, PNG, WEBP");
        }

        // 1. Kiểm tra magic bytes & nội dung thực qua ImageIO
        BufferedImage rawImage;
        try (InputStream is = file.getInputStream()) {
            rawImage = ImageIO.read(is);
        } catch (IOException e) {
            log.warn("Lỗi đọc file ảnh đánh giá: {}", e.getMessage());
            throw new IllegalArgumentException("Không thể đọc file ảnh hoặc file bị hỏng");
        }

        if (rawImage == null) {
            throw new IllegalArgumentException("Nội dung file không phải là ảnh hợp lệ (JPG, PNG, WEBP)");
        }

        // 2. Thu nhỏ nếu kích thước vượt quá MAX_DIMENSION và re-encode loại bỏ EXIF
        BufferedImage sanitizedImage = sanitizeAndScale(rawImage);

        // 3. Ghi ra byte array dạng JPEG chuẩn
        byte[] sanitizedBytes;
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(sanitizedImage, "jpg", baos);
            sanitizedBytes = baos.toByteArray();
        } catch (IOException e) {
            log.error("Lỗi khi tái mã hóa ảnh đánh giá: {}", e.getMessage());
            throw new RuntimeException("Lỗi xử lý ảnh đánh giá");
        }

        // 4. Lưu qua FileStorageService
        String sanitizedFileName = "review_" + UUID.randomUUID() + ".jpg";
        MultipartFile sanitizedMultipartFile = new InMemoryMultipartFile(
                sanitizedFileName,
                sanitizedFileName,
                "image/jpeg",
                sanitizedBytes
        );

        FileStorageService.StoredFile stored = fileStorageService.store(
                sanitizedMultipartFile,
                FileStorageService.MediaCategory.IMAGE
        );

        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng: " + userId));

        MediaAsset asset = MediaAsset.builder()
                .uploader(uploader)
                .type(FileStorageService.MediaCategory.IMAGE.name())
                .url(stored.url())
                .fileName(sanitizedFileName)
                .publicId(stored.publicId())
                .createdAt(LocalDateTime.now())
                .build();

        return mediaAssetRepository.save(asset);
    }

    /**
     * Re-encode và scale ảnh (nếu cần), tạo ảnh RGB sạch không chứa EXIF
     */
    private BufferedImage sanitizeAndScale(BufferedImage src) {
        int width = src.getWidth();
        int height = src.getHeight();

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            double ratio = Math.min((double) MAX_DIMENSION / width, (double) MAX_DIMENSION / height);
            width = (int) Math.round(width * ratio);
            height = (int) Math.round(height * ratio);
        }

        BufferedImage dest = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = dest.createGraphics();
        try {
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

            // Vẽ nền trắng trong trường hợp PNG có kênh alpha
            g2d.setColor(Color.WHITE);
            g2d.fillRect(0, 0, width, height);

            g2d.drawImage(src, 0, 0, width, height, null);
        } finally {
            g2d.dispose();
        }
        return dest;
    }

    /**
     * Scheduled Job dọn dẹp ảnh mồ côi (ảnh review upload quá 24h nhưng không được lưu vào review nào)
     * Chạy mỗi ngày lúc 3:00 sáng VN.
     */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void cleanupOrphanReviewImages() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        log.info("Bắt đầu job dọn dẹp ảnh đánh giá mồ côi tạo trước {}", threshold);

        List<MediaAsset> candidates = mediaAssetRepository.findAll().stream()
                .filter(m -> m.getFileName() != null && m.getFileName().startsWith("review_"))
                .filter(m -> m.getCreatedAt() != null && m.getCreatedAt().isBefore(threshold))
                .toList();

        int deletedCount = 0;
        for (MediaAsset asset : candidates) {
            if (!reviewImageRepository.existsByMediaAssetId(asset.getId())) {
                try {
                    fileStorageService.delete(asset.getPublicId(), FileStorageService.MediaCategory.IMAGE);
                    mediaAssetRepository.delete(asset);
                    deletedCount++;
                } catch (Exception e) {
                    log.warn("Không thể xóa ảnh mồ côi {}: {}", asset.getId(), e.getMessage());
                }
            }
        }
        log.info("Hoàn tất dọn dẹp: Đã xóa {} ảnh đánh giá mồ côi", deletedCount);
    }

    /**
     * InMemory MultipartFile helper
     */
    private static class InMemoryMultipartFile implements MultipartFile {
        private final String name;
        private final String originalFilename;
        private final String contentType;
        private final byte[] content;

        public InMemoryMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
            this.name = name;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.content = content != null ? content : new byte[0];
        }

        @Override public String getName() { return name; }
        @Override public String getOriginalFilename() { return originalFilename; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() { return content.length == 0; }
        @Override public long getSize() { return content.length; }
        @Override public byte[] getBytes() { return content; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
        @Override public void transferTo(File dest) throws IOException, IllegalStateException {
            try (FileOutputStream fos = new FileOutputStream(dest)) {
                fos.write(content);
            }
        }
    }
}
