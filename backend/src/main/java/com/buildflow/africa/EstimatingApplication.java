package com.buildflow.africa;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EstimatingApplication {
  public static void main(String[] args) {
    SpringApplication.run(EstimatingApplication.class, args);
  }
}

