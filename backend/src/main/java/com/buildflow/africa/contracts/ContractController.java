package com.buildflow.africa.contracts;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.variations.VariationRepository;
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
@RequestMapping("/api/v1/contracts")
public class ContractController {

  private static final List<String> SEARCHABLE = List.of("contractNumber", "notes");
  private static final Map<String, String> FILTERS =
      Map.of("status", "status", "project", "projectId", "quotation", "quotationId");
  private static final Map<String, String> SORTS = Map.ofEntries(
      Map.entry("id", "contractNumber"),
      Map.entry("reference", "contractNumber"),
      Map.entry("contractNumber", "contractNumber"),
      Map.entry("projectName", "projectId"),
      Map.entry("clientName", "projectId"),
      Map.entry("original", "originalAmount"),
      Map.entry("originalAmount", "originalAmount"),
      Map.entry("variations", "variationAmount"),
      Map.entry("variationAmount", "variationAmount"),
      Map.entry("value", "originalAmount"),
      Map.entry("retentionPct", "retentionPercent"),
      Map.entry("retentionPercent", "retentionPercent"),
      Map.entry("startDate", "startDate"),
      Map.entry("endDate", "endDate"),
      Map.entry("status", "status"),
      Map.entry("createdAt", "createdAt"));

  private final ContractRepository repository;
  private final ContractMilestoneRepository milestones;
  private final ContractService service;
  private final InvoiceRepository invoices;
  private final VariationRepository variations;
  private final ActivityRecorder activity;
  private final NameBook names;

  public ContractController(ContractRepository repository, ContractMilestoneRepository milestones,
                            ContractService service, InvoiceRepository invoices,
                            VariationRepository variations, ActivityRecorder activity, NameBook names) {
    this.repository = repository;
    this.milestones = milestones;
    this.service = service;
    this.invoices = invoices;
    this.variations = variations;
    this.activity = activity;
    this.names = names;
  }

