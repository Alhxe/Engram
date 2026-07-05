package com.engram;

import com.engram.config.NativeHints;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ImportRuntimeHints;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ImportRuntimeHints(NativeHints.class)
public class EngramApplication {

    public static void main(String[] args) {
        SpringApplication.run(EngramApplication.class, args);
    }
}
