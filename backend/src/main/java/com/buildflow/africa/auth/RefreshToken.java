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
@Table(name = "refresh_tokens")
public class RefreshToken {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "user_id", nullable = false) private UUID userId;
  /** Rotation family. Reusing a spent token revokes the whole family. */
  @Column(name = "family_id", nullable = false) private UUID familyId;
  @Column(name = "token_hash", nullable = false) private String tokenHash;
  @Column(name = "issued_at", nullable = false) private Instant issuedAt = Instant.now();
  @Column(name = "expires_at", nullable = false) private Instant expiresAt;
  @Column(name = "revoked_at") private Instant revokedAt;
  @Column(name = "replaced_by") private UUID replacedBy;
  @Column(name = "user_agent") private String userAgent;
  @Column(name = "ip_address") private String ipAddress;

  public UUID getId() { return id; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public UUID getFamilyId() { return familyId; }
  public void setFamilyId(UUID familyId) { this.familyId = familyId; }
  public String getTokenHash() { return tokenHash; }
  public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
  public Instant getIssuedAt() { return issuedAt; }
  public void setIssuedAt(Instant issuedAt) { this.issuedAt = issuedAt; }
  public Instant getExpiresAt() { return expiresAt; }
  public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
  public Instant getRevokedAt() { return revokedAt; }
  public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }
  public UUID getReplacedBy() { return replacedBy; }
  public void setReplacedBy(UUID replacedBy) { this.replacedBy = replacedBy; }
  public String getUserAgent() { return userAgent; }
  public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
  public String getIpAddress() { return ipAddress; }
  public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
