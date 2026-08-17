package com.buildflow.africa.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "tenant_settings")
public class TenantSettings {
  @Id @Column(name = "tenant_id") private UUID tenantId;
  private String introduction;
  private String exclusions;
  @Column(name = "footer_text") private String footerText;
  @Column(name = "bank_details") private String bankDetails;
  @Column(name = "momo_details") private String momoDetails;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "notification_prefs", columnDefinition = "jsonb") private String notificationPrefs = "{}";
  @Column(name = "mfa_required", nullable = false) private boolean mfaRequired = true;
  @Column(name = "ip_restriction_enabled", nullable = false) private boolean ipRestrictionEnabled;
  @Column(name = "allowed_ip_ranges") private String allowedIpRanges;
  @Column(name = "updated_at") private Instant updatedAt = Instant.now();

  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public String getIntroduction() { return introduction; }
  public void setIntroduction(String introduction) { this.introduction = introduction; }
  public String getExclusions() { return exclusions; }
  public void setExclusions(String exclusions) { this.exclusions = exclusions; }
  public String getFooterText() { return footerText; }
  public void setFooterText(String footerText) { this.footerText = footerText; }
  public String getBankDetails() { return bankDetails; }
  public void setBankDetails(String bankDetails) { this.bankDetails = bankDetails; }
  public String getMomoDetails() { return momoDetails; }
  public void setMomoDetails(String momoDetails) { this.momoDetails = momoDetails; }
  public String getNotificationPrefs() { return notificationPrefs; }
  public void setNotificationPrefs(String notificationPrefs) { this.notificationPrefs = notificationPrefs; }
  public boolean isMfaRequired() { return mfaRequired; }
  public void setMfaRequired(boolean mfaRequired) { this.mfaRequired = mfaRequired; }
  public boolean isIpRestrictionEnabled() { return ipRestrictionEnabled; }
  public void setIpRestrictionEnabled(boolean ipRestrictionEnabled) { this.ipRestrictionEnabled = ipRestrictionEnabled; }
  public String getAllowedIpRanges() { return allowedIpRanges; }
  public void setAllowedIpRanges(String allowedIpRanges) { this.allowedIpRanges = allowedIpRanges; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
