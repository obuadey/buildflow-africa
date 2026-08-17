package com.buildflow.africa.expenses;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "project_expenses")
public class Expense extends TenantEntity {

  @Column(name = "project_id", nullable = false) private UUID projectId;
  @Column(name = "supplier_id") private UUID supplierId;
  @Column(nullable = false) private String reference;
  @Column(nullable = false) private String category = "MATERIALS";
  private String vendor;
  @Column(nullable = false) private BigDecimal amount = BigDecimal.ZERO;
  @Column(name = "spent_on", nullable = false) private LocalDate spentOn = LocalDate.now();
  @Column(name = "has_receipt", nullable = false) private boolean hasReceipt;
  @Column(name = "receipt_key") private String receiptKey;
  @Column(name = "recorded_by") private String recordedBy;
  private String notes;

  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public UUID getSupplierId() { return supplierId; }
  public void setSupplierId(UUID supplierId) { this.supplierId = supplierId; }
  public String getReference() { return reference; }
  public void setReference(String reference) { this.reference = reference; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public String getVendor() { return vendor; }
  public void setVendor(String vendor) { this.vendor = vendor; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public LocalDate getSpentOn() { return spentOn; }
  public void setSpentOn(LocalDate spentOn) { this.spentOn = spentOn; }
  public boolean isHasReceipt() { return hasReceipt; }
  public void setHasReceipt(boolean hasReceipt) { this.hasReceipt = hasReceipt; }
  public String getReceiptKey() { return receiptKey; }
  public void setReceiptKey(String receiptKey) { this.receiptKey = receiptKey; }
  public String getRecordedBy() { return recordedBy; }
  public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
}
