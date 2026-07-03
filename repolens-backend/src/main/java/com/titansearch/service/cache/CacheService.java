package com.titansearch.service.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public void put(String key, Object value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Failed to write to Redis cache, key={}: {}", key, e.getMessage());
        }
    }

    public Object get(String key) {
        try {
            return redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.error("Failed to read from Redis cache, key={}: {}", key, e.getMessage());
            return null;
        }
    }

    public <T> T get(String key, Class<T> type) {
        try {
            Object val = redisTemplate.opsForValue().get(key);
            if (val == null) {
                return null;
            }
            if (type.isInstance(val)) {
                return type.cast(val);
            }
            // If the serializer stores it as a LinkedHashMap, convert it using Jackson
            return objectMapper.convertValue(val, type);
        } catch (Exception e) {
            log.error("Failed to read and convert from Redis cache, key={}: {}", key, e.getMessage());
            return null;
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
