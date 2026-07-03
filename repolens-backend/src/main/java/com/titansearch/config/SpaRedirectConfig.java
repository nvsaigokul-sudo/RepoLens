package com.titansearch.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SpaRedirectConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Forward top-level SPA routes (e.g., /login, /register) to index.html
        registry.addViewController("/{path:[^\\.]*}")
                .setViewName("forward:/index.html");
        
        // Forward nested repository detail routes (e.g., /repository/owner/repo) to index.html
        registry.addViewController("/repository/{owner}/{repo}")
                .setViewName("forward:/index.html");
    }
}
