package com.titansearch.config;

public class SecurityContext {
    private static final ThreadLocal<String> gitHubTokenHolder = new ThreadLocal<>();
    private static final ThreadLocal<String> geminiKeyHolder = new ThreadLocal<>();

    public static void setGitHubToken(String token) {
        gitHubTokenHolder.set(token);
    }

    public static String getGitHubToken() {
        return gitHubTokenHolder.get();
    }

    public static void setGeminiKey(String key) {
        geminiKeyHolder.set(key);
    }

    public static String getGeminiKey() {
        return geminiKeyHolder.get();
    }

    public static void clear() {
        gitHubTokenHolder.remove();
        geminiKeyHolder.remove();
    }
}
