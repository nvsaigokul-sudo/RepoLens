package com.titansearch.dto.response;

public record ApiEnvelope<T>(T data, ApiMeta meta, ApiError error) {

    public static <T> ApiEnvelope<T> ok(T data) {
        return new ApiEnvelope<>(data, null, null);
    }

    public static <T> ApiEnvelope<T> ok(T data, ApiMeta meta) {
        return new ApiEnvelope<>(data, meta, null);
    }

    public static <T> ApiEnvelope<T> failed(ApiError error) {
        return new ApiEnvelope<>(null, null, error);
    }

    public record ApiMeta(boolean cached, Long cacheTtlSeconds) {}

    public record ApiError(String code, String message) {}
}
