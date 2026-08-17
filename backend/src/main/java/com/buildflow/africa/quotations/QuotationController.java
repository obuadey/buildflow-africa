package com.buildflow.africa.quotations;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.Flat;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.contracts.Contract;
import com.buildflow.africa.contracts.ContractController.ContractView;
import com.buildflow.africa.contracts.ContractRepository;
import com.buildflow.africa.contracts.ContractService;
import com.buildflow.africa.estimates.Estimate;
import com.buildflow.africa.estimates.EstimateCalculator;
import com.buildflow.africa.estimates.EstimateController.EstimateView;
import com.buildflow.africa.estimates.EstimateService;
import com.buildflow.africa.projects.Project;
import com.buildflow.africa.projects.ProjectController.ProjectView;
import com.buildflow.africa.projects.ProjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/quotations")
public class QuotationController {

  private static final List<String> SEARCHABLE = List.of("quoteNumber", "ownerName", "terms");
  private static final Map<String, String> FILTERS = Map.of(
      "status", "status", "owner", "ownerName", "client", "clientId", "project", "projectId");
  private static final List<String> STATUSES =
      List.of("DRAFT", "SENT", "VIEWED", "NEGOTIATING", "ACCEPTED", "REJECTED", "EXPIRED");
  private static final SecureRandom RANDOM = new SecureRandom();

  private final QuotationRepository repository;
  private final EstimateService estimateService;
  private final EstimateCalculator calculator;
  private final ProjectRepository projects;
  private final ContractRepository contracts;
  private final ContractService contractService;
  private final NameBook names;
  private final ActivityRecorder activity;
  private final Flat flat;

  public QuotationController(QuotationRepository repository, EstimateService estimateService,
                             EstimateCalculator calculator, ProjectRepository projects,
                             ContractRepository contracts, ContractService contractService,
                             NameBook names, ActivityRecorder activity, Flat flat) {
    this.repository = repository;
    this.estimateService = estimateService;
    this.calculator = calculator;
    this.projects = projects;
    this.contracts = contracts;
    this.contractService = contractService;
    this.names = names;
    this.activity = activity;
    this.flat = flat;
  }

  @GetMapping
  public PageResponse<QuotationView> list(@RequestParam Map<String, String> params) {
    Page<Quotation> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    Map<UUID, String> projectNames =
        names.projectNames(page.getContent().stream().map(Quotation::getProjectId).toList());
    Map<UUID, String> clientNames =
        names.clientNames(page.getContent().stream().map(Quotation::getClientId).toList());
    return PageResponse.of(page, quotation -> QuotationView.of(quotation,
        projectNames.get(quotation.getProjectId()), clientNames.get(quotation.getClientId())));
  }

  /** The quotation with the priced sheet behind it, its project and any contract it became. */
  @GetMapping("/{id}")
  @Transactional(readOnly = true)
  public Map<String, Object> get(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Quotation quotation = find(id);
    String projectName = name(names.projectNames(single(quotation.getProjectId())), quotation.getProjectId());
    String clientName = name(names.clientNames(single(quotation.getClientId())), quotation.getClientId());

    Estimate estimate = quotation.getEstimateId() == null ? null
        : estimateService.findTenantEstimate(quotation.getEstimateId());
    Project project = quotation.getProjectId() == null ? null
        : projects.findByIdAndTenantId(quotation.getProjectId(), tenantId).orElse(null);
    Contract contract = contracts.findAll((Specification<Contract>) (root, query, cb) -> cb.and(
            cb.equal(root.get("tenantId"), tenantId), cb.equal(root.get("quotationId"), id)))
        .stream().findFirst().orElse(null);

    Map<String, Object> related = new HashMap<>();
    related.put("estimate", estimate == null ? null : EstimateView.detail(estimate, projectName, clientName));
    related.put("totals", estimate == null ? null : calculator.calculate(estimate));
    related.put("project", project == null ? null : ProjectView.of(project, clientName));
    related.put("contract", contract == null ? null
        : ContractView.of(contract, projectName, clientName, contractService.milestonesFor(contract.getId())));
    return flat.of(QuotationView.of(quotation, projectName, clientName), related);
  }

  /**
   * Issued from an estimate. The amount and cost are taken from the estimate as recalculated here,
   * never from figures the browser sent, so a quotation can never disagree with its sheet.
   */
  @PostMapping
  @Transactional
  public QuotationView create(@Valid @RequestBody QuotationRequest request,
                              @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Estimate estimate = estimateService.findTenantEstimate(request.estimateId());
    EstimateCalculator.Totals totals = calculator.calculate(estimate);

    Quotation quotation = new Quotation();
    quotation.setTenantId(tenantId);
    quotation.setEstimateId(estimate.getId());
    quotation.setProjectId(request.projectId() == null ? estimate.getProjectId() : request.projectId());
    quotation.setClientId(request.clientId() == null ? estimate.getClientId() : request.clientId());
    quotation.setQuoteNumber("QUO-" + LocalDate.now().getYear() + "-"
        + String.format("%04d", repository.countByTenantId(tenantId) + 1));
    quotation.setClientTotal(totals.total());
    quotation.setCostTotal(totals.directCost());
    quotation.setValidUntil(request.expiry() == null ? LocalDate.now().plusDays(30) : request.expiry());
    quotation.setTerms(request.terms());
    quotation.setOwnerName(request.owner() == null
        ? (principal == null ? null : principal.email()) : request.owner());
    quotation.setPublicToken(newToken());
    Quotation saved = repository.save(quotation);

    activity.record(principal == null ? null : principal.email(), "SALES",
        "Quotation " + saved.getQuoteNumber() + " raised from " + estimate.getEstimateNumber(),
        "quotation", saved.getId(), "/quotations/" + saved.getId());
    return withNames(saved);
  }

