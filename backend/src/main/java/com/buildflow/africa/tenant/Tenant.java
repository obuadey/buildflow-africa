package com.buildflow.africa.tenant;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tenants")
public class Tenant {
  @Id @GeneratedValue private UUID id;
  private String name;
  private String slug;
  private String plan = "Starter";
  private String status = "ACTIVE";
  private String suspendedReason;
  private java.time.Instant suspendedAt;
  private String logoKey;
  private String accentColor = "#2563EB";
  private String phone;
  private String email;
  private String address;
  private String region;
  private String city;
  private String website;
  private String tin;
  private boolean vatRegistered;
  private String defaultCurrency = "GHS";
  private BigDecimal defaultMarkup = BigDecimal.ZERO;
  private BigDecimal defaultOverhead = BigDecimal.ZERO;
  private BigDecimal defaultProfitMargin = BigDecimal.ZERO;
  private Integer estimateValidityDays = 30;
  private String paymentTerms;
  /** Off by default: a contractor's price book is not rewritten without their say-so. */
  private boolean autoUpdateRates;
  private Instant ratesUpdatedAt;
  private Instant createdAt = Instant.now();

  public UUID getId() { return id; }
  public boolean isAutoUpdateRates() { return autoUpdateRates; }
  public void setAutoUpdateRates(boolean autoUpdateRates) { this.autoUpdateRates = autoUpdateRates; }
  public Instant getRatesUpdatedAt() { return ratesUpdatedAt; }
  public void setRatesUpdatedAt(Instant ratesUpdatedAt) { this.ratesUpdatedAt = ratesUpdatedAt; }
  public String getSlug() { return slug; }
  public void setSlug(String slug) { this.slug = slug; }
  public String getPlan() { return plan; }
  public void setPlan(String plan) { this.plan = plan; }
  public String getLogoKey() { return logoKey; }
  public void setLogoKey(String logoKey) { this.logoKey = logoKey; }
  public String getAccentColor() { return accentColor; }
  public void setAccentColor(String accentColor) { this.accentColor = accentColor; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getAddress() { return address; }
  public void setAddress(String address) { this.address = address; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public String getWebsite() { return website; }
  public void setWebsite(String website) { this.website = website; }
  public String getTin() { return tin; }
  public void setTin(String tin) { this.tin = tin; }
  public boolean isVatRegistered() { return vatRegistered; }
  public void setVatRegistered(boolean vatRegistered) { this.vatRegistered = vatRegistered; }
  public String getDefaultCurrency() { return defaultCurrency; }
  public void setDefaultCurrency(String defaultCurrency) { this.defaultCurrency = defaultCurrency; }
  public BigDecimal getDefaultMarkup() { return defaultMarkup; }
  public void setDefaultMarkup(BigDecimal defaultMarkup) { this.defaultMarkup = defaultMarkup; }
  public BigDecimal getDefaultOverhead() { return defaultOverhead; }
  public void setDefaultOverhead(BigDecimal defaultOverhead) { this.defaultOverhead = defaultOverhead; }
  public BigDecimal getDefaultProfitMargin() { return defaultProfitMargin; }
  public void setDefaultProfitMargin(BigDecimal defaultProfitMargin) { this.defaultProfitMargin = defaultProfitMargin; }
  public Integer getEstimateValidityDays() { return estimateValidityDays; }
  public void setEstimateValidityDays(Integer estimateValidityDays) { this.estimateValidityDays = estimateValidityDays; }
  public String getPaymentTerms() { return paymentTerms; }
  public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getSuspendedReason() { return suspendedReason; }
  public void setSuspendedReason(String suspendedReason) { this.suspendedReason = suspendedReason; }
  public java.time.Instant getSuspendedAt() { return suspendedAt; }
  public void setSuspendedAt(java.time.Instant suspendedAt) { this.suspendedAt = suspendedAt; }
  public java.time.Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(java.time.Instant createdAt) { this.createdAt = createdAt; }
}
