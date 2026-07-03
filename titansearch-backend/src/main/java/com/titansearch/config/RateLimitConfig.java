package com.titansearch.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitConfig {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    /**
     * Resolves the Bucket4j rate limit bucket for the given key.
     * key: IP address for anonymous traffic, username/email for authenticated traffic.
     */
    public Bucket resolveBucket(String key, boolean isAuthenticated) {
        return cache.computeIfAbsent(key, k -> createNewBucket(isAuthenticated));
    }

    private Bucket createNewBucket(boolean isAuthenticated) {
        int limit = isAuthenticated ? 300 : 60;
        return Bucket.builder()
                .addLimit(Bandwidth.classic(limit, Refill.intervally(limit, Duration.ofMinutes(1))))
                .build();
    }
}
