package com.buildflow.africa.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "login_attempts")
public class LoginAttempt {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(nullable = false) private String email;
  @Column(name = "ip_address") private String ipAddress;
  @Column(nullable = false) private boolean successful;
  @Column(name = "attempted_at", nullable = false) private Instant attemptedAt = Instant.now();

  public void setEmail(String email) { this.email = email; }
  public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
  public void setSuccessful(boolean successful) { this.successful = successful; }
  public Instant getAttemptedAt() { return attemptedAt; }
}
