package com.titansearch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TitanSearchApplication {
    public static void main(String[] args) {
        SpringApplication.run(TitanSearchApplication.class, args);
    }
}
