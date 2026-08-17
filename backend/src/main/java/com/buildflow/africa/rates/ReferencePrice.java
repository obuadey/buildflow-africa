package com.buildflow.africa.rates;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A published rate that every company on the platform can read.
 *
 * These are reference figures loaded from a named source: a schedule of rates, a supplier price
 * list, a statistical series. They are never invented, and `source` and `effectiveDate` travel
 * with each row so a contractor can see where a number came from and how old it is before pricing
 * work from it.
 */
@Entity
@Table(name = "platform_prices")
public class ReferencePrice {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(nullable = false) private String country = "Ghana";
  private String region;
  private String city;
  private String category;
  @Column(name = "material_name", nullable = false) private String materialName;
  private String brand;
  @Column(nullable = false) private String unit;
  @Column(nullable = false) private BigDecimal price = BigDecimal.ZERO;
  @Column(nullable = false) private String source;
  @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate = LocalDate.now();
  @Column(name = "import_id") private UUID importId;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  @Column(name = "updated_at") private Instant updatedAt;

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getId() { return id; }
  public String getCountry() { return country; }
  public void setCountry(String country) { this.country = country; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
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
  public UUID getImportId() { return importId; }
  public void setImportId(UUID importId) { this.importId = importId; }
  public Instant getCreatedAt() { return createdAt; }
}
