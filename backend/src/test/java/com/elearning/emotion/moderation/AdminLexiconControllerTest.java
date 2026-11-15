package com.elearning.emotion.moderation;

import com.elearning.emotion.controller.AdminLexiconController;
import com.elearning.emotion.dto.moderation.LexiconCreateRequest;
import com.elearning.emotion.dto.moderation.LexiconUpdateRequest;
import com.elearning.emotion.entity.ModerationLexicon;
import com.elearning.emotion.repository.ModerationLexiconRepository;
import com.elearning.emotion.service.LexiconService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class AdminLexiconControllerTest {

    @Mock
    private ModerationLexiconRepository lexiconRepository;
    @Mock
    private LexiconService lexiconService;

    private AdminLexiconController controller;

    @BeforeEach
    void setUp() {
        controller = new AdminLexiconController(lexiconRepository, lexiconService);
    }

    @Test
    @DisplayName("Admin: Lấy danh sách từ điển phân trang")
    void testGetLexiconList() {
        ModerationLexicon item = ModerationLexicon.builder()
                .id("lex-1")
                .category("PROFANITY_VI")
                .pattern("cặc")
                .severity("ERROR")
                .build();
        Page<ModerationLexicon> page = new PageImpl<>(Collections.singletonList(item));

        when(lexiconRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        ResponseEntity<Page<ModerationLexicon>> res = controller.getLexiconList(
                "PROFANITY_VI", "ERROR", "ALL", true, "cặc", 0, 10, "category,asc"
        );

        assertNotNull(res.getBody());
        assertEquals(1, res.getBody().getTotalElements());
        assertEquals("cặc", res.getBody().getContent().get(0).getPattern());
    }

    @Test
    @DisplayName("Admin: Thêm từ khóa mới thành công và làm mới cache")
    void testCreateLexicon_Success() {
        LexiconCreateRequest req = new LexiconCreateRequest();
        req.setCategory("SCAM_AD");
        req.setMatchType("PHRASE");
        req.setPattern("cá độ bóng đá");
        req.setSeverity("ERROR");
        req.setScope("ALL");

        when(lexiconRepository.findByCategoryAndMatchTypeAndPattern("SCAM_AD", "PHRASE", "cá độ bóng đá"))
                .thenReturn(Optional.empty());
        when(lexiconRepository.save(any(ModerationLexicon.class))).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ModerationLexicon> res = controller.createLexicon(req);

        assertEquals(HttpStatus.CREATED, res.getStatusCode());
        assertNotNull(res.getBody());
        assertEquals("cá độ bóng đá", res.getBody().getPattern());
        verify(lexiconService, times(1)).reloadCache();
    }

    @Test
    @DisplayName("Admin: Cập nhật mục từ điển thành công và làm mới cache")
    void testUpdateLexicon_Success() {
        ModerationLexicon existing = ModerationLexicon.builder()
                .id("lex-1")
                .category("PROFANITY_VI")
                .pattern("vcl")
                .severity("ERROR")
                .active(true)
                .build();

        when(lexiconRepository.findById("lex-1")).thenReturn(Optional.of(existing));
        when(lexiconRepository.save(any(ModerationLexicon.class))).thenAnswer(inv -> inv.getArgument(0));

        LexiconUpdateRequest req = new LexiconUpdateRequest();
        req.setActive(false);
        req.setSeverity("WARNING");

        ResponseEntity<ModerationLexicon> res = controller.updateLexicon("lex-1", req);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertNotNull(res.getBody());
        assertFalse(res.getBody().getActive());
        assertEquals("WARNING", res.getBody().getSeverity());
        verify(lexiconService, times(1)).reloadCache();
    }

    @Test
    @DisplayName("Admin: Xóa mục từ điển thành công và làm mới cache")
    void testDeleteLexicon_Success() {
        when(lexiconRepository.existsById("lex-1")).thenReturn(true);

        ResponseEntity<Void> res = controller.deleteLexicon("lex-1");

        assertEquals(HttpStatus.NO_CONTENT, res.getStatusCode());
        verify(lexiconRepository, times(1)).deleteById("lex-1");
        verify(lexiconService, times(1)).reloadCache();
    }

    @Test
    @DisplayName("Admin: Nạp lại bộ nhớ đệm từ điển thủ công")
    void testReloadCache() {
        ResponseEntity<String> res = controller.reloadCache();

        assertEquals(HttpStatus.OK, res.getStatusCode());
        verify(lexiconService, times(1)).reloadCache();
    }
}
