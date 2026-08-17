package com.buildflow.africa.quotations;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "quotation_acceptances")
public class QuotationAcceptance extends TenantEntity {
  @Column(name = "quotation_id", nullable = false) private UUID quotationId;
  @Column(nullable = false) private String decision;
  private String comment;
  @Column(name = "ip_address") private String ipAddress;
  @Column(name = "user_agent") private String userAgent;

  public UUID getQuotationId() { return quotationId; }
  public void setQuotationId(UUID quotationId) { this.quotationId = quotationId; }
  public String getDecision() { return decision; }
  public void setDecision(String decision) { this.decision = decision; }
  public String getComment() { return comment; }
  public void setComment(String comment) { this.comment = comment; }
  public String getIpAddress() { return ipAddress; }
  public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
  public String getUserAgent() { return userAgent; }
  public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
}
