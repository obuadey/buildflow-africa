package com.buildflow.africa.materials;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "materials")
public class Material extends TenantEntity {
  private UUID categoryId;
  private UUID supplierId;
  private String name;
  private String description;
  private String brand;
  private String unit;
  private BigDecimal purchasePrice = BigDecimal.ZERO;
  private BigDecimal sellingRate = BigDecimal.ZERO;
  private String location;
  private LocalDate effectiveDate = LocalDate.now();
  private boolean vatApplicable;
  private boolean active = true;
  private String notes;
  private String priceSource = "TENANT";

  public UUID getCategoryId() { return categoryId; }
  public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
  public UUID getSupplierId() { return supplierId; }
  public void setSupplierId(UUID supplierId) { this.supplierId = supplierId; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getBrand() { return brand; }
  public void setBrand(String brand) { this.brand = brand; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public BigDecimal getPurchasePrice() { return purchasePrice; }
  public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }
  public BigDecimal getSellingRate() { return sellingRate; }
  public void setSellingRate(BigDecimal sellingRate) { this.sellingRate = sellingRate; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public boolean isVatApplicable() { return vatApplicable; }
  public void setVatApplicable(boolean vatApplicable) { this.vatApplicable = vatApplicable; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public String getPriceSource() { return priceSource; }
  public void setPriceSource(String priceSource) { this.priceSource = priceSource; }
}
