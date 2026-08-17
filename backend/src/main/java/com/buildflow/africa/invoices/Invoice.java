package com.buildflow.africa.invoices;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "invoices")
public class Invoice extends TenantEntity {

  @Column(name = "client_id") private UUID clientId;
  @Column(name = "project_id") private UUID projectId;
  @Column(name = "contract_id") private UUID contractId;
  @Column(name = "milestone_id") private UUID milestoneId;
  @Column(name = "invoice_number", nullable = false) private String invoiceNumber;
  @Column(name = "invoice_type", nullable = false) private String invoiceType = "PROGRESS";
  @Column(name = "issue_date", nullable = false) private LocalDate issueDate = LocalDate.now();
  @Column(name = "due_date", nullable = false) private LocalDate dueDate = LocalDate.now().plusDays(14);
  @Column(nullable = false) private BigDecimal subtotal = BigDecimal.ZERO;
  @Column(name = "tax_amount", nullable = false) private BigDecimal taxAmount = BigDecimal.ZERO;
  @Column(name = "discount_amount", nullable = false) private BigDecimal discountAmount = BigDecimal.ZERO;
  @Column(name = "total_amount", nullable = false) private BigDecimal totalAmount = BigDecimal.ZERO;
  @Column(name = "paid_amount", nullable = false) private BigDecimal paidAmount = BigDecimal.ZERO;
  @Column(nullable = false) private String status = "DRAFT";
  private String notes;

  public UUID getClientId() { return clientId; }
  public void setClientId(UUID clientId) { this.clientId = clientId; }
  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public UUID getContractId() { return contractId; }
  public void setContractId(UUID contractId) { this.contractId = contractId; }
  public UUID getMilestoneId() { return milestoneId; }
  public void setMilestoneId(UUID milestoneId) { this.milestoneId = milestoneId; }
  public String getInvoiceNumber() { return invoiceNumber; }
  public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
  public String getInvoiceType() { return invoiceType; }
  public void setInvoiceType(String invoiceType) { this.invoiceType = invoiceType; }
  public LocalDate getIssueDate() { return issueDate; }
  public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }
  public LocalDate getDueDate() { return dueDate; }
  public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
  public BigDecimal getSubtotal() { return subtotal; }
  public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
  public BigDecimal getTaxAmount() { return taxAmount; }
  public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
  public BigDecimal getDiscountAmount() { return discountAmount; }
  public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
  public BigDecimal getTotalAmount() { return totalAmount; }
  public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
  public BigDecimal getPaidAmount() { return paidAmount; }
  public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }

  public BigDecimal outstanding() {
    return totalAmount.subtract(paidAmount);
  }
}
