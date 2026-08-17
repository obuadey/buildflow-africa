package com.buildflow.africa.rates;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** A price a named supplier quoted a company, with the delivered cost where it is known. */
@Entity
@Table(name = "supplier_items")
public class SupplierItem extends TenantEntity {

  @Column(name = "supplier_id", nullable = false) private UUID supplierId;
  @Column(name = "material_id") private UUID materialId;
  @Column(nullable = false) private String description;
  @Column(nullable = false) private String unit;
  @Column(nullable = false) private BigDecimal price = BigDecimal.ZERO;
  @Column(name = "delivered_price") private BigDecimal deliveredPrice;
  @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate = LocalDate.now();

  public UUID getSupplierId() { return supplierId; }
  public void setSupplierId(UUID supplierId) { this.supplierId = supplierId; }
  public UUID getMaterialId() { return materialId; }
  public void setMaterialId(UUID materialId) { this.materialId = materialId; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public BigDecimal getPrice() { return price; }
  public void setPrice(BigDecimal price) { this.price = price; }
  public BigDecimal getDeliveredPrice() { return deliveredPrice; }
  public void setDeliveredPrice(BigDecimal deliveredPrice) { this.deliveredPrice = deliveredPrice; }
  /** What the material actually costs on site, which is the delivered price where one is quoted. */
  public BigDecimal landedPrice() { return deliveredPrice == null ? price : deliveredPrice; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
}
