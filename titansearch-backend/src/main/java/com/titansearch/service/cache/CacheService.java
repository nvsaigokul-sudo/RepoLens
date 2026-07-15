package com.titansearch.service.cache;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class CacheService {

    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    private record CacheEntry(Object value, long expiresAt) {
        public boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }

    public <T> Optional<T> get(String key, Class<T> type) {
        CacheEntry entry = cache.get(key);
        if (entry == null) {
            return Optional.empty();
        }
        if (entry.isExpired()) {
            cache.remove(key);
            return Optional.empty();
        }
        try {
            return Optional.of(type.cast(entry.value()));
        } catch (Exception e) {
            log.error("Failed to cast cache value for key={}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public void put(String key, Object value, long ttlSeconds) {
        long expiresAt = System.currentTimeMillis() + (ttlSeconds * 1000);
        cache.put(key, new CacheEntry(value, expiresAt));
    }

    public void evict(String key) {
        cache.remove(key);
    }
}
