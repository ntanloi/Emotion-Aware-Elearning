package com.elearning.emotion.controller;

import com.elearning.emotion.dto.MediaAssetDto;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.UserRepository;
import com.elearning.emotion.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoint upload dung chung cho MOI form o phia giang vien (anh tu vung, audio cau hoi,
 * video bai giang...). Lam truoc tien vi cac controller khac (VocabWord, Question, ContentItem)
 * deu chi nhan media_id da co san tu day, khong tu xu ly file.
 *
 * FE goi truoc POST /api/media (multipart) -> nhan ve MediaAssetDto.id -> dung id do gan vao
 * cac form khac (VD: tao VocabWord voi audioMediaId = id vua upload).
 */
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final FileStorageService fileStorageService;
    private final MediaAssetRepository mediaAssetRepository;
    private final UserRepository userRepository;

    @PostMapping(consumes = "multipart/form-data")
    public MediaAssetDto upload(
            @AuthenticationPrincipal String userId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") FileStorageService.MediaCategory type
    ) {
        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nguoi dung"));

        FileStorageService.StoredFile stored = fileStorageService.store(file, type);

        MediaAsset asset = MediaAsset.builder()
                .uploader(uploader)
                .type(type.name())
                .url(stored.url())
                .fileName(stored.fileName())
                .publicId(stored.publicId())
                .durationSec(stored.durationSec())
                .build();

        return MediaAssetDto.from(mediaAssetRepository.save(asset));
    }
}
