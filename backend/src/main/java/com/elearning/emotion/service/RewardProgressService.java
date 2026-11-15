package com.elearning.emotion.service;

import com.elearning.emotion.dto.RewardProgressDto;
import com.elearning.emotion.dto.VideoRewardStatusDto;
import com.elearning.emotion.entity.*;
import com.elearning.emotion.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RewardProgressService {

    private final RewardEscrowRepository escrowRepo;
    private final RewardEscrowVideoRepository escrowVideoRepo;
    private final ContentItemRepository contentItemRepo;
    private final CourseRepository courseRepo;
    private final VideoViewAttemptRepository attemptRepo;
    private final VideoViewAttemptService attemptService;

    @Transactional(readOnly = true)
    public List<RewardProgressDto> getMyRewards(String userId, String courseId) {
        List<RewardEscrow> escrows = (courseId != null && !courseId.isBlank())
                ? escrowRepo.findByUserIdAndCourseId(userId, courseId)
                : escrowRepo.findAllByUserId(userId);

        if (escrows.isEmpty()) {
            return List.of();
        }

        // Tải toàn bộ lượt xem của học viên 1 lần (tránh N+1)
        List<VideoViewAttempt> userAttempts = attemptRepo.findByUserIdOrderByCreatedAtDesc(userId);
        Map<String, List<VideoViewAttempt>> attemptsByVideo = userAttempts.stream()
                .collect(Collectors.groupingBy(VideoViewAttempt::getContentItemId));

        List<RewardProgressDto> dtos = new ArrayList<>();

        for (RewardEscrow e : escrows) {
            Course course = courseRepo.findById(e.getCourseId()).orElse(null);
            String courseTitle = (course != null) ? course.getTitle() : "Khóa học";

            List<RewardEscrowVideo> snapshotVideos = escrowVideoRepo.findByEscrowId(e.getId());
            List<String> videoIds = snapshotVideos.stream()
                    .map(RewardEscrowVideo::getContentItemId)
                    .toList();

            List<ContentItem> existingItems = videoIds.isEmpty()
                    ? List.of()
                    : contentItemRepo.findAllById(videoIds);

            Map<String, ContentItem> itemMap = existingItems.stream()
                    .collect(Collectors.toMap(ContentItem::getId, Function.identity()));

            List<VideoRewardStatusDto> videoDtos = new ArrayList<>();
            int validCount = 0;

            for (RewardEscrowVideo ev : snapshotVideos) {
                ContentItem item = itemMap.get(ev.getContentItemId());
                if (item == null) {
                    continue; // Video đã bị xóa bởi giảng viên -> loại khỏi danh sách yêu cầu
                }

                List<VideoViewAttempt> attempts = attemptsByVideo.getOrDefault(item.getId(), List.of());

                // 1. Kiểm tra có lượt VALID chốt sau thời điểm tạo escrow hay không
                Optional<VideoViewAttempt> validAttempt = attempts.stream()
                        .filter(a -> "VALID".equals(a.getStatus())
                                && a.getFinalizedAt() != null
                                && !a.getFinalizedAt().isBefore(e.getCreatedAt()))
                        .findFirst();

                if (validAttempt.isPresent()) {
                    validCount++;
                    var snapshot = attemptService.getSnapshot(validAttempt.get());
                    videoDtos.add(new VideoRewardStatusDto(
                            item.getId(),
                            item.getTitle(),
                            "VALID",
                            snapshot != null ? snapshot.coveragePercent() : 0.0,
                            snapshot != null ? snapshot.badPercent() : 0.0
                    ));
                } else {
                    // 2. Nếu chưa có VALID, kiểm tra có lượt OPEN gần nhất không
                    Optional<VideoViewAttempt> openAttempt = attempts.stream()
                            .filter(a -> "OPEN".equals(a.getStatus()))
                            .findFirst();

                    if (openAttempt.isPresent()) {
                        var snapshot = attemptService.getSnapshot(openAttempt.get());
                        videoDtos.add(new VideoRewardStatusDto(
                                item.getId(),
                                item.getTitle(),
                                "IN_PROGRESS",
                                snapshot != null ? snapshot.coveragePercent() : 0.0,
                                snapshot != null ? snapshot.badPercent() : 0.0
                        ));
                    } else {
                        videoDtos.add(new VideoRewardStatusDto(
                                item.getId(),
                                item.getTitle(),
                                "NOT_STARTED",
                                0.0,
                                0.0
                        ));
                    }
                }
            }

            int totalVideos = videoDtos.size();
            int requiredVideos = totalVideos == 0 ? 0
                    : (int) Math.ceil(totalVideos * e.getRequiredPercent().doubleValue() / 100.0);

            dtos.add(new RewardProgressDto(
                    e.getId(),
                    e.getCourseId(),
                    courseTitle,
                    e.getAmount(),
                    e.getStatus(),
                    validCount,
                    totalVideos,
                    requiredVideos,
                    e.getHoldingUntil(),
                    videoDtos
            ));
        }

        return dtos;
    }
}
