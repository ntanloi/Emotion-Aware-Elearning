package com.elearning.emotion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ContentAnalysisCacheId implements Serializable {

    @Column(name = "content_hash", columnDefinition = "CHAR(64)")
    private String contentHash;

    @Column(name = "rule_id", length = 20)
    private String ruleId;

    @Column(name = "prompt_version", length = 20)
    private String promptVersion;

    @Column(name = "model", length = 60)
    private String model;
}
