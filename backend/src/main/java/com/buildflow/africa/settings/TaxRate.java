package com.buildflow.africa.settings;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "tax_rates")
public class TaxRate extends TenantEntity {
  @Column(nullable = false) private String name;
  @Column(nullable = false) private BigDecimal rate = BigDecimal.ZERO;
  @Column(name = "applies_to") private String appliesTo;
  @Column(name = "effective_from", nullable = false) private LocalDate effectiveFrom = LocalDate.now();
  @Column(nullable = false) private boolean active = true;

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public BigDecimal getRate() { return rate; }
  public void setRate(BigDecimal rate) { this.rate = rate; }
  public String getAppliesTo() { return appliesTo; }
  public void setAppliesTo(String appliesTo) { this.appliesTo = appliesTo; }
  public LocalDate getEffectiveFrom() { return effectiveFrom; }
  public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
}
