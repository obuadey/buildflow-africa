package com.buildflow.africa.variations;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "variations")
public class Variation extends TenantEntity {

  @Column(name = "project_id", nullable = false) private UUID projectId;
  @Column(name = "contract_id") private UUID contractId;
  @Column(name = "variation_number", nullable = false) private String variationNumber;
  @Column(nullable = false) private String title;
  private String detail;
  @Column(nullable = false) private BigDecimal amount = BigDecimal.ZERO;
  @Column(nullable = false) private String status = "DRAFT";
  @Column(name = "requested_by") private String requestedBy;
  @Column(name = "approved_at") private Instant approvedAt;

  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public UUID getContractId() { return contractId; }
  public void setContractId(UUID contractId) { this.contractId = contractId; }
  public String getVariationNumber() { return variationNumber; }
  public void setVariationNumber(String variationNumber) { this.variationNumber = variationNumber; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDetail() { return detail; }
  public void setDetail(String detail) { this.detail = detail; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getRequestedBy() { return requestedBy; }
  public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
  public Instant getApprovedAt() { return approvedAt; }
  public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
}
