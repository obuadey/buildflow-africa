package com.buildflow.africa.users;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
  @Id @GeneratedValue private UUID id;
  private UUID tenantId;
  private String fullName;
  private String email;
  private String passwordHash;
  private int tokenVersion;
  private String platformRole;
  private boolean enabled = true;
  private boolean emailVerified;
  private Integer failedLoginAttempts = 0;
  private Instant lockedUntil;
  private Instant lastLoginAt;
  private Instant passwordChangedAt;
  /** Set when someone else chose this account's password: a seeded operator, an invited colleague. */
  private boolean mustChangePassword;
  private Instant createdAt = Instant.now();

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public String getFullName() { return fullName; }
  public void setFullName(String fullName) { this.fullName = fullName; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
  public boolean isEmailVerified() { return emailVerified; }
  public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
  public int getTokenVersion() { return tokenVersion; }
  public void setTokenVersion(int tokenVersion) { this.tokenVersion = tokenVersion; }
  public Instant getLastLoginAt() { return lastLoginAt; }
  public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }
  public Instant getPasswordChangedAt() { return passwordChangedAt; }
  public void setPasswordChangedAt(Instant passwordChangedAt) { this.passwordChangedAt = passwordChangedAt; }
  public String getPlatformRole() { return platformRole; }
  public void setPlatformRole(String platformRole) { this.platformRole = platformRole; }
  public Integer getFailedLoginAttempts() { return failedLoginAttempts; }
  public void setFailedLoginAttempts(Integer failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }
  public Instant getLockedUntil() { return lockedUntil; }
  public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
  public boolean isMustChangePassword() { return mustChangePassword; }
  public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }
}
