package com.insureit.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.concurrent.*;

@Configuration
public class OcrExecutorConfig {
    @Bean(destroyMethod = "shutdown")
    ExecutorService ocrExecutor() {
        return new ThreadPoolExecutor(2, 2, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(10), new ThreadPoolExecutor.AbortPolicy());
    }
}