  /**
   * Status moves and revisions. Sending stamps the issue date; reopening a decided quotation starts
   * a new version with its own share link rather than editing the one the client saw.
   */
  @PatchMapping("/{id}")
  public QuotationView update(@PathVariable("id") UUID id, @RequestBody QuotationRequest request,
                              @AuthenticationPrincipal AuthPrincipal principal) {
    Quotation quotation = find(id);
    String previous = quotation.getStatus();

    if (request.status() != null) {
      if (!STATUSES.contains(request.status())) {
        throw new IllegalArgumentException("That is not a valid quotation status.");
      }
      if ("SENT".equals(request.status()) && quotation.getSentAt() == null) {
        quotation.setSentAt(Instant.now());
        if (quotation.getPublicToken() == null) {
          quotation.setPublicToken(newToken());
        }
      }
      if ("DRAFT".equals(request.status()) && !"DRAFT".equals(previous)) {
        quotation.setVersion(quotation.getVersion() == null ? 2 : quotation.getVersion() + 1);
        quotation.setSentAt(null);
        quotation.setViewedAt(null);
        quotation.setViewCount(0);
        quotation.setPublicToken(newToken());
      }
      quotation.setStatus(request.status());
    }
    if (request.expiry() != null) quotation.setValidUntil(request.expiry());
    if (request.terms() != null) quotation.setTerms(request.terms());
    if (request.owner() != null) quotation.setOwnerName(request.owner());

    Quotation saved = repository.save(quotation);
    if (request.status() != null && !request.status().equals(previous)) {
      activity.record(principal == null ? null : principal.email(), "SALES",
          "Quotation " + saved.getQuoteNumber() + " marked "
              + saved.getStatus().toLowerCase().replace('_', ' '),
          "quotation", saved.getId(), "/quotations/" + saved.getId());
    }
    return withNames(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Quotation quotation = find(id);
    boolean hasContract = contracts.findAll((Specification<Contract>) (root, query, cb) -> cb.and(
        cb.equal(root.get("tenantId"), tenantId), cb.equal(root.get("quotationId"), id))).stream().findAny().isPresent();
    if (hasContract) {
      throw new IllegalArgumentException(
          "This quotation has already become a contract and cannot be removed.");
    }
    repository.delete(quotation);
  }

  private Quotation find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("QUOTATION_NOT_FOUND",
            "The requested quotation could not be found."));
  }

  private QuotationView withNames(Quotation quotation) {
    return QuotationView.of(quotation,
        name(names.projectNames(single(quotation.getProjectId())), quotation.getProjectId()),
        name(names.clientNames(single(quotation.getClientId())), quotation.getClientId()));
  }

  /** Unguessable and carrying no identifier, so a share link reveals nothing about the company. */
  static String newToken() {
    byte[] bytes = new byte[24];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private List<UUID> single(UUID id) {
    return id == null ? List.of() : List.of(id);
  }

  private String name(Map<UUID, String> book, UUID id) {
    return id == null ? null : book.get(id);
  }

  public record QuotationRequest(
      @NotNull UUID estimateId, UUID projectId, UUID clientId, String status, LocalDate expiry,
      String terms, String owner) {}

  public record QuotationView(
      UUID id, String reference, String quoteNumber, UUID estimateId, UUID projectId, String projectName, UUID clientId,
      String clientName, BigDecimal amount, BigDecimal cost, String status, Integer version,
      Instant sentAt, Instant viewedAt, int views, LocalDate expiry, String owner, String token,
      String terms, Instant createdAt) {

    public static QuotationView of(Quotation quotation, String projectName, String clientName) {
      return new QuotationView(quotation.getId(), quotation.getQuoteNumber(), quotation.getQuoteNumber(),
          quotation.getEstimateId(),
          quotation.getProjectId(), projectName, quotation.getClientId(), clientName,
          quotation.getClientTotal(), quotation.getCostTotal(), quotation.getStatus(),
          quotation.getVersion(), quotation.getSentAt(), quotation.getViewedAt(),
          quotation.getViewCount(), quotation.getValidUntil(), quotation.getOwnerName(),
          quotation.getPublicToken(), quotation.getTerms(), quotation.getCreatedAt());
    }
  }
}
