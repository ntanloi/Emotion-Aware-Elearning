package com.elearning.emotion.service;

import com.elearning.emotion.entity.CoursePolicy;
import com.elearning.emotion.entity.User;
import com.elearning.emotion.repository.CoursePolicyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class PolicyService {

    private final CoursePolicyRepository coursePolicyRepository;
    private final ObjectMapper objectMapper;

    private volatile JsonNode activePolicyJson;
    private volatile Integer activePolicyVersion = 1;

    @PostConstruct
    public void init() {
        try {
            loadOrSeedDefaultPolicy();
        } catch (Exception e) {
            log.error("Không thể khởi tạo Course Policy: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void loadOrSeedDefaultPolicy() throws Exception {
        CoursePolicy active = coursePolicyRepository.findFirstByActiveTrueOrderByVersionDesc().orElse(null);
        if (active != null) {
            this.activePolicyJson = objectMapper.readTree(active.getConfig());
            this.activePolicyVersion = active.getVersion();
            log.info("Loaded active Course Policy version {}", active.getVersion());
            return;
        }

        // Nếu DB chưa có bản nào, đọc từ classpath:moderation/policy.default.json
        ClassPathResource resource = new ClassPathResource("moderation/policy.default.json");
        if (resource.exists()) {
            try (InputStream is = resource.getInputStream()) {
                String rawJson = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                JsonNode root = objectMapper.readTree(rawJson);
                int ver = root.path("version").asInt(1);

                CoursePolicy seeded = CoursePolicy.builder()
                        .version(ver)
                        .config(rawJson)
                        .active(true)
                        .build();
                coursePolicyRepository.save(seeded);

                this.activePolicyJson = root;
                this.activePolicyVersion = ver;
                log.info("Seeded default Course Policy version {} into database", ver);
            }
        } else {
            log.warn("File moderation/policy.default.json không tồn tại trong classpath");
        }
    }

    public JsonNode getActivePolicy() {
        if (activePolicyJson == null) {
            try {
                loadOrSeedDefaultPolicy();
            } catch (Exception e) {
                log.error("Lỗi lấy active policy: {}", e.getMessage());
            }
        }
        return activePolicyJson;
    }

    public int getActivePolicyVersion() {
        return activePolicyVersion != null ? activePolicyVersion : 1;
    }

    @Transactional
    public CoursePolicy createNewVersion(User admin, String configJson) throws Exception {
        JsonNode root = objectMapper.readTree(configJson);
        Integer maxVer = coursePolicyRepository.findMaxVersion();
        int newVer = (maxVer != null ? maxVer : 0) + 1;

        // Vô hiệu hóa các bản active cũ
        coursePolicyRepository.findAll().forEach(p -> {
            if (Boolean.TRUE.equals(p.getActive())) {
                p.setActive(false);
                coursePolicyRepository.save(p);
            }
        });

        CoursePolicy newPolicy = CoursePolicy.builder()
                .version(newVer)
                .config(configJson)
                .active(true)
                .createdBy(admin)
                .build();
        CoursePolicy saved = coursePolicyRepository.save(newPolicy);

        this.activePolicyJson = root;
        this.activePolicyVersion = newVer;
        log.info("Created and activated Course Policy version {}", newVer);
        return saved;
    }
}
