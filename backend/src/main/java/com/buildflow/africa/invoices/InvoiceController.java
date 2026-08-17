package com.buildflow.africa.invoices;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.Flat;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.payments.Payment;
import com.buildflow.africa.payments.PaymentRepository;
import com.buildflow.africa.projects.Project;
import com.buildflow.africa.projects.ProjectController.ProjectView;
import com.buildflow.africa.projects.ProjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

  private static final List<String> SEARCHABLE = List.of("invoiceNumber", "notes");
  private static final Map<String, String> FILTERS = Map.of(
      "status", "status", "type", "invoiceType", "client", "clientId", "project", "projectId");

  private final InvoiceRepository repository;
  private final InvoiceService service;
  private final PaymentRepository payments;
  private final ProjectRepository projects;
  private final ActivityRecorder activity;
  private final NameBook names;
  private final Flat flat;

  public InvoiceController(InvoiceRepository repository, InvoiceService service,
                           PaymentRepository payments, ProjectRepository projects,
                           ActivityRecorder activity, NameBook names, Flat flat) {
    this.repository = repository;
    this.service = service;
    this.payments = payments;
    this.projects = projects;
    this.activity = activity;
    this.names = names;
    this.flat = flat;
  }

  @GetMapping
  public PageResponse<InvoiceView> list(@RequestParam Map<String, String> params) {
    Page<Invoice> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "issueDate"),
        ListQuery.pageable(params, "dueDate"));
    Map<UUID, String> clientNames =
        names.clientNames(page.getContent().stream().map(Invoice::getClientId).toList());
    Map<UUID, String> projectNames =
        names.projectNames(page.getContent().stream().map(Invoice::getProjectId).toList());
    return PageResponse.of(page, invoice -> InvoiceView.of(invoice,
        clientNames.get(invoice.getClientId()), projectNames.get(invoice.getProjectId())));
  }

  /** The invoice with the receipts posted against it, as one flat record. */
  @GetMapping("/{id}")
  public Map<String, Object> get(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Invoice invoice = service.require(id);
    String clientName = name(names.clientNames(single(invoice.getClientId())), invoice.getClientId());
    Project project = invoice.getProjectId() == null ? null
        : projects.findByIdAndTenantId(invoice.getProjectId(), tenantId).orElse(null);
    String projectName = project == null ? null : project.getName();

    Map<String, Object> related = new HashMap<>();
    related.put("payments", payments.findByTenantIdAndInvoiceIdOrderByPaidOnDesc(tenantId, id).stream()
        .map(payment -> PaymentView.of(payment, invoice.getInvoiceNumber(), clientName, projectName))
        .toList());
    related.put("project", project == null ? null : ProjectView.of(project, clientName));
    return flat.of(InvoiceView.of(invoice, clientName, projectName), related);
  }

  @PostMapping
  public InvoiceView create(@Valid @RequestBody InvoiceRequest request,
                            @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Invoice invoice = new Invoice();
    invoice.setTenantId(tenantId);
    invoice.setInvoiceNumber("INV-" + LocalDate.now().getYear() + "-"
        + String.format("%04d", repository.countByTenantId(tenantId) + 1));
    apply(invoice, request);
    Invoice saved = repository.save(invoice);
    activity.record(principal == null ? null : principal.email(), "FINANCE",
        "Invoice " + saved.getInvoiceNumber() + " created", "invoice", saved.getId(),
        "/invoices/" + saved.getId());
    return withNames(saved);
  }

  @PatchMapping("/{id}")
  public InvoiceView update(@PathVariable("id") UUID id, @RequestBody InvoiceRequest request) {
    Invoice invoice = service.require(id);
    apply(invoice, request);
    return withNames(repository.save(invoice));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Invoice invoice = service.require(id);
    if (!"DRAFT".equals(invoice.getStatus()) || invoice.getPaidAmount().signum() > 0
        || !payments.findByTenantIdAndInvoiceIdOrderByPaidOnDesc(tenantId, id).isEmpty()) {
      throw new IllegalArgumentException(
          "Only draft invoices with no payments can be deleted. Cancel issued invoices instead.");
    }
    repository.delete(invoice);
  }

  /** Issues the invoice to the client. Amounts are frozen from this point except through payments. */
  @PostMapping("/{id}/send")
  public InvoiceView send(@PathVariable("id") UUID id, @AuthenticationPrincipal AuthPrincipal principal) {
    Invoice invoice = service.require(id);
    invoice.setStatus("SENT");
    service.applyStatus(invoice);
    Invoice saved = repository.save(invoice);
    activity.record(principal == null ? null : principal.email(), "FINANCE",
        "Invoice " + saved.getInvoiceNumber() + " sent to client", "invoice", saved.getId(),
        "/invoices/" + saved.getId());
    return withNames(saved);
  }

  @PostMapping("/{id}/payments")
  public PaymentView pay(@PathVariable("id") UUID id, @Valid @RequestBody PaymentRequest request,
                         @AuthenticationPrincipal AuthPrincipal principal) {
    Payment payment = service.recordPayment(id, request.amount(), request.method(),
        request.paidOn() == null ? request.date() : request.paidOn(), request.reference(),
        principal == null ? request.recordedBy() : principal.email(), request.notes());
    Invoice invoice = service.require(id);
    return PaymentView.of(payment, invoice.getInvoiceNumber(),
        name(names.clientNames(single(invoice.getClientId())), invoice.getClientId()),
        name(names.projectNames(single(invoice.getProjectId())), invoice.getProjectId()));
  }

  private InvoiceView withNames(Invoice invoice) {
    return InvoiceView.of(invoice,
        name(names.clientNames(single(invoice.getClientId())), invoice.getClientId()),
        name(names.projectNames(single(invoice.getProjectId())), invoice.getProjectId()));
  }

  private List<UUID> single(UUID id) {
    return id == null ? List.of() : List.of(id);
  }

  private String name(Map<UUID, String> book, UUID id) {
    return id == null ? null : book.get(id);
  }

  private void apply(Invoice invoice, InvoiceRequest request) {
    if (request.clientId() != null) invoice.setClientId(request.clientId());
    if (request.projectId() != null) invoice.setProjectId(request.projectId());
    if (request.contractId() != null) invoice.setContractId(request.contractId());
    if (request.milestoneId() != null) invoice.setMilestoneId(request.milestoneId());
    if (request.type() != null) invoice.setInvoiceType(request.type());
    if (request.issueDate() != null) invoice.setIssueDate(request.issueDate());
    if (request.dueDate() != null) invoice.setDueDate(request.dueDate());
    if (request.subtotal() != null) invoice.setSubtotal(request.subtotal());
    if (request.tax() != null) invoice.setTaxAmount(request.tax());
    if (request.discount() != null) invoice.setDiscountAmount(request.discount());
    if (request.notes() != null) invoice.setNotes(request.notes());
    if (request.status() != null && List.of("DRAFT", "CANCELLED").contains(request.status())) {
      invoice.setStatus(request.status());
    }
    // A caller may send either the breakdown or a single total; the breakdown wins when present.
    if (request.total() != null && invoice.getSubtotal().compareTo(BigDecimal.ZERO) == 0) {
      invoice.setSubtotal(request.total().subtract(invoice.getTaxAmount()).add(invoice.getDiscountAmount()));
    }
    invoice.setTotalAmount(invoice.getSubtotal().add(invoice.getTaxAmount()).subtract(invoice.getDiscountAmount()));
    service.applyStatus(invoice);
  }

  public record InvoiceRequest(
      UUID clientId, UUID projectId, UUID contractId, UUID milestoneId, String type,
      LocalDate issueDate, LocalDate dueDate, BigDecimal subtotal, BigDecimal tax,
      BigDecimal discount, BigDecimal total, String status, String notes) {}

  public record PaymentRequest(
      @NotNull BigDecimal amount, String method, LocalDate paidOn, LocalDate date, String reference,
      String recordedBy, String notes) {}

  public record InvoiceView(
      UUID id, String reference, String invoiceNumber, UUID clientId, String clientName, UUID projectId,
      String projectName, String type, LocalDate issueDate, LocalDate dueDate, BigDecimal subtotal,
      BigDecimal tax, BigDecimal discount, BigDecimal total, BigDecimal paid, BigDecimal outstanding,
      String status) {

    public static InvoiceView of(Invoice invoice, String clientName, String projectName) {
      return new InvoiceView(invoice.getId(), invoice.getInvoiceNumber(), invoice.getInvoiceNumber(),
          invoice.getClientId(),
          clientName, invoice.getProjectId(), projectName, invoice.getInvoiceType(),
          invoice.getIssueDate(), invoice.getDueDate(), invoice.getSubtotal(), invoice.getTaxAmount(),
          invoice.getDiscountAmount(), invoice.getTotalAmount(), invoice.getPaidAmount(),
          invoice.outstanding(), invoice.getStatus());
    }
  }

  public record PaymentView(
      UUID id, UUID invoiceId, String invoiceNumber, String clientName, String projectName,
      String reference, String method, BigDecimal amount, LocalDate date, String recordedBy) {

    public static PaymentView of(Payment payment, String invoiceNumber, String clientName,
                                 String projectName) {
      return new PaymentView(payment.getId(), payment.getInvoiceId(), invoiceNumber, clientName,
          projectName, payment.getReference(), payment.getMethod(), payment.getAmount(),
          payment.getPaidOn(), payment.getRecordedBy());
    }
  }
}
