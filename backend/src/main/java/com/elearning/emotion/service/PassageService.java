package com.elearning.emotion.service;

import com.elearning.emotion.dto.PassageCreateRequest;
import com.elearning.emotion.dto.PassageUpdateRequest;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.entity.Passage;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.PassageRepository;
import com.elearning.emotion.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PassageService {

    private final PassageRepository passageRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final QuestionRepository questionRepository;
    private final QuestionService questionService;
    private final ContentItemService contentItemService;

    public Passage create(String teacherId, PassageCreateRequest req) {
        var item = contentItemService.getOwnedOrThrow(teacherId, req.contentItemId());
        int nextOrder = passageRepository.findByContentItemIdOrderByOrderIndex(req.contentItemId()).size();

        Passage passage = Passage.builder()
                .contentItem(item)
                .transcriptHtml(req.transcriptHtml())
                .passageHtml(req.passageHtml())
                .audio(resolveMedia(req.audioMediaId()))
                .image(resolveMedia(req.imageMediaId()))
                .orderIndex(nextOrder)
                .build();
        return passageRepository.save(passage);
    }

    /** Field null = giu nguyen gia tri cu */
    public Passage update(String teacherId, String passageId, PassageUpdateRequest req) {
        Passage passage = getOwnedOrThrow(teacherId, passageId);
        if (req.transcriptHtml() != null) passage.setTranscriptHtml(req.transcriptHtml());
        if (req.passageHtml() != null) passage.setPassageHtml(req.passageHtml());
        if (req.audioMediaId() != null) passage.setAudio(resolveMedia(req.audioMediaId()));
        if (req.imageMediaId() != null) passage.setImage(resolveMedia(req.imageMediaId()));
        return passageRepository.save(passage);
    }

    /**
     * Xoa 1 doan van + toan bo cau hoi (va dap an cua tung cau) dang gan voi doan van do.
     * Neu bat ky cau hoi nao trong so do da co hoc vien lam bai, QuestionService.cascadeDelete
     * se nem loi va toan bo thao tac (bao gom xoa Passage) se ROLLBACK nho @Transactional —
     * tranh tinh trang xoa duoc 1 nua cau hoi roi bao loi giua chung.
     */
    @Transactional
    public void delete(String teacherId, String passageId) {
        Passage passage = getOwnedOrThrow(teacherId, passageId);
        questionRepository.findByPassageId(passageId).forEach(questionService::cascadeDelete);
        passageRepository.delete(passage);
    }

    public Passage getOwnedOrThrow(String teacherId, String passageId) {
        Passage passage = passageRepository.findById(passageId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay doan van"));
        if (!passage.getContentItem().getCourse().getTeacher().getId().equals(teacherId)) {
            throw new SecurityException("Ban khong co quyen chinh sua doan van nay");
        }
        return passage;
    }

    private MediaAsset resolveMedia(String mediaId) {
        if (mediaId == null) return null;
        return mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay media: " + mediaId));
    }
}