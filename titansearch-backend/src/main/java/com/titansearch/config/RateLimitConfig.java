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

    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> aiBuckets = new ConcurrentHashMap<>();

    // Standard rate limit: 60 req/min for anonymous, 300 req/min for authenticated
    public Bucket resolveGeneralBucket(String key, boolean isAuthenticated) {
        return generalBuckets.computeIfAbsent(key, k -> {
            int capacity = isAuthenticated ? 300 : 60;
            Refill refill = Refill.intervally(capacity, Duration.ofMinutes(1));
            Bandwidth limit = Bandwidth.classic(capacity, refill);
            return Bucket.builder().addLimit(limit).build();
        });
    }

    // AI-backed endpoints limit: 5/hour per user
    public Bucket resolveAiBucket(String key) {
        return aiBuckets.computeIfAbsent(key, k -> {
            Refill refill = Refill.intervally(5, Duration.ofHours(1));
            Bandwidth limit = Bandwidth.classic(5, refill);
            return Bucket.builder().addLimit(limit).build();
        });
    }

    public void clear() {
        generalBuckets.clear();
        aiBuckets.clear();
    }
}
