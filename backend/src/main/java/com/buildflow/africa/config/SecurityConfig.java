package com.buildflow.africa.config;

import com.buildflow.africa.auth.JwtAuthenticationFilter;
import com.buildflow.africa.auth.TenantResolutionFilter;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  @Value("${app.allowed-origins:http://localhost:3000}")
  private String allowedOrigins;

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
                                          TenantResolutionFilter tenantFilter) throws Exception {
    return http
        // The API is stateless and token authenticated; there is no session cookie to forge.
        .csrf(csrf -> csrf.disable())
        .cors(cors -> {})
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .headers(headers -> headers
            .frameOptions(frame -> frame.deny())
            .contentTypeOptions(options -> {})
            .referrerPolicy(policy -> policy.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
            .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
            .addHeaderWriter((request, response) -> response.addHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()"))
            .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'")))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
            .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
            .requestMatchers(HttpMethod.POST,
                "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh",
                "/api/v1/auth/logout", "/api/v1/auth/password/forgot", "/api/v1/auth/password/reset").permitAll()
            .requestMatchers("/api/v1/public/**").permitAll()
            // Platform routes are authenticated here and role-checked in PlatformSecurity.
            .requestMatchers("/api/v1/platform/**").authenticated()
            .requestMatchers("/actuator/**").denyAll()
            .anyRequest().authenticated())
        .exceptionHandling(handling -> handling
            .authenticationEntryPoint((request, response, exception) -> {
              response.setStatus(401);
              response.setContentType(MediaType.APPLICATION_JSON_VALUE);
              response.getWriter().write(
                  "{\"code\":\"UNAUTHENTICATED\",\"message\":\"Sign in to continue.\"}");
            })
            .accessDeniedHandler((request, response, exception) -> {
              response.setStatus(403);
              response.setContentType(MediaType.APPLICATION_JSON_VALUE);
              response.getWriter().write(
                  "{\"code\":\"FORBIDDEN\",\"message\":\"Your role does not allow this action.\"}");
            }))
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterAfter(tenantFilter, JwtAuthenticationFilter.class)
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  /**
   * The browser talks to the Next.js server, which talks to this API, so the allow-list only needs
   * the application origin. It is configured rather than wildcarded.
   */
  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Trace-Id", "X-Tenant-Slug",
        "Accept", "Origin"));
    config.setExposedHeaders(List.of("X-Trace-Id"));
    config.setAllowCredentials(false);
    config.setMaxAge(3600L);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
