package com.buildflow.africa.contracts;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "contracts")
public class Contract extends TenantEntity {

  @Column(name = "project_id", nullable = false) private UUID projectId;
  @Column(name = "quotation_id") private UUID quotationId;
  @Column(name = "contract_number", nullable = false) private String contractNumber;
  @Column(name = "original_amount", nullable = false) private BigDecimal originalAmount = BigDecimal.ZERO;
  @Column(name = "variation_amount", nullable = false) private BigDecimal variationAmount = BigDecimal.ZERO;
  @Column(name = "retention_percent", nullable = false) private BigDecimal retentionPercent = new BigDecimal("5");
  @Column(name = "start_date") private LocalDate startDate;
  @Column(name = "end_date") private LocalDate endDate;
  @Column(nullable = false) private String status = "ACTIVE";
  private String notes;

  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public UUID getQuotationId() { return quotationId; }
  public void setQuotationId(UUID quotationId) { this.quotationId = quotationId; }
  public String getContractNumber() { return contractNumber; }
  public void setContractNumber(String contractNumber) { this.contractNumber = contractNumber; }
  public BigDecimal getOriginalAmount() { return originalAmount; }
  public void setOriginalAmount(BigDecimal originalAmount) { this.originalAmount = originalAmount; }
  public BigDecimal getVariationAmount() { return variationAmount; }
  public void setVariationAmount(BigDecimal variationAmount) { this.variationAmount = variationAmount; }
  public BigDecimal getRetentionPercent() { return retentionPercent; }
  public void setRetentionPercent(BigDecimal retentionPercent) { this.retentionPercent = retentionPercent; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getEndDate() { return endDate; }
  public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }

  /** Original award plus approved variations. The quotation it came from is never rewritten. */
  public BigDecimal contractValue() {
    return originalAmount.add(variationAmount);
  }
}
