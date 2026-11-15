package com.elearning.emotion.controller;

import com.elearning.emotion.dto.ReviewImageUploadResponse;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.service.storage.ReviewImageStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoint tải ảnh cho đánh giá khóa học:
 * POST /api/reviews/images
 * - Kiểm tra định dạng hợp lệ (JPG, PNG, WEBP) bằng ImageIO.
 * - Giới hạn dung lượng <= 5 MB.
 * - Tái mã hóa loại bỏ EXIF, scale tối đa 1600px.
 * - Giới hạn tần suất tải lên.
 */
@RestController
@RequestMapping("/api/reviews/images")
@RequiredArgsConstructor
public class ReviewImageController {

    private final ReviewImageStorageService reviewImageStorageService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewImageUploadResponse uploadImage(
            @AuthenticationPrincipal String userId,
            @RequestParam("file") MultipartFile file
    ) {
        if (userId == null) {
            throw new SecurityException("Vui lòng đăng nhập để tải ảnh");
        }
        MediaAsset asset = reviewImageStorageService.storeReviewImage(userId, file);
        return new ReviewImageUploadResponse(asset.getId(), asset.getUrl());
    }
}
