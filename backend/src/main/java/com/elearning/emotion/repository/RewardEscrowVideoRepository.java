package com.elearning.emotion.repository;

import com.elearning.emotion.entity.RewardEscrowVideo;
import com.elearning.emotion.entity.RewardEscrowVideoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RewardEscrowVideoRepository extends JpaRepository<RewardEscrowVideo, RewardEscrowVideoId> {

    List<RewardEscrowVideo> findByEscrowId(String escrowId);
}
