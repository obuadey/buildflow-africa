package com.buildflow.africa.labour;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "labour_rates")
public class LabourRate extends TenantEntity {
  @Column(nullable = false) private String trade;
  @Column(nullable = false) private String unit = "day";
  @Column(nullable = false) private BigDecimal rate = BigDecimal.ZERO;
  @Column(name = "effective_date", nullable = false) private LocalDate effectiveDate = LocalDate.now();
  @Column(nullable = false) private boolean active = true;
  private String region;
  @Column(name = "crew_size", nullable = false) private int crewSize = 1;

  public String getTrade() { return trade; }
  public void setTrade(String trade) { this.trade = trade; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public BigDecimal getRate() { return rate; }
  public void setRate(BigDecimal rate) { this.rate = rate; }
  public LocalDate getEffectiveDate() { return effectiveDate; }
  public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
  public boolean isActive() { return active; }
  public void setActive(boolean active) { this.active = active; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public int getCrewSize() { return crewSize; }
  public void setCrewSize(int crewSize) { this.crewSize = crewSize; }
}
