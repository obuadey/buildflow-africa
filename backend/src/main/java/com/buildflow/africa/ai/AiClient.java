package com.buildflow.africa.ai;

import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Talks to the AI service. The browser never reaches it directly. */
@Component
public class AiClient {

  private final RestClient client;

  public AiClient(@Value("${ai.service.url:http://ai-service:8000}") String baseUrl,
                  @Value("${ai.service.timeout-seconds:30}") int timeoutSeconds) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(5));
    factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
    this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> post(String path, Object body) {
    return client.post()
        .uri(path)
        .contentType(MediaType.APPLICATION_JSON)
        .body(body)
        .retrieve()
        .body(Map.class);
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> get(String path) {
    return client.get()
        .uri(path)
        .retrieve()
        .body(Map.class);
  }
}
