package com.buildflow.africa.estimates;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "estimates")
public class Estimate extends TenantEntity {
  private UUID projectId;
  private UUID clientId;
  private String estimateNumber;
  private String title;
  private String estimatorName;
  private String status = "DRAFT";
  private String currency = "GHS";
  private BigDecimal overheadPercent = BigDecimal.ZERO;
  private BigDecimal contingencyPercent = BigDecimal.ZERO;
  private BigDecimal profitPercent = BigDecimal.ZERO;
  private BigDecimal taxPercent = BigDecimal.ZERO;
  private BigDecimal discountAmount = BigDecimal.ZERO;
  private BigDecimal directCost = BigDecimal.ZERO;
  private BigDecimal overheadAmount = BigDecimal.ZERO;
  private BigDecimal contingencyAmount = BigDecimal.ZERO;
  private BigDecimal profitAmount = BigDecimal.ZERO;
  private BigDecimal taxAmount = BigDecimal.ZERO;
  private BigDecimal totalAmount = BigDecimal.ZERO;

  @OneToMany(mappedBy = "estimate", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder asc")
  private List<EstimateSection> sections = new ArrayList<>();

  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public UUID getClientId() { return clientId; }
  public void setClientId(UUID clientId) { this.clientId = clientId; }
  public String getEstimateNumber() { return estimateNumber; }
  public void setEstimateNumber(String estimateNumber) { this.estimateNumber = estimateNumber; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getEstimatorName() { return estimatorName; }
  public void setEstimatorName(String estimatorName) { this.estimatorName = estimatorName; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getCurrency() { return currency; }
  public void setCurrency(String currency) { this.currency = currency; }
  public BigDecimal getOverheadPercent() { return overheadPercent; }
  public void setOverheadPercent(BigDecimal overheadPercent) { this.overheadPercent = overheadPercent; }
  public BigDecimal getContingencyPercent() { return contingencyPercent; }
  public void setContingencyPercent(BigDecimal contingencyPercent) { this.contingencyPercent = contingencyPercent; }
  public BigDecimal getProfitPercent() { return profitPercent; }
  public void setProfitPercent(BigDecimal profitPercent) { this.profitPercent = profitPercent; }
  public BigDecimal getTaxPercent() { return taxPercent; }
  public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }
  public BigDecimal getDiscountAmount() { return discountAmount; }
  public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
  public BigDecimal getDirectCost() { return directCost; }
  public void setDirectCost(BigDecimal directCost) { this.directCost = directCost; }
  public BigDecimal getOverheadAmount() { return overheadAmount; }
  public void setOverheadAmount(BigDecimal overheadAmount) { this.overheadAmount = overheadAmount; }
  public BigDecimal getContingencyAmount() { return contingencyAmount; }
  public void setContingencyAmount(BigDecimal contingencyAmount) { this.contingencyAmount = contingencyAmount; }
  public BigDecimal getProfitAmount() { return profitAmount; }
  public void setProfitAmount(BigDecimal profitAmount) { this.profitAmount = profitAmount; }
  public BigDecimal getTaxAmount() { return taxAmount; }
  public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
  public BigDecimal getTotalAmount() { return totalAmount; }
  public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
  public List<EstimateSection> getSections() { return sections; }
}
