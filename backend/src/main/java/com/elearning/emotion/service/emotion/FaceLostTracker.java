package com.elearning.emotion.service.emotion;

import com.elearning.emotion.config.RewardProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class FaceLostTracker {

    private final RewardProperties props;
    // [noFaceStreak, faceStreak, lost (0 hoặc 1)]
    private final Map<String, int[]> state = new ConcurrentHashMap<>();

    /**
     * Trả về true nếu sau lô này phiên đang ở trạng thái rời cam (FACE_LOST).
     * Chuyển sang FACE_LOST khi có đủ faceLostPauseBatches (mặc định 5) lô liên tiếp toàn NO_FACE.
     * Thoát khỏi FACE_LOST khi có mặt người trong ít nhất 2 lô liên tiếp.
     */
    public boolean update(String sessionId, boolean anyFace, boolean allNoFace) {
        int[] s = state.computeIfAbsent(sessionId, k -> new int[3]);
        synchronized (s) {
            if (anyFace) {
                s[0] = 0;
                s[1]++;
                if (s[2] == 1 && s[1] >= 2) {
                    s[2] = 0;
                }
            } else if (allNoFace) {
                s[1] = 0;
                s[0]++;
                if (s[0] >= props.getFaceLostPauseBatches()) {
                    s[2] = 1;
                }
            }
            return s[2] == 1;
        }
    }

    public void clear(String sessionId) {
        state.remove(sessionId);
    }
}
