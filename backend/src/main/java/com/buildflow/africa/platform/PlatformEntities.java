package com.buildflow.africa.platform;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Small platform-owned entities kept together; none of them belong to a tenant. */
public final class PlatformEntities {

  private PlatformEntities() {}

  @Entity
  @Table(name = "feature_flags")
  public static class FeatureFlag {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private String code;
    private String description;
    @Column(name = "enabled_globally", nullable = false) private boolean enabledGlobally;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at") private Instant updatedAt;

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isEnabledGlobally() { return enabledGlobally; }
    public void setEnabledGlobally(boolean enabledGlobally) { this.enabledGlobally = enabledGlobally; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  }

  @Entity
  @Table(name = "tenant_feature_flags")
  public static class TenantFeatureFlag {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "flag_code", nullable = false) private String flagCode;
    @Column(nullable = false) private boolean enabled;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getFlagCode() { return flagCode; }
    public void setFlagCode(String flagCode) { this.flagCode = flagCode; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  }

  @Entity
  @Table(name = "announcements")
  public static class Announcement {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private String title;
    @Column(nullable = false) private String body;
    @Column(nullable = false) private String severity = "INFO";
    @Column(nullable = false) private String audience = "ALL";
    @Column(name = "starts_at", nullable = false) private Instant startsAt = Instant.now();
    @Column(name = "ends_at") private Instant endsAt;
    @Column(nullable = false) private boolean published;
    @Column(name = "created_by") private String createdBy;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at") private Instant updatedAt;

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getAudience() { return audience; }
    public void setAudience(String audience) { this.audience = audience; }
    public Instant getStartsAt() { return startsAt; }
    public void setStartsAt(Instant startsAt) { this.startsAt = startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public void setEndsAt(Instant endsAt) { this.endsAt = endsAt; }
    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  }

  @Entity
  @Table(name = "impersonation_sessions")
  public static class ImpersonationSession {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "admin_user_id", nullable = false) private UUID adminUserId;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(nullable = false) private String reason;
    @Column(name = "started_at", nullable = false) private Instant startedAt = Instant.now();
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "ended_at") private Instant endedAt;
    @Column(name = "ip_address") private String ipAddress;

    public UUID getId() { return id; }
    public UUID getAdminUserId() { return adminUserId; }
    public void setAdminUserId(UUID adminUserId) { this.adminUserId = adminUserId; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
  }

  @Entity
  @Table(name = "platform_prices")
  public static class PlatformPrice {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private String country = "Ghana";
    private String region;
    private String city;
    @Column(name = "material_name", nullable = false) private String materialName;
    private String brand;
    @Column(nullable = false) private String unit;
    @Column(nullable = false) private BigDecimal price = BigDecimal.ZERO;
    private String source;
    @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate = LocalDate.now();
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at") private Instant updatedAt;

    public UUID getId() { return id; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getMaterialName() { return materialName; }
    public void setMaterialName(String materialName) { this.materialName = materialName; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
  }
}
