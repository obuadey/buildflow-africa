package com.buildflow.africa.variations;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.audit.AuditService;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.contracts.Contract;
import com.buildflow.africa.contracts.ContractRepository;
import com.buildflow.africa.contracts.ContractService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/variations")
public class VariationController {

  private static final List<String> SEARCHABLE = List.of("variationNumber", "title", "requestedBy");
  private static final Map<String, String> FILTERS =
      Map.of("status", "status", "project", "projectId", "contract", "contractId");

  private final VariationRepository repository;
  private final ContractRepository contracts;
  private final ContractService contractService;
  private final ActivityRecorder activity;
  private final AuditService audit;
  private final NameBook names;

  public VariationController(VariationRepository repository, ContractRepository contracts,
                             ContractService contractService, ActivityRecorder activity,
                             AuditService audit, NameBook names) {
    this.repository = repository;
    this.contracts = contracts;
    this.contractService = contractService;
    this.activity = activity;
    this.audit = audit;
    this.names = names;
  }

  @GetMapping
  public PageResponse<VariationView> list(@RequestParam Map<String, String> params) {
    Page<Variation> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    Map<UUID, String> projectNames =
        names.projectNames(page.getContent().stream().map(Variation::getProjectId).toList());
    return PageResponse.of(page, variation ->
        VariationView.of(variation, projectNames.get(variation.getProjectId())));
  }

  @GetMapping("/{id}")
  public VariationView get(@PathVariable("id") UUID id) {
    return withName(find(id));
  }

  @PostMapping
  public VariationView create(@Valid @RequestBody VariationRequest request,
                              @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Variation variation = new Variation();
    variation.setTenantId(tenantId);
    variation.setVariationNumber("VAR-" + LocalDate.now().getYear() + "-"
        + String.format("%04d", repository.countByTenantId(tenantId) + 1));
    variation.setProjectId(request.projectId());
    variation.setContractId(request.contractId() == null
        ? contractForProject(tenantId, request.projectId()) : request.contractId());
    variation.setTitle(request.title());
    variation.setDetail(request.detail());
    variation.setAmount(request.amount() == null ? BigDecimal.ZERO : request.amount());
    variation.setRequestedBy(request.requestedBy());
    if (request.status() != null) variation.setStatus(request.status());
    Variation saved = repository.save(variation);
    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        "Variation " + saved.getVariationNumber() + " raised — " + saved.getTitle(),
        "variation", saved.getId(), "/variations");
    return withName(saved);
  }

  @PatchMapping("/{id}")
  public VariationView update(@PathVariable("id") UUID id, @RequestBody VariationRequest request) {
    Variation variation = find(id);
    if ("APPROVED".equals(variation.getStatus())) {
      throw new IllegalArgumentException("An approved variation cannot be edited. Raise a new one instead.");
    }
    if (request.title() != null) variation.setTitle(request.title());
    if (request.detail() != null) variation.setDetail(request.detail());
    if (request.amount() != null) variation.setAmount(request.amount());
    if (request.requestedBy() != null) variation.setRequestedBy(request.requestedBy());
    if (request.status() != null && !"APPROVED".equals(request.status())) variation.setStatus(request.status());
    return withName(repository.save(variation));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    Variation variation = find(id);
    if ("APPROVED".equals(variation.getStatus())) {
      throw new IllegalArgumentException("An approved variation cannot be deleted. Raise a reversing variation instead.");
    }
    repository.delete(variation);
  }

  /**
   * Client approval. This is the only path that moves a contract's variation total, and it never
   * touches the quotation the contract came from.
   */
  @PostMapping("/{id}/approve")
  @Transactional
  public VariationView approve(@PathVariable("id") UUID id, @AuthenticationPrincipal AuthPrincipal principal) {
    Variation variation = find(id);
    if ("APPROVED".equals(variation.getStatus())) {
      return withName(variation);
    }
    variation.setStatus("APPROVED");
    variation.setApprovedAt(Instant.now());
    Variation saved = repository.save(variation);

    if (saved.getContractId() != null) {
      Contract contract = contractService.require(saved.getContractId());
      contract.setVariationAmount(contract.getVariationAmount().add(saved.getAmount()));
      contracts.save(contract);
      contractService.recalculate(contract);
    }

    audit.record("VARIATION_APPROVED", "variation", saved.getId(),
        Map.of("status", "PENDING"),
        Map.of("status", "APPROVED", "amount", saved.getAmount().toPlainString()),
        principal == null ? null : principal.email(), principal == null ? null : principal.userId());

    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        "Variation " + saved.getVariationNumber() + " approved", "variation", saved.getId(), "/variations");
    return withName(saved);
  }

  @PostMapping("/{id}/reject")
  public VariationView reject(@PathVariable("id") UUID id, @AuthenticationPrincipal AuthPrincipal principal) {
    Variation variation = find(id);
    if ("APPROVED".equals(variation.getStatus())) {
      throw new IllegalArgumentException(
          "This variation has already been approved and is part of the contract value.");
    }
    variation.setStatus("REJECTED");
    Variation saved = repository.save(variation);
    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        "Variation " + saved.getVariationNumber() + " rejected", "variation", saved.getId(), "/variations");
    return withName(saved);
  }

  private Variation find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("VARIATION_NOT_FOUND",
            "The requested variation could not be found."));
  }

  /** A variation raised from the project list attaches itself to that project's live contract. */
  private UUID contractForProject(UUID tenantId, UUID projectId) {
    return contracts.findAll((root, query, cb) -> cb.and(
            cb.equal(root.get("tenantId"), tenantId),
            cb.equal(root.get("projectId"), projectId),
            cb.equal(root.get("status"), "ACTIVE")))
        .stream().findFirst().map(Contract::getId).orElse(null);
  }

  private VariationView withName(Variation variation) {
    UUID projectId = variation.getProjectId();
    return VariationView.of(variation, projectId == null ? null
        : names.projectNames(List.of(projectId)).get(projectId));
  }

  public record VariationRequest(
      @NotNull UUID projectId, UUID contractId, @NotBlank String title, String detail,
      BigDecimal amount, String status, String requestedBy) {}

  public record VariationView(
      UUID id, String reference, String variationNumber, UUID projectId, String projectName, UUID contractId,
      String title, String detail, BigDecimal amount, String status, String requestedBy,
      Instant approvedAt, Instant createdAt) {

    public static VariationView of(Variation variation, String projectName) {
      return new VariationView(variation.getId(), variation.getVariationNumber(),
          variation.getVariationNumber(), variation.getProjectId(), projectName, variation.getContractId(), variation.getTitle(),
          variation.getDetail(), variation.getAmount(), variation.getStatus(),
          variation.getRequestedBy(), variation.getApprovedAt(), variation.getCreatedAt());
    }
  }
}
