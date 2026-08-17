package com.buildflow.africa.quotations;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "quotations")
public class Quotation extends TenantEntity {
  private UUID estimateId;
  private UUID projectId;
  private UUID clientId;
  private String quoteNumber;
  private Integer version = 1;
  private String status = "DRAFT";
  private BigDecimal clientTotal = BigDecimal.ZERO;
  private BigDecimal costTotal = BigDecimal.ZERO;
  private LocalDate validUntil;
  private String terms;
  private String publicToken;
  private String ownerName;
  private Instant sentAt;
  private Instant viewedAt;
  private int viewCount;

  public UUID getEstimateId() { return estimateId; }
  public void setEstimateId(UUID estimateId) { this.estimateId = estimateId; }
  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public UUID getClientId() { return clientId; }
  public void setClientId(UUID clientId) { this.clientId = clientId; }
  public String getQuoteNumber() { return quoteNumber; }
  public void setQuoteNumber(String quoteNumber) { this.quoteNumber = quoteNumber; }
  public Integer getVersion() { return version; }
  public void setVersion(Integer version) { this.version = version; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public BigDecimal getClientTotal() { return clientTotal; }
  public void setClientTotal(BigDecimal clientTotal) { this.clientTotal = clientTotal; }
  public BigDecimal getCostTotal() { return costTotal; }
  public void setCostTotal(BigDecimal costTotal) { this.costTotal = costTotal; }
  public LocalDate getValidUntil() { return validUntil; }
  public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }
  public String getTerms() { return terms; }
  public void setTerms(String terms) { this.terms = terms; }
  public String getPublicToken() { return publicToken; }
  public void setPublicToken(String publicToken) { this.publicToken = publicToken; }
  public String getOwnerName() { return ownerName; }
  public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
  public Instant getSentAt() { return sentAt; }
  public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
  public Instant getViewedAt() { return viewedAt; }
  public void setViewedAt(Instant viewedAt) { this.viewedAt = viewedAt; }
  public int getViewCount() { return viewCount; }
  public void setViewCount(int viewCount) { this.viewCount = viewCount; }
}
