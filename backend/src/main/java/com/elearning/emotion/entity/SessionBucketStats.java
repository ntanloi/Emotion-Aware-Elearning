package com.elearning.emotion.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "session_bucket_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionBucketStats {

    @EmbeddedId
    private SessionBucketStatsId id;

    @Column(name = "content_item_id", columnDefinition = "CHAR(36)", nullable = false)
    private String contentItemId;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "n_total", nullable = false)
    @Builder.Default
    private Integer total = 0;

    @Column(name = "n_engaged", nullable = false)
    @Builder.Default
    private Integer engaged = 0;

    @Column(name = "n_interested", nullable = false)
    @Builder.Default
    private Integer interested = 0;

    @Column(name = "n_neutral", nullable = false)
    @Builder.Default
    private Integer neutral = 0;

    @Column(name = "n_confused", nullable = false)
    @Builder.Default
    private Integer confused = 0;

    @Column(name = "n_bored", nullable = false)
    @Builder.Default
    private Integer bored = 0;

    @Column(name = "n_noface", nullable = false)
    @Builder.Default
    private Integer noFace = 0;
}
