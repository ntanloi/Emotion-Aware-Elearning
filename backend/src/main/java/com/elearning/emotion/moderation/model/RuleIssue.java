package com.elearning.emotion.moderation.model;

import lombok.Builder;
import lombok.Value;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Value
@Builder
public class RuleIssue {
    String ruleId;
    String category;
    Severity severity;
    @Builder.Default
    String source = "RULE"; // RULE | TOOL | LLM
    String targetType;       // COURSE | SECTION | GROUP | ITEM | QUESTION | PASSAGE | VOCAB_WORD | MEDIA
    String targetId;
    String message;
    String suggestion;
    String evidence;
    Float confidence;
    String model;
    String promptVersion;
    String jumpTo;
    String issueKey;

    public String generateIssueKey(String contentHash) {
        return generateIssueKey(ruleId, targetType, targetId, contentHash);
    }

    public static String generateIssueKey(String ruleId, String targetType, String targetId, String contentHash) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String raw = (ruleId != null ? ruleId : "") + "|"
                    + (targetType != null ? targetType : "") + "|"
                    + (targetId != null ? targetId : "") + "|"
                    + (contentHash != null ? contentHash : "");
            byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return java.util.UUID.randomUUID().toString();
        }
    }
}
