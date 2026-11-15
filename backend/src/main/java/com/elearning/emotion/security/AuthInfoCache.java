package com.elearning.emotion.security;

import com.elearning.emotion.dto.UserAuthInfo;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * B4: Bộ nhớ đệm ngắn (Short-lived In-memory Cache) lưu thông tin trạng thái & tokenVersion.
 * Tránh truy vấn cơ sở dữ liệu trên mỗi request HTTP nhưng vẫn đảm bảo thu hồi tức thì khi Admin khóa tài khoản (thông qua evict).
 */
@Component
public class AuthInfoCache {

    private record CacheEntry(UserAuthInfo authInfo, long expiresAtMillis) {}

    private static final long TTL_MILLIS = 60_000L; // 60 giây TTL
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public UserAuthInfo get(String userId, Function<String, Optional<UserAuthInfo>> loader) {
        if (userId == null) return null;
        long now = System.currentTimeMillis();
        CacheEntry entry = cache.get(userId);
        if (entry != null && entry.expiresAtMillis > now) {
            return entry.authInfo;
        }

        Optional<UserAuthInfo> fresh = loader.apply(userId);
        if (fresh.isEmpty()) {
            cache.remove(userId);
            return null;
        }

        UserAuthInfo info = fresh.get();
        cache.put(userId, new CacheEntry(info, now + TTL_MILLIS));
        return info;
    }

    public void evict(String userId) {
        if (userId != null) {
            cache.remove(userId);
        }
    }

    public void clear() {
        cache.clear();
    }
}
