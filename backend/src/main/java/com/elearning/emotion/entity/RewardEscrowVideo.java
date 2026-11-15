package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "reward_escrow_videos")
@IdClass(RewardEscrowVideoId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardEscrowVideo {

    @Id
    @Column(name = "escrow_id", columnDefinition = "CHAR(36)", nullable = false)
    private String escrowId;

    @Id
    @Column(name = "content_item_id", columnDefinition = "CHAR(36)", nullable = false)
    private String contentItemId;
}
