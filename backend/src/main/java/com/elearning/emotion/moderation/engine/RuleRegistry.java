package com.elearning.emotion.moderation.engine;

import com.elearning.emotion.moderation.rule.ModerationRule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@Slf4j
public class RuleRegistry {

    private final Map<String, ModerationRule> rulesById = new LinkedHashMap<>();
    private final Map<String, List<ModerationRule>> rulesByCategory = new LinkedHashMap<>();

    public RuleRegistry(List<ModerationRule> rules) {
        if (rules != null) {
            for (ModerationRule r : rules) {
                rulesById.put(r.id(), r);
                rulesByCategory.computeIfAbsent(r.category().toUpperCase(), k -> new ArrayList<>()).add(r);
            }
        }
        log.info("RuleRegistry đã đăng ký {} luật kiểm duyệt thuộc {} nhóm", rulesById.size(), rulesByCategory.size());
    }

    public ModerationRule getRule(String ruleId) {
        return rulesById.get(ruleId);
    }

    public List<ModerationRule> getRulesByCategory(String category) {
        if (category == null) return Collections.emptyList();
        return rulesByCategory.getOrDefault(category.toUpperCase(), Collections.emptyList());
    }

    public Collection<ModerationRule> getAllRules() {
        return rulesById.values();
    }
}
