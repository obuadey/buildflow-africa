package com.buildflow.africa.library;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "assemblies")
public class Assembly extends TenantEntity {
  @Column(nullable = false) private String name;
  private String category;
  @Column(nullable = false) private String unit = "m2";
  @Column(name = "unit_cost", nullable = false) private BigDecimal unitCost = BigDecimal.ZERO;
  private String notes;

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public BigDecimal getUnitCost() { return unitCost; }
  public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
}
