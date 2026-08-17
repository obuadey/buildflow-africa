package com.buildflow.africa.membership;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Links a user to a company. Access is granted here and nowhere else. */
@Entity
@Table(name = "tenant_memberships")
public class TenantMembership {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "tenant_id", nullable = false) private UUID tenantId;
  @Column(name = "user_id", nullable = false) private UUID userId;
  @Column(nullable = false) private String role = "STAFF";
  @Column(nullable = false) private String status = "ACTIVE";
  @Column(name = "last_active_at") private Instant lastActiveAt;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

  public UUID getId() { return id; }
  public void setId(UUID id) { this.id = id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Instant getLastActiveAt() { return lastActiveAt; }
  public void setLastActiveAt(Instant lastActiveAt) { this.lastActiveAt = lastActiveAt; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
