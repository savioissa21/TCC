package com.tcc.dashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DashboardApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(DashboardApiApplication.class, args);
	}

}
