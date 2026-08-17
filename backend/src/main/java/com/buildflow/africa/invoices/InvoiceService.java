package com.buildflow.africa.invoices;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.audit.AuditService;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.payments.Payment;
import com.buildflow.africa.payments.PaymentRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Invoice money movement. Payment posting is the only path that changes `paid_amount`, so the
 * ledger and the invoice can never disagree.
 */
@Service
public class InvoiceService {

  private final InvoiceRepository invoices;
  private final PaymentRepository payments;
  private final ActivityRecorder activity;
  private final AuditService audit;

  public InvoiceService(InvoiceRepository invoices, PaymentRepository payments,
                        ActivityRecorder activity, AuditService audit) {
    this.invoices = invoices;
    this.payments = payments;
    this.activity = activity;
    this.audit = audit;
  }

  public Invoice require(UUID id) {
    return invoices.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("INVOICE_NOT_FOUND", "The requested invoice could not be found."));
  }

  /** Recomputes status from amounts and the due date. Never trusts a status sent by a client. */
  public Invoice applyStatus(Invoice invoice) {
    BigDecimal outstanding = invoice.outstanding();
    if ("CANCELLED".equals(invoice.getStatus()) || "DRAFT".equals(invoice.getStatus())) {
      return invoice;
    }
    if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
      invoice.setStatus("PAID");
    } else if (invoice.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
      invoice.setStatus(invoice.getDueDate().isBefore(LocalDate.now()) ? "OVERDUE" : "PARTIALLY_PAID");
    } else {
      invoice.setStatus(invoice.getDueDate().isBefore(LocalDate.now()) ? "OVERDUE" : "SENT");
    }
    return invoice;
  }

  @Transactional
  public Payment recordPayment(UUID invoiceId, BigDecimal amount, String method, LocalDate paidOn,
                               String reference, String recordedBy, String notes) {
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new IllegalArgumentException("A payment amount must be greater than zero.");
    }
    Invoice invoice = require(invoiceId);
    if (amount.compareTo(invoice.outstanding()) > 0) {
      throw new IllegalArgumentException("The payment is larger than the outstanding balance on this invoice.");
    }

    UUID tenantId = TenantContext.getRequired();
    Payment payment = new Payment();
    payment.setTenantId(tenantId);
    payment.setInvoiceId(invoiceId);
    payment.setAmount(amount);
    payment.setMethod(method == null ? "BANK_TRANSFER" : method);
    payment.setPaidOn(paidOn == null ? LocalDate.now() : paidOn);
    payment.setReference(reference == null || reference.isBlank()
        ? "PAY-" + String.format("%04d", payments.countByTenantId(tenantId) + 1)
        : reference);
    payment.setRecordedBy(recordedBy);
    payment.setNotes(notes);
    Payment saved = payments.save(payment);

    invoice.setPaidAmount(invoice.getPaidAmount().add(amount));
    applyStatus(invoice);
    invoices.save(invoice);

    audit.record("PAYMENT_RECORDED", "invoice", invoice.getId(),
        java.util.Map.of("paidAmount", invoice.getPaidAmount().subtract(amount).toPlainString(),
            "status", invoice.getStatus()),
        java.util.Map.of("paidAmount", invoice.getPaidAmount().toPlainString(),
            "status", invoice.getStatus(), "reference", saved.getReference()),
        recordedBy, null);

    activity.record(recordedBy, "FINANCE",
        "Payment " + saved.getReference() + " of " + amount.toPlainString()
            + " recorded against " + invoice.getInvoiceNumber(),
        "invoice", invoice.getId(), "/invoices/" + invoice.getId());
    return saved;
  }

  @Transactional
  public Payment revisePayment(UUID paymentId, UUID invoiceId, BigDecimal amount, String method,
                               LocalDate paidOn, String reference, String recordedBy, String notes) {
    UUID tenantId = TenantContext.getRequired();
    Payment payment = payments.findByIdAndTenantId(paymentId, tenantId)
        .orElseThrow(() -> new NotFoundException("PAYMENT_NOT_FOUND", "The requested payment could not be found."));
    Invoice oldInvoice = invoices.findByIdAndTenantId(payment.getInvoiceId(), tenantId)
        .orElseThrow(() -> new NotFoundException("INVOICE_NOT_FOUND", "The payment's invoice could not be found."));
    UUID targetInvoiceId = invoiceId == null ? payment.getInvoiceId() : invoiceId;
    Invoice targetInvoice = targetInvoiceId.equals(oldInvoice.getId())
        ? oldInvoice
        : invoices.findByIdAndTenantId(targetInvoiceId, tenantId)
            .orElseThrow(() -> new NotFoundException("INVOICE_NOT_FOUND", "The target invoice could not be found."));
    BigDecimal nextAmount = amount == null ? payment.getAmount() : amount;
    if (nextAmount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new IllegalArgumentException("A payment amount must be greater than zero.");
    }

    oldInvoice.setPaidAmount(oldInvoice.getPaidAmount().subtract(payment.getAmount()));
    applyStatus(oldInvoice);

    if (nextAmount.compareTo(targetInvoice.outstanding()) > 0) {
      oldInvoice.setPaidAmount(oldInvoice.getPaidAmount().add(payment.getAmount()));
      applyStatus(oldInvoice);
      throw new IllegalArgumentException("The payment is larger than the outstanding balance on the target invoice.");
    }

    targetInvoice.setPaidAmount(targetInvoice.getPaidAmount().add(nextAmount));
    applyStatus(targetInvoice);
    invoices.save(oldInvoice);
    if (!targetInvoice.getId().equals(oldInvoice.getId())) {
      invoices.save(targetInvoice);
    }

    payment.setInvoiceId(targetInvoiceId);
    payment.setAmount(nextAmount);
    if (method != null) payment.setMethod(method);
    if (paidOn != null) payment.setPaidOn(paidOn);
    if (reference != null) payment.setReference(reference);
    if (recordedBy != null) payment.setRecordedBy(recordedBy);
    if (notes != null) payment.setNotes(notes);
    Payment saved = payments.save(payment);

    audit.record("PAYMENT_REVISED", "invoice", targetInvoice.getId(),
        java.util.Map.of("paymentId", saved.getId().toString()),
        java.util.Map.of("amount", saved.getAmount().toPlainString(), "reference", saved.getReference()),
        saved.getRecordedBy(), null);
    return saved;
  }

  @Transactional
  public void deletePayment(UUID paymentId, String actor) {
    UUID tenantId = TenantContext.getRequired();
    Payment payment = payments.findByIdAndTenantId(paymentId, tenantId)
        .orElseThrow(() -> new NotFoundException("PAYMENT_NOT_FOUND", "The requested payment could not be found."));
    Invoice invoice = invoices.findByIdAndTenantId(payment.getInvoiceId(), tenantId)
        .orElseThrow(() -> new NotFoundException("INVOICE_NOT_FOUND", "The payment's invoice could not be found."));
    invoice.setPaidAmount(invoice.getPaidAmount().subtract(payment.getAmount()));
    applyStatus(invoice);
    invoices.save(invoice);
    payments.delete(payment);
    audit.record("PAYMENT_DELETED", "invoice", invoice.getId(),
        java.util.Map.of("reference", payment.getReference(), "amount", payment.getAmount().toPlainString()),
        java.util.Map.of("paidAmount", invoice.getPaidAmount().toPlainString(), "status", invoice.getStatus()),
        actor, null);
  }
}
