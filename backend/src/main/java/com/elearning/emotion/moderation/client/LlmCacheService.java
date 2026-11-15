package com.elearning.emotion.moderation.client;

import com.elearning.emotion.entity.ContentAnalysisCache;
import com.elearning.emotion.entity.ContentAnalysisCacheId;
import com.elearning.emotion.repository.ContentAnalysisCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LlmCacheService {

    private final ContentAnalysisCacheRepository cacheRepository;

    @Transactional(readOnly = true)
    public Optional<String> getCachedResult(String contentHash, String ruleId, String promptVersion, String model) {
        if (contentHash == null || ruleId == null) return Optional.empty();
        ContentAnalysisCacheId id = new ContentAnalysisCacheId(contentHash, ruleId, promptVersion, model);
        return cacheRepository.findById(id).map(ContentAnalysisCache::getResult);
    }

    @Transactional
    public void saveCache(String contentHash, String ruleId, String promptVersion, String model, String jsonResult) {
        if (contentHash == null || ruleId == null || jsonResult == null) return;
        try {
            ContentAnalysisCacheId id = new ContentAnalysisCacheId(contentHash, ruleId, promptVersion, model);
            ContentAnalysisCache entity = ContentAnalysisCache.builder()
                    .id(id)
                    .result(jsonResult)
                    .build();
            cacheRepository.save(entity);
        } catch (Exception ex) {
            log.warn("Không thể lưu cache phân tích nội dung LLM: {}", ex.getMessage());
        }
    }
}
