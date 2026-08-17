package com.buildflow.africa.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Single-use token for password reset and email verification. Only the hash is stored. */
@Entity
@Table(name = "auth_tokens")
public class AuthToken {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "user_id", nullable = false) private UUID userId;
  @Column(nullable = false) private String purpose;
  @Column(name = "token_hash", nullable = false) private String tokenHash;
  @Column(name = "expires_at", nullable = false) private Instant expiresAt;
  @Column(name = "consumed_at") private Instant consumedAt;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

  public UUID getId() { return id; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public String getPurpose() { return purpose; }
  public void setPurpose(String purpose) { this.purpose = purpose; }
  public String getTokenHash() { return tokenHash; }
  public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
  public Instant getConsumedAt() { return consumedAt; }
  public void setConsumedAt(Instant consumedAt) { this.consumedAt = consumedAt; }
  public Instant getCreatedAt() { return createdAt; }
}
