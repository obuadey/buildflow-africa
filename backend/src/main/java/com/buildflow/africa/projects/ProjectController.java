package com.buildflow.africa.projects;

import com.buildflow.africa.activity.ActivityController.ActivityView;
import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.activity.ActivityRepository;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.clients.Client;
import com.buildflow.africa.clients.ClientController.ClientView;
import com.buildflow.africa.clients.ClientRepository;
import com.buildflow.africa.common.Flat;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.contracts.ContractController.ContractView;
import com.buildflow.africa.contracts.ContractRepository;
import com.buildflow.africa.contracts.ContractService;
import com.buildflow.africa.estimates.EstimateController.EstimateView;
import com.buildflow.africa.estimates.EstimateRepository;
import com.buildflow.africa.expenses.ExpenseController.ExpenseView;
import com.buildflow.africa.expenses.ExpenseRepository;
import com.buildflow.africa.invoices.Invoice;
import com.buildflow.africa.invoices.InvoiceController.InvoiceView;
import com.buildflow.africa.invoices.InvoiceController.PaymentView;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.payments.PaymentRepository;
import com.buildflow.africa.quotations.QuotationController.QuotationView;
import com.buildflow.africa.quotations.QuotationRepository;
import com.buildflow.africa.variations.VariationController.VariationView;
import com.buildflow.africa.variations.VariationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

  private static final List<String> SEARCHABLE =
      List.of("name", "projectNumber", "managerName", "city", "region", "projectType");
  private static final Map<String, String> FILTERS = Map.of(
      "status", "status", "health", "health", "client", "clientId",
      "manager", "managerName", "region", "region", "type", "projectType");

  private final ProjectRepository repository;
  private final ClientRepository clients;
  private final EstimateRepository estimates;
  private final QuotationRepository quotations;
  private final ContractRepository contracts;
  private final ContractService contractService;
  private final VariationRepository variations;
  private final InvoiceRepository invoices;
  private final PaymentRepository payments;
  private final ExpenseRepository expenses;
  private final ActivityRepository activities;
  private final ActivityRecorder activity;
  private final NameBook names;
  private final Flat flat;

  public ProjectController(ProjectRepository repository, ClientRepository clients,
                           EstimateRepository estimates, QuotationRepository quotations,
                           ContractRepository contracts, ContractService contractService,
                           VariationRepository variations, InvoiceRepository invoices,
                           PaymentRepository payments,
                           ExpenseRepository expenses, ActivityRepository activities,
                           ActivityRecorder activity, NameBook names, Flat flat) {
    this.repository = repository;
    this.clients = clients;
    this.estimates = estimates;
    this.quotations = quotations;
    this.contracts = contracts;
    this.contractService = contractService;
    this.variations = variations;
    this.invoices = invoices;
    this.payments = payments;
    this.expenses = expenses;
    this.activities = activities;
    this.activity = activity;
    this.names = names;
    this.flat = flat;
  }

  @GetMapping
  public PageResponse<ProjectView> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    Page<Project> page = repository.findAll(
        ListQuery.spec(tenantId, params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    Map<UUID, String> clientNames =
        names.clientNames(page.getContent().stream().map(Project::getClientId).toList());
    return PageResponse.of(page, project ->
        money(tenantId, project, clientNames.get(project.getClientId())));
  }

  /** Everything the project page shows, in one round trip. */
  @GetMapping("/{id}")
  public Map<String, Object> get(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Project project = find(id);
    Client client = project.getClientId() == null ? null
        : clients.findByIdAndTenantId(project.getClientId(), tenantId).orElse(null);
    String clientName = client == null ? null : client.getName();
    String projectName = project.getName();

    Map<String, Object> related = new HashMap<>();
    related.put("client", client == null ? null : ClientView.of(client, BigDecimal.ZERO, BigDecimal.ZERO, 0));
    related.put("estimates", byProject(estimates, tenantId, id).stream()
        .map(estimate -> EstimateView.of(estimate, projectName, clientName)).toList());
    related.put("quotations", byProject(quotations, tenantId, id).stream()
        .map(quotation -> QuotationView.of(quotation, projectName, clientName)).toList());
    related.put("contracts", byProject(contracts, tenantId, id).stream()
        .map(contract -> ContractView.of(contract, projectName, clientName,
            contractService.milestonesFor(contract.getId()))).toList());
    related.put("variations", byProject(variations, tenantId, id).stream()
        .map(variation -> VariationView.of(variation, projectName)).toList());
    related.put("invoices", byProject(invoices, tenantId, id).stream()
        .map(invoice -> InvoiceView.of(invoice, clientName, projectName)).toList());
    related.put("payments", byProject(invoices, tenantId, id).stream()
        .flatMap(invoice -> payments.findByTenantIdAndInvoiceIdOrderByPaidOnDesc(tenantId, invoice.getId())
            .stream()
            .map(payment -> PaymentView.of(payment, invoice.getInvoiceNumber(), clientName, projectName)))
        .toList());
    related.put("expenses", byProject(expenses, tenantId, id).stream()
        .map(expense -> ExpenseView.of(expense, projectName)).toList());
    related.put("activity", activities.findByTenantIdAndEntityIdOrderByCreatedAtDesc(tenantId, id)
        .stream().map(ActivityView::from).toList());

    return flat.of(money(tenantId, project, clientName), related);
  }

  @PostMapping
  public ProjectView create(@Valid @RequestBody ProjectRequest request,
                            @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Project project = new Project();
    project.setTenantId(tenantId);
    project.setProjectNumber(request.projectNumber() == null || request.projectNumber().isBlank()
        ? "PRJ-" + LocalDate.now().getYear() + "-"
            + String.format("%04d", repository.countByTenantId(tenantId) + 1)
        : request.projectNumber());
    apply(project, request);
    if (project.getManagerName() == null && principal != null) {
      project.setManagerName(principal.email());
    }
    Project saved = repository.save(project);
    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        "Project " + saved.getProjectNumber() + " created — " + saved.getName(),
        "project", saved.getId(), "/projects/" + saved.getId());
    return money(tenantId, saved, clientName(tenantId, saved));
  }

  @PatchMapping("/{id}")
  public ProjectView update(@PathVariable("id") UUID id, @RequestBody ProjectRequest request,
                            @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Project project = find(id);
    String previousStatus = project.getStatus();
    apply(project, request);
    Project saved = repository.save(project);
    if (request.status() != null && !request.status().equals(previousStatus)) {
      activity.record(principal == null ? null : principal.email(), "PROJECTS",
          "Project " + saved.getProjectNumber() + " moved to "
              + saved.getStatus().toLowerCase().replace('_', ' '),
          "project", saved.getId(), "/projects/" + saved.getId());
    }
    return money(tenantId, saved, clientName(tenantId, saved));
  }

  /** Only a project with nothing billed against it can be removed. */
  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Project project = find(id);
    if (!byProject(invoices, tenantId, id).isEmpty()) {
      throw new IllegalArgumentException(
          "This project has invoices raised against it and cannot be removed.");
    }
    repository.delete(project);
  }

  private Project find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("PROJECT_NOT_FOUND", "The requested project could not be found."));
  }

  private String clientName(UUID tenantId, Project project) {
    return project.getClientId() == null ? null
        : clients.findByIdAndTenantId(project.getClientId(), tenantId).map(Client::getName).orElse(null);
  }

  private static <T> List<T> byProject(JpaSpecificationExecutor<T> repository, UUID tenantId, UUID projectId) {
    return repository.findAll((Specification<T>) (root, query, cb) ->
        cb.and(cb.equal(root.get("tenantId"), tenantId), cb.equal(root.get("projectId"), projectId)));
  }

  /** Cost, invoiced and paid are summed from the ledgers rather than stored on the project. */
  private ProjectView money(UUID tenantId, Project project, String clientName) {
    List<Invoice> billed = byProject(invoices, tenantId, project.getId());
    BigDecimal invoiced = billed.stream()
        .filter(invoice -> !"DRAFT".equals(invoice.getStatus()) && !"CANCELLED".equals(invoice.getStatus()))
        .map(Invoice::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal paid = billed.stream().map(Invoice::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal cost = expenses.totalForProject(tenantId, project.getId());
    return ProjectView.of(project, clientName, cost, invoiced, paid);
  }

  private void apply(Project project, ProjectRequest request) {
    if (request.clientId() != null) project.setClientId(request.clientId());
    if (request.name() != null) project.setName(request.name());
    if (request.type() != null) project.setProjectType(request.type());
    if (request.location() != null) project.setLocation(request.location());
    if (request.region() != null) project.setRegion(request.region());
    if (request.city() != null) project.setCity(request.city());
    if (request.description() != null) project.setDescription(request.description());
    if (request.startDate() != null) project.setStartDate(request.startDate());
    if (request.endDate() != null) project.setExpectedCompletionDate(request.endDate());
    if (request.status() != null) project.setStatus(request.status());
    if (request.health() != null) project.setHealth(request.health());
    if (request.risk() != null) project.setRiskNote(request.risk());
    if (request.budget() != null) project.setBudget(request.budget());
    if (request.contractValue() != null) project.setContractValue(request.contractValue());
    if (request.completion() != null) {
      project.setCompletionPercent(Math.max(0, Math.min(100, request.completion())));
    }
    if (request.manager() != null) project.setManagerName(request.manager());
    if (request.notes() != null) project.setNotes(request.notes());
  }

  public record ProjectRequest(
      UUID clientId, String projectNumber, @NotBlank String name, String type, String location,
      String region, String city, String description, LocalDate startDate, LocalDate endDate,
      String status, String health, String risk, BigDecimal budget, BigDecimal contractValue,
      Integer completion, String manager, String notes) {}

  public record ProjectView(
      UUID id, String reference, String projectNumber, String name, UUID clientId, String clientName, String type,
      String location, String region, String city, String description, String status, String health,
      String risk, BigDecimal budget, BigDecimal contractValue, BigDecimal cost, BigDecimal invoiced,
      BigDecimal paid, int completion, String manager, LocalDate startDate, LocalDate endDate) {

    public static ProjectView of(Project project, String clientName) {
      return of(project, clientName, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    public static ProjectView of(Project project, String clientName, BigDecimal cost,
                                 BigDecimal invoiced, BigDecimal paid) {
      return new ProjectView(project.getId(), project.getProjectNumber(), project.getProjectNumber(),
          project.getName(),
          project.getClientId(), clientName, project.getProjectType(), project.getLocation(),
          project.getRegion(), project.getCity(), project.getDescription(), project.getStatus(),
          project.getHealth(), project.getRiskNote(), project.getBudget(), project.getContractValue(),
          cost, invoiced, paid, project.getCompletionPercent(), project.getManagerName(),
          project.getStartDate(), project.getExpectedCompletionDate());
    }
  }
}
