package com.buildflow.africa.rates;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One historical price for a material. Rows are only ever appended. */
@Entity
@Table(name = "material_prices")
public class MaterialPrice {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "tenant_id") private UUID tenantId;
  @Column(name = "material_id") private UUID materialId;
  @Column(nullable = false) private String country = "Ghana";
  private String region;
  private String city;
  @Column(name = "supplier_id") private UUID supplierId;
  @Column(nullable = false) private BigDecimal price = BigDecimal.ZERO;
  @Column(nullable = false) private String source = "TENANT";
  @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate = LocalDate.now();
  @Column(name = "changed_by") private String changedBy;
  private String note;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  @Column(name = "updated_at") private Instant updatedAt;

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public UUID getMaterialId() { return materialId; }
  public void setMaterialId(UUID materialId) { this.materialId = materialId; }
  public String getCountry() { return country; }
  public void setCountry(String country) { this.country = country; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public UUID getSupplierId() { return supplierId; }
  public void setSupplierId(UUID supplierId) { this.supplierId = supplierId; }
  public BigDecimal getPrice() { return price; }
  public void setPrice(BigDecimal price) { this.price = price; }
  public String getSource() { return source; }
  public void setSource(String source) { this.source = source; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public String getChangedBy() { return changedBy; }
  public void setChangedBy(String changedBy) { this.changedBy = changedBy; }
  public String getNote() { return note; }
  public void setNote(String note) { this.note = note; }
  public Instant getCreatedAt() { return createdAt; }
}
