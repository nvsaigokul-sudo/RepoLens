package com.titansearch.service.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    public <T> Optional<T> get(String key, Class<T> type) {
        try {
            Object val = redisTemplate.opsForValue().get(key);
            if (val == null) {
                return Optional.empty();
            }
            return Optional.of(type.cast(val));
        } catch (Exception e) {
            log.error("Failed to read from Redis cache for key={}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public void put(String key, Object value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Failed to write to Redis cache for key={}: {}", key, e.getMessage());
        }
    }

    public void evict(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.error("Failed to evict Redis cache key={}: {}", key, e.getMessage());
        }
    }
}
