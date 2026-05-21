package com.printflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class PrintflowApplication {
    public static void main(String[] args) {
        SpringApplication.run(PrintflowApplication.class, args);
    }
}
