package com.buildflow.africa.library;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "equipment")
public class Equipment extends TenantEntity {
  @Column(name = "supplier_id") private UUID supplierId;
  @Column(nullable = false) private String name;
  @Column(nullable = false) private String unit = "day";
  @Column(name = "hire_rate", nullable = false) private BigDecimal hireRate = BigDecimal.ZERO;
  @Column(name = "transport_cost", nullable = false) private BigDecimal transportCost = BigDecimal.ZERO;
  @Column(name = "operator_cost", nullable = false) private BigDecimal operatorCost = BigDecimal.ZERO;
  @Column(nullable = false) private boolean active = true;

  public UUID getSupplierId() { return supplierId; }
  public void setSupplierId(UUID supplierId) { this.supplierId = supplierId; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public BigDecimal getHireRate() { return hireRate; }
  public void setHireRate(BigDecimal hireRate) { this.hireRate = hireRate; }
  public BigDecimal getTransportCost() { return transportCost; }
  public void setTransportCost(BigDecimal transportCost) { this.transportCost = transportCost; }
  public BigDecimal getOperatorCost() { return operatorCost; }
  public void setOperatorCost(BigDecimal operatorCost) { this.operatorCost = operatorCost; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
}
