package com.titansearch.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import java.net.http.HttpClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient gitHubRestClient(@Value("${titansearch.github.api-base-url}") String baseUrl,
                                        @Value("${titansearch.github.token}") String token) {
        HttpClient httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();

        RestClient.Builder builder = RestClient.builder()
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .baseUrl(baseUrl)
                .defaultHeader("Accept", "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .requestInterceptor((request, body, execution) -> {
                    ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                    String customGitToken = null;
                    if (attributes != null) {
                        customGitToken = attributes.getRequest().getHeader("X-GitHub-Token");
                    }
                    if (customGitToken == null || customGitToken.isBlank()) {
                        customGitToken = SecurityContext.getGitHubToken();
                    }
                    if (customGitToken != null && !customGitToken.isBlank()) {
                        request.getHeaders().set("Authorization", "Bearer " + customGitToken);
                        return execution.execute(request, body);
                    }
                    if (token != null && !token.isBlank()) {
                        request.getHeaders().set("Authorization", "Bearer " + token);
                    }
                    return execution.execute(request, body);
                });

        return builder.build();
    }
}

