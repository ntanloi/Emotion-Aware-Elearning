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
public class SessionBucketStatsId implements Serializable {

    @Column(name = "session_id", columnDefinition = "CHAR(36)", nullable = false)
    private String sessionId;

    @Column(name = "bucket_index", nullable = false)
    private Integer bucketIndex;
}