  /** Milestones travel with the row: the contracts table draws the payment schedule inline. */
  @GetMapping
  public PageResponse<ContractView> list(@RequestParam Map<String, String> params) {
    Map<String, String> safeParams = safeSort(params);
    Page<Contract> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), safeParams, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(safeParams, "createdAt"));
    List<UUID> projectIds = page.getContent().stream().map(Contract::getProjectId).toList();
    Map<UUID, String> projectNames = names.projectNames(projectIds);
    Map<UUID, UUID> projectClients = names.projectClients(projectIds);
    Map<UUID, String> clientNames = names.clientNames(projectClients.values());
    return PageResponse.of(page, contract -> ContractView.of(contract,
        projectNames.get(contract.getProjectId()),
        clientNames.get(projectClients.get(contract.getProjectId())),
        service.milestonesFor(contract.getId())));
  }

  private Map<String, String> safeSort(Map<String, String> params) {
    Map<String, String> safe = new HashMap<>(params);
    String requested = safe.get("sort");
    if (requested == null || requested.isBlank()) {
      return safe;
    }
    safe.put("sort", SORTS.getOrDefault(requested, "createdAt"));
    return safe;
  }

  @GetMapping("/{id}")
  public ContractView get(@PathVariable("id") UUID id) {
    return withNames(service.require(id));
  }

  @PostMapping
  public ContractView create(@Valid @RequestBody ContractRequest request,
                             @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Contract contract = new Contract();
    contract.setTenantId(tenantId);
    contract.setProjectId(request.projectId());
    contract.setQuotationId(request.quotationId());
    contract.setContractNumber("CON-" + LocalDate.now().getYear() + "-"
        + String.format("%04d", repository.countByTenantId(tenantId) + 1));
    contract.setOriginalAmount(request.original() == null ? BigDecimal.ZERO : request.original());
    if (request.retentionPct() != null) contract.setRetentionPercent(request.retentionPct());
    contract.setStartDate(request.startDate());
    contract.setEndDate(request.endDate());
    contract.setNotes(request.notes());
    Contract saved = repository.save(contract);
    service.createDefaultSchedule(saved);

    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        "Contract " + saved.getContractNumber() + " created", "contract", saved.getId(), "/contracts");
    return withNames(saved);
  }

  @PatchMapping("/{id}")
  public ContractView update(@PathVariable("id") UUID id, @RequestBody ContractRequest request) {
    Contract contract = service.require(id);
    if (request.projectId() != null) contract.setProjectId(request.projectId());
    if (request.quotationId() != null) contract.setQuotationId(request.quotationId());
    if (request.original() != null) contract.setOriginalAmount(request.original());
    if (request.retentionPct() != null) contract.setRetentionPercent(request.retentionPct());
    if (request.startDate() != null) contract.setStartDate(request.startDate());
    if (request.endDate() != null) contract.setEndDate(request.endDate());
    if (request.status() != null) contract.setStatus(request.status());
    if (request.notes() != null) contract.setNotes(request.notes());
    Contract saved = repository.save(contract);
    service.recalculate(saved);
    return withNames(saved);
  }

  @PostMapping("/{id}/{action}")
  public ContractView action(@PathVariable("id") UUID id, @PathVariable("action") String action,
                             @AuthenticationPrincipal AuthPrincipal principal) {
    Contract contract = service.require(id);
    switch (action) {
      case "complete" -> contract.setStatus("COMPLETED");
      case "suspend" -> contract.setStatus("SUSPENDED");
      case "reactivate" -> contract.setStatus("ACTIVE");
      default -> throw new IllegalArgumentException("That contract action is not supported.");
    }
    Contract saved = repository.save(contract);
    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        "Contract " + saved.getContractNumber() + " marked "
            + saved.getStatus().toLowerCase().replace('_', ' '),
        "contract", saved.getId(), "/contracts");
    return withNames(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Contract contract = service.require(id);
    if (invoices.existsByTenantIdAndContractId(tenantId, id)) {
      throw new IllegalArgumentException(
          "This contract has invoices raised against it and cannot be removed.");
    }
    if (variations.existsByTenantIdAndContractIdAndStatus(tenantId, id, "APPROVED")) {
      throw new IllegalArgumentException(
          "This contract has approved variations and cannot be removed.");
    }
    milestones.deleteAll(milestones.findByTenantIdAndContractIdOrderBySortOrderAsc(tenantId, id));
    repository.delete(contract);
  }

  private ContractView withNames(Contract contract) {
    UUID projectId = contract.getProjectId();
    Map<UUID, UUID> projectClients = names.projectClients(List.of(projectId));
    return ContractView.of(contract,
        names.projectNames(List.of(projectId)).get(projectId),
        names.clientNames(projectClients.values()).get(projectClients.get(projectId)),
        service.milestonesFor(contract.getId()));
  }

  public record ContractRequest(
      @NotNull UUID projectId, UUID quotationId, BigDecimal original, BigDecimal retentionPct,
      LocalDate startDate, LocalDate endDate, String status, String notes) {}

  public record ContractView(
      UUID id, String reference, String contractNumber, UUID projectId, String projectName, String clientName,
      UUID quotationId, BigDecimal original, BigDecimal variations, BigDecimal value,
      BigDecimal retentionPct, LocalDate startDate, LocalDate endDate, String status,
      List<MilestoneView> milestones) {

    public static ContractView of(Contract contract, String projectName, String clientName,
                                  List<ContractMilestone> milestones) {
      return new ContractView(contract.getId(), contract.getContractNumber(), contract.getContractNumber(),
          contract.getProjectId(),
          projectName, clientName, contract.getQuotationId(), contract.getOriginalAmount(),
          contract.getVariationAmount(), contract.contractValue(), contract.getRetentionPercent(),
          contract.getStartDate(), contract.getEndDate(), contract.getStatus(),
          milestones.stream().map(MilestoneView::from).toList());
    }
  }

  public record MilestoneView(UUID id, String name, BigDecimal percent, BigDecimal amount, String status) {
    static MilestoneView from(ContractMilestone milestone) {
      return new MilestoneView(milestone.getId(), milestone.getName(), milestone.getPercent(),
          milestone.getAmount(), milestone.getStatus());
    }
  }
}
