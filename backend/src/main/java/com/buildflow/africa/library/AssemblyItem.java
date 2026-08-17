package com.buildflow.africa.library;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "assembly_items")
public class AssemblyItem extends TenantEntity {
  @Column(name = "assembly_id", nullable = false) private UUID assemblyId;
  @Column(name = "material_id") private UUID materialId;
  @Column(name = "labour_rate_id") private UUID labourRateId;
  @Column(nullable = false) private String description;
  @Column(nullable = false) private BigDecimal quantity = BigDecimal.ONE;
  @Column(nullable = false) private String unit;
  @Column(nullable = false) private BigDecimal rate = BigDecimal.ZERO;
  @Column(name = "sort_order", nullable = false) private int sortOrder;

  public UUID getAssemblyId() { return assemblyId; }
  public void setAssemblyId(UUID assemblyId) { this.assemblyId = assemblyId; }
  public UUID getMaterialId() { return materialId; }
  public void setMaterialId(UUID materialId) { this.materialId = materialId; }
  public UUID getLabourRateId() { return labourRateId; }
  public void setLabourRateId(UUID labourRateId) { this.labourRateId = labourRateId; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public BigDecimal getQuantity() { return quantity; }
  public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public BigDecimal getRate() { return rate; }
  public void setRate(BigDecimal rate) { this.rate = rate; }
  public int getSortOrder() { return sortOrder; }
  public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
