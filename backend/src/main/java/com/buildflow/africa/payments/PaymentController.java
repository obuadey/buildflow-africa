package com.buildflow.africa.payments;

import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.invoices.Invoice;
import com.buildflow.africa.invoices.InvoiceController.PaymentView;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.invoices.InvoiceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * The receipts ledger. A payment always belongs to an invoice, so posting one here goes through the
 * same path as posting it from the invoice itself and the two can never drift apart.
 */
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

  private static final List<String> SEARCHABLE = List.of("reference", "recordedBy", "notes");
  private static final Map<String, String> FILTERS = Map.of("method", "method", "invoice", "invoiceId");

  private final PaymentRepository repository;
  private final InvoiceRepository invoices;
  private final InvoiceService invoiceService;
  private final NameBook names;

  public PaymentController(PaymentRepository repository, InvoiceRepository invoices,
                           InvoiceService invoiceService, NameBook names) {
    this.repository = repository;
    this.invoices = invoices;
    this.invoiceService = invoiceService;
    this.names = names;
  }

  @GetMapping
  public PageResponse<PaymentView> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    Specification<Payment> spec = ListQuery.spec(tenantId, params, SEARCHABLE, FILTERS, "paidOn");
    UUID projectId = parseUuid(params.get("project"));
    if (projectId != null) {
      List<UUID> invoiceIds = invoices.findByTenantIdAndProjectId(tenantId, projectId)
          .stream().map(Invoice::getId).toList();
      spec = spec.and((root, query, cb) -> invoiceIds.isEmpty()
          ? cb.disjunction()
          : root.get("invoiceId").in(invoiceIds));
    }
    Page<Payment> page = repository.findAll(spec, ListQuery.pageable(params, "paidOn"));

    Map<UUID, Invoice> billed = invoices
        .findAllById(page.getContent().stream().map(Payment::getInvoiceId).distinct().toList())
        .stream()
        .filter(invoice -> tenantId.equals(invoice.getTenantId()))
        .collect(Collectors.toMap(Invoice::getId, Function.identity()));
    Map<UUID, String> clientNames =
        names.clientNames(billed.values().stream().map(Invoice::getClientId).toList());
    Map<UUID, String> projectNames =
        names.projectNames(billed.values().stream().map(Invoice::getProjectId).toList());

    return PageResponse.of(page, payment -> view(payment, billed.get(payment.getInvoiceId()),
        clientNames, projectNames));
  }

  @GetMapping("/{id}")
  public PaymentView get(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Payment payment = repository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new NotFoundException("PAYMENT_NOT_FOUND",
            "The requested payment could not be found."));
    Invoice invoice = invoices.findByIdAndTenantId(payment.getInvoiceId(), tenantId).orElse(null);
    return view(payment, invoice,
        names.clientNames(invoice == null ? List.of() : List.of(invoice.getClientId())),
        names.projectNames(invoice == null || invoice.getProjectId() == null
            ? List.of() : List.of(invoice.getProjectId())));
  }

  /** Records a receipt. The invoice balance and status move with it, inside one transaction. */
  @PostMapping
  public PaymentView create(@Valid @RequestBody PaymentRequest request,
                            @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Payment payment = invoiceService.recordPayment(request.invoiceId(), request.amount(),
        request.method(), request.date(), request.reference(),
        principal == null ? request.recordedBy() : principal.email(), request.notes());
    Invoice invoice = invoices.findByIdAndTenantId(request.invoiceId(), tenantId).orElse(null);
    return view(payment, invoice,
        names.clientNames(invoice == null ? List.of() : List.of(invoice.getClientId())),
        names.projectNames(invoice == null || invoice.getProjectId() == null
            ? List.of() : List.of(invoice.getProjectId())));
  }

  @PatchMapping("/{id}")
  public PaymentView update(@PathVariable("id") UUID id, @RequestBody PaymentRequest request,
                            @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Payment payment = invoiceService.revisePayment(id, request.invoiceId(), request.amount(),
        request.method(), request.date(), request.reference(),
        principal == null ? request.recordedBy() : principal.email(), request.notes());
    Invoice invoice = invoices.findByIdAndTenantId(payment.getInvoiceId(), tenantId).orElse(null);
    return view(payment, invoice,
        names.clientNames(invoice == null ? List.of() : List.of(invoice.getClientId())),
        names.projectNames(invoice == null || invoice.getProjectId() == null
            ? List.of() : List.of(invoice.getProjectId())));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id, @AuthenticationPrincipal AuthPrincipal principal) {
    invoiceService.deletePayment(id, principal == null ? null : principal.email());
  }

  private PaymentView view(Payment payment, Invoice invoice, Map<UUID, String> clientNames,
                           Map<UUID, String> projectNames) {
    if (invoice == null) {
      return PaymentView.of(payment, null, null, null);
    }
    return PaymentView.of(payment, invoice.getInvoiceNumber(),
        clientNames.get(invoice.getClientId()), projectNames.get(invoice.getProjectId()));
  }

  public record PaymentRequest(
      @NotNull UUID invoiceId, @NotNull BigDecimal amount, String method, LocalDate date,
      String reference, String recordedBy, String notes) {}

  private UUID parseUuid(String value) {
    try {
      return value == null || value.isBlank() ? null : UUID.fromString(value);
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }
}
