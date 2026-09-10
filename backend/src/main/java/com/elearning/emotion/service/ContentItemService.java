package com.elearning.emotion.service;

import com.elearning.emotion.dto.ContentItemCreateRequest;
import com.elearning.emotion.dto.ContentItemReorderRequest;
import com.elearning.emotion.dto.ContentItemUpdateRequest;
import com.elearning.emotion.entity.ContentGroup;
import com.elearning.emotion.entity.ContentItem;
import com.elearning.emotion.entity.Course;
import com.elearning.emotion.entity.MediaAsset;
import com.elearning.emotion.entity.VocabSetItem;
import com.elearning.emotion.entity.VocabWord;
import com.elearning.emotion.repository.ContentGroupRepository;
import com.elearning.emotion.repository.ContentItemRepository;
import com.elearning.emotion.repository.MediaAssetRepository;
import com.elearning.emotion.repository.VocabSetItemRepository;
import com.elearning.emotion.repository.VocabWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ContentItemService {

    private static final Set<String> VALID_TYPES = Set.of(
            "VIDEO_LECTURE", "VOCAB_SET", "GRAMMAR_ARTICLE", "PRACTICE_TEST", "DICTATION_SET");

    private final ContentItemRepository contentItemRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final VocabSetItemRepository vocabSetItemRepository;
    private final VocabWordRepository vocabWordRepository;
    private final CourseService courseService;
    private final ContentGroupRepository contentGroupRepository;

    public ContentItem create(String teacherId, ContentItemCreateRequest req) {
        if (!VALID_TYPES.contains(req.type())) {
            throw new IllegalArgumentException("type khong hop le: " + req.type());
        }
        if (!SectionCodes.isValid(req.sectionCode())) {
            throw new IllegalArgumentException("section_code khong hop le: " + req.sectionCode());
        }
        Course course = courseService.getOwnedOrThrow(teacherId, req.courseId());

        // Khong bat buoc videoMediaId ngay luc tao: giao vien tao hoat dong VIDEO_LECTURE truoc
        // (chi voi tieu de), roi upload video SAU trong trang soan (VideoLectureEditor goi
        // update() rieng) - giu dung luong "Tao & bat dau soan" cua ContentItemTypeModal.

        ContentGroup group = null;
        int nextOrder;
        if (req.groupId() != null && !req.groupId().isBlank()) {
            group = contentGroupRepository.findById(req.groupId())
                    .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nhom hoat dong"));
            if (!group.getCourse().getId().equals(req.courseId()) || !group.getSectionCode().equals(req.sectionCode())) {
                throw new IllegalArgumentException("Nhom hoat dong khong thuoc dung muc sidebar nay");
            }
            nextOrder = contentItemRepository.findByGroupIdOrderByOrderIndex(req.groupId()).size();
        } else {
            nextOrder = contentItemRepository.findByCourseIdAndSectionCodeAndGroupIsNullOrderByOrderIndex(
                    req.courseId(), req.sectionCode()).size();
        }

        ContentItem item = ContentItem.builder()
                .course(course)
                .sectionCode(req.sectionCode())
                .group(group)
                .type(req.type())
                .title(req.title())
                .orderIndex(nextOrder)
                .timeLimitMinutes(req.timeLimitMinutes())
                .videoMedia(resolveMedia(req.videoMediaId()))
                .bodyHtml(req.bodyHtml())
                .build();
        return contentItemRepository.save(item);
    }

    /** Field null trong req = giu nguyen gia tri cu. groupId="" (chuoi rong) = go khoi Nhom hien tai. */
    public ContentItem update(String teacherId, String contentItemId, ContentItemUpdateRequest req) {
        ContentItem item = getOwnedOrThrow(teacherId, contentItemId);
        if (req.title() != null) item.setTitle(req.title());
        if (req.timeLimitMinutes() != null) item.setTimeLimitMinutes(req.timeLimitMinutes());
        if (req.videoMediaId() != null) item.setVideoMedia(resolveMedia(req.videoMediaId()));
        if (req.bodyHtml() != null) item.setBodyHtml(req.bodyHtml());
        if (req.groupId() != null) {
            if (req.groupId().isBlank()) {
                item.setGroup(null);
            } else {
                ContentGroup group = contentGroupRepository.findById(req.groupId())
                        .orElseThrow(() -> new IllegalArgumentException("Khong tim thay nhom hoat dong"));
                item.setGroup(group);
            }
        }
        return contentItemRepository.save(item);
    }

    /** Sap xep lai thu tu cac hoat dong TRONG CUNG 1 pham vi (cung muc sidebar hoac cung Nhom) */
    public void reorder(String teacherId, List<String> orderedItemIds) {
        List<ContentItem> items = contentItemRepository.findAllById(orderedItemIds);
        for (ContentItem it : items) {
            if (!it.getCourse().getTeacher().getId().equals(teacherId)) {
                throw new SecurityException("Ban khong co quyen sap xep hoat dong nay");
            }
        }
        for (int i = 0; i < orderedItemIds.size(); i++) {
            String id = orderedItemIds.get(i);
            int idx = i;
            items.stream().filter(it -> it.getId().equals(id)).findFirst()
                    .ifPresent(it -> it.setOrderIndex(idx));
        }
        contentItemRepository.saveAll(items);
    }

    public void delete(String teacherId, String contentItemId) {
        ContentItem item = getOwnedOrThrow(teacherId, contentItemId);
        contentItemRepository.delete(item);
    }

    /** FR-TCH-03: gan/thay toan bo danh sach tu cho 1 content_item VOCAB_SET (ghi de thu tu) */
    @Transactional
    public void setVocabWords(String teacherId, String contentItemId, List<String> wordIds) {
        ContentItem item = getOwnedOrThrow(teacherId, contentItemId);
        if (!"VOCAB_SET".equals(item.getType())) {
            throw new IllegalArgumentException("Chi content_item loai VOCAB_SET moi co danh sach tu");
        }
        vocabSetItemRepository.deleteAll(vocabSetItemRepository.findByContentItemIdOrderByOrderIndex(contentItemId));
        vocabSetItemRepository.flush();

        List<VocabWord> words = vocabWordRepository.findAllById(wordIds);
        for (int i = 0; i < wordIds.size(); i++) {
            String wordId = wordIds.get(i);
            int idx = i;
            words.stream().filter(w -> w.getId().equals(wordId)).findFirst().ifPresent(w ->
                    vocabSetItemRepository.save(VocabSetItem.builder()
                            .contentItem(item).word(w).orderIndex(idx).build()));
        }
    }

    public ContentItem getOwnedOrThrow(String teacherId, String contentItemId) {
        ContentItem item = contentItemRepository.findById(contentItemId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay noi dung"));
        if (!item.getCourse().getTeacher().getId().equals(teacherId)) {
            throw new SecurityException("Ban khong co quyen chinh sua noi dung nay");
        }
        return item;
    }

    private MediaAsset resolveMedia(String mediaId) {
        if (mediaId == null) return null;
        return mediaAssetRepository.findById(mediaId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay media: " + mediaId));
    }
}