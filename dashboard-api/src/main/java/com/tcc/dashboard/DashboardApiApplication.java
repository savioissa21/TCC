package com.tcc.dashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class DashboardApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(DashboardApiApplication.class, args);
	}

	@Bean(name = "miningTaskExecutor")
	public Executor miningTaskExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(1);
		executor.setMaxPoolSize(1);
		executor.setQueueCapacity(100);
		executor.setThreadNamePrefix("mining-");
		executor.initialize();
		return executor;
	}

}
