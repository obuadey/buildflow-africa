package com.buildflow.africa.estimates;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.quotations.QuotationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/estimates")
public class EstimateController {

  private static final List<String> SEARCHABLE = List.of("estimateNumber", "title", "estimatorName");
  private static final Map<String, String> FILTERS = Map.of(
      "status", "status", "estimator", "estimatorName", "project", "projectId", "client", "clientId");

  private final EstimateRepository repository;
  private final EstimateItemRepository items;
  private final EstimateService service;
  private final QuotationRepository quotations;
  private final NameBook names;
  private final ActivityRecorder activity;

  public EstimateController(EstimateRepository repository, EstimateItemRepository items,
                            EstimateService service, QuotationRepository quotations,
                            NameBook names, ActivityRecorder activity) {
    this.repository = repository;
    this.items = items;
    this.service = service;
    this.quotations = quotations;
    this.names = names;
    this.activity = activity;
  }

  @GetMapping
  public PageResponse<EstimateView> list(@RequestParam Map<String, String> params) {
    Page<Estimate> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "updatedAt"),
        ListQuery.pageable(params, "updatedAt"));
    Map<UUID, String> projectNames =
        names.projectNames(page.getContent().stream().map(Estimate::getProjectId).toList());
    Map<UUID, String> clientNames =
        names.clientNames(page.getContent().stream().map(Estimate::getClientId).toList());
    Map<UUID, Counts> counts = counts(page.getContent().stream().map(Estimate::getId).toList());
    return PageResponse.of(page, estimate -> EstimateView.of(estimate,
        projectNames.get(estimate.getProjectId()), clientNames.get(estimate.getClientId()),
        counts.getOrDefault(estimate.getId(), Counts.NONE)));
  }

  @GetMapping("/{id}")
  @Transactional(readOnly = true)
  public EstimateView get(@PathVariable("id") UUID id) {
    return withNames(service.findTenantEstimate(id));
  }

  @PostMapping
  @Transactional
  public EstimateView create(@Valid @RequestBody EstimateRequest request,
                             @AuthenticationPrincipal AuthPrincipal principal) {
    Estimate estimate = service.create(request, principal == null ? null : principal.email());
    activity.record(principal == null ? null : principal.email(), "SALES",
        "Estimate " + estimate.getEstimateNumber() + " started — " + estimate.getTitle(),
        "estimate", estimate.getId(), "/estimates/" + estimate.getId());
    return withNames(estimate);
  }

  /** The builder's save. Sections sent here replace the sheet; totals are recomputed server-side. */
  @PatchMapping("/{id}")
  @Transactional
  public EstimateView update(@PathVariable("id") UUID id, @RequestBody EstimateRequest request) {
    return withNames(service.update(id, request));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Estimate estimate = service.findTenantEstimate(id);
    if (quotations.existsByTenantIdAndEstimateId(tenantId, id)) {
      throw new IllegalArgumentException(
          "This estimate has already been quoted. Archive it instead so the quotation remains traceable.");
    }
    repository.delete(estimate);
  }

  private List<UUID> single(UUID id) {
    return id == null ? List.of() : List.of(id);
  }

  private String name(Map<UUID, String> book, UUID id) {
    return id == null ? null : book.get(id);
  }

  /** Line counts per estimate, so a list never has to load the sheets themselves. */
  private Map<UUID, Counts> counts(List<UUID> estimateIds) {
    Map<UUID, Counts> counts = new java.util.HashMap<>();
    if (estimateIds.isEmpty()) {
      return counts;
    }
    for (Object[] row : items.countsFor(TenantContext.getRequired(), estimateIds)) {
      counts.put((UUID) row[0],
          new Counts(((Number) row[1]).intValue(),
              row[2] == null ? 0 : ((Number) row[2]).intValue()));
    }
    return counts;
  }

  private EstimateView withNames(Estimate estimate) {
    return EstimateView.detail(estimate,
        name(names.projectNames(single(estimate.getProjectId())), estimate.getProjectId()),
        name(names.clientNames(single(estimate.getClientId())), estimate.getClientId()));
  }

  public record EstimateRequest(
      @NotBlank String title, UUID projectId, UUID clientId, String estimator, String status,
      String currency, BigDecimal overheadPct, BigDecimal contingencyPct, BigDecimal profitPct,
      BigDecimal taxPct, BigDecimal discount, List<SectionRequest> sections) {}

  public record SectionRequest(String name, List<ItemRequest> items) {}

  public record ItemRequest(
      String description, String category, String kind, UUID materialId, BigDecimal quantity,
      String unit, BigDecimal rate, BigDecimal waste, BigDecimal markup) {}

  /**
   * The header figures a list shows. `sections` is empty here on purpose: a table of estimates
   * never draws the lines, and loading every sheet to render one page would be a great deal of
   * work for nothing. {@link #detail} carries them for the builder.
   */
  public record EstimateView(
      UUID id, String reference, String estimateNumber, String title, UUID projectId, String projectName, UUID clientId,
      String clientName, String status, String estimator, String currency, BigDecimal overheadPct,
      BigDecimal contingencyPct, BigDecimal profitPct, BigDecimal taxPct, BigDecimal discount,
      BigDecimal directCost, BigDecimal overhead, BigDecimal contingency, BigDecimal profit,
      BigDecimal tax, BigDecimal total, int positions, int pricedPositions,
      List<SectionView> sections, Instant createdAt, Instant updatedAt) {

    public static EstimateView of(Estimate estimate, String projectName, String clientName) {
      return of(estimate, projectName, clientName, Counts.NONE);
    }

    public static EstimateView of(Estimate estimate, String projectName, String clientName,
                                  Counts counts) {
      return build(estimate, projectName, clientName, List.of(), counts);
    }

    /** Must be called inside a transaction: it reads the estimate's sections and lines. */
    public static EstimateView detail(Estimate estimate, String projectName, String clientName) {
      List<SectionView> sections = estimate.getSections().stream().map(SectionView::from).toList();
      List<ItemView> lines = sections.stream().flatMap(section -> section.items().stream()).toList();
      return build(estimate, projectName, clientName, sections,
          new Counts(lines.size(),
              (int) lines.stream().filter(line -> line.rate() != null
                  && line.rate().signum() > 0).count()));
    }

    private static EstimateView build(Estimate estimate, String projectName, String clientName,
                                      List<SectionView> sections, Counts counts) {
      return new EstimateView(estimate.getId(), estimate.getEstimateNumber(), estimate.getEstimateNumber(),
          estimate.getTitle(),
          estimate.getProjectId(), projectName, estimate.getClientId(), clientName,
          estimate.getStatus(), estimate.getEstimatorName(), estimate.getCurrency(),
          estimate.getOverheadPercent(), estimate.getContingencyPercent(), estimate.getProfitPercent(),
          estimate.getTaxPercent(), estimate.getDiscountAmount(), estimate.getDirectCost(),
          estimate.getOverheadAmount(), estimate.getContingencyAmount(), estimate.getProfitAmount(),
          estimate.getTaxAmount(), estimate.getTotalAmount(), counts.positions(),
          counts.priced(), sections, estimate.getCreatedAt(), estimate.getUpdatedAt());
    }
  }

  /** Line counts for an estimate: how many positions it has, and how many are priced. */
  public record Counts(int positions, int priced) {
    public static final Counts NONE = new Counts(0, 0);
  }

  public record SectionView(UUID id, String name, BigDecimal subtotal, List<ItemView> items) {
    static SectionView from(EstimateSection section) {
      return new SectionView(section.getId(), section.getName(), section.getSubtotal(),
          section.getItems().stream().map(ItemView::from).toList());
    }
  }

  public record ItemView(
      UUID id, String description, String category, String kind, UUID materialId, BigDecimal quantity,
      String unit, BigDecimal rate, BigDecimal waste, BigDecimal markup, BigDecimal total) {

    static ItemView from(EstimateItem item) {
      return new ItemView(item.getId(), item.getDescription(), item.getCategory(), item.getCostType(),
          item.getMaterialId(), item.getQuantity(), item.getUnit(), item.getUnitCost(),
          item.getWastePercent(), item.getMarkupPercent(), item.getTotal());
    }
  }
}
