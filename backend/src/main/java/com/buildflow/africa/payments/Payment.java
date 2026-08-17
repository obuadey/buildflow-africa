package com.buildflow.africa.payments;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment extends TenantEntity {

  @Column(name = "invoice_id", nullable = false) private UUID invoiceId;
  @Column(nullable = false) private String reference;
  @Column(nullable = false) private String method = "BANK_TRANSFER";
  @Column(nullable = false) private BigDecimal amount = BigDecimal.ZERO;
  @Column(name = "paid_on", nullable = false) private LocalDate paidOn = LocalDate.now();
  @Column(name = "recorded_by") private String recordedBy;
  private String notes;
  @Column(name = "attachment_key") private String attachmentKey;

  public UUID getInvoiceId() { return invoiceId; }
  public void setInvoiceId(UUID invoiceId) { this.invoiceId = invoiceId; }
  public String getReference() { return reference; }
  public void setReference(String reference) { this.reference = reference; }
  public String getMethod() { return method; }
  public void setMethod(String method) { this.method = method; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public LocalDate getPaidOn() { return paidOn; }
  public void setPaidOn(LocalDate paidOn) { this.paidOn = paidOn; }
  public String getRecordedBy() { return recordedBy; }
  public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public String getAttachmentKey() { return attachmentKey; }
  public void setAttachmentKey(String attachmentKey) { this.attachmentKey = attachmentKey; }
}
