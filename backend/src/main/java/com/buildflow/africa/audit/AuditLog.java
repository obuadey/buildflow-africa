package com.buildflow.africa.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One immutable record of a change. Tenant id is nullable so platform actions live in the same
 * ledger as company actions and can be read together.
 */
@Entity
@Table(name = "audit_logs")
public class AuditLog {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "tenant_id") private UUID tenantId;
  @Column(name = "user_id") private UUID userId;
  @Column(name = "actor_email") private String actorEmail;
  @Column(nullable = false) private String scope = "TENANT";
  @Column(nullable = false) private String action;
  @Column(name = "entity_type", nullable = false) private String entityType;
  @Column(name = "entity_id") private UUID entityId;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "previous_values", columnDefinition = "jsonb") private String previousValues;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "new_values", columnDefinition = "jsonb") private String newValues;
  @Column(name = "ip_address") private String ipAddress;
  @Column(name = "user_agent") private String userAgent;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public String getActorEmail() { return actorEmail; }
  public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }
  public String getScope() { return scope; }
  public void setScope(String scope) { this.scope = scope; }
  public String getAction() { return action; }
  public void setAction(String action) { this.action = action; }
  public String getEntityType() { return entityType; }
  public void setEntityType(String entityType) { this.entityType = entityType; }
  public UUID getEntityId() { return entityId; }
  public void setEntityId(UUID entityId) { this.entityId = entityId; }
  public String getPreviousValues() { return previousValues; }
  public void setPreviousValues(String previousValues) { this.previousValues = previousValues; }
  public String getNewValues() { return newValues; }
  public void setNewValues(String newValues) { this.newValues = newValues; }
  public String getIpAddress() { return ipAddress; }
  public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
  public String getUserAgent() { return userAgent; }
  public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
