package com.elearning.emotion.entity;

import lombok.*;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class RewardEscrowVideoId implements Serializable {
    private String escrowId;
    private String contentItemId;
}
