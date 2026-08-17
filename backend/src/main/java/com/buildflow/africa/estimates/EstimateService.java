package com.buildflow.africa.estimates;

import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.estimates.EstimateController.EstimateRequest;
import com.buildflow.africa.estimates.EstimateController.ItemRequest;
import com.buildflow.africa.estimates.EstimateController.SectionRequest;
import com.buildflow.africa.settings.TaxRateService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EstimateService {

  private static final List<String> COST_TYPES =
      List.of("MATERIAL", "LABOUR", "EQUIPMENT", "SUBCONTRACTOR");
  private static final List<String> STATUSES =
      List.of("DRAFT", "READY", "QUOTED", "APPROVED", "REJECTED", "ARCHIVED");

  private final EstimateRepository repository;
  private final EstimateCalculator calculator;
  private final TaxRateService taxRateService;

  public EstimateService(EstimateRepository repository, EstimateCalculator calculator,
                         TaxRateService taxRateService) {
    this.repository = repository;
    this.calculator = calculator;
    this.taxRateService = taxRateService;
  }

  public Estimate findTenantEstimate(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("ESTIMATE_NOT_FOUND",
            "The requested estimate could not be found."));
  }

  @Transactional
  public Estimate create(EstimateRequest request, String estimator) {
    UUID tenantId = TenantContext.getRequired();
    Estimate estimate = new Estimate();
    estimate.setTenantId(tenantId);
    estimate.setEstimateNumber("EST-" + LocalDate.now().getYear() + "-"
        + String.format("%04d", repository.countByTenantId(tenantId) + 1));
    estimate.setTitle(request.title());
    estimate.setCurrency(request.currency() == null ? "GHS" : request.currency());
    estimate.setEstimatorName(request.estimator() == null ? estimator : request.estimator());
    applyHeader(estimate, request);
    if (request.taxPct() == null) {
      estimate.setTaxPercent(taxRateService.defaultEstimateTaxRate(tenantId));
    }
    replaceSections(estimate, request.sections());
    calculator.calculate(estimate);
    return repository.save(estimate);
  }

  /**
   * The builder saves the whole sheet at once, so a patch that carries sections replaces them
   * wholesale. Lines removed in the browser are removed here, and every figure is recalculated
   * server-side rather than trusting the totals that came in.
   */
  @Transactional
  public Estimate update(UUID id, EstimateRequest request) {
    Estimate estimate = findTenantEstimate(id);
    if ("APPROVED".equals(estimate.getStatus()) && request.sections() != null) {
      throw new IllegalArgumentException(
          "An approved estimate cannot be edited. Create a revision instead.");
    }
    if (request.title() != null) estimate.setTitle(request.title());
    if (request.estimator() != null) estimate.setEstimatorName(request.estimator());
    if (request.currency() != null) estimate.setCurrency(request.currency());
    if (request.status() != null) {
      if (!STATUSES.contains(request.status())) {
        throw new IllegalArgumentException("That is not a valid estimate status.");
      }
      estimate.setStatus(request.status());
    }
    applyHeader(estimate, request);
    if (request.sections() != null) {
      replaceSections(estimate, request.sections());
    }
    calculator.calculate(estimate);
    return repository.save(estimate);
  }

  private void applyHeader(Estimate estimate, EstimateRequest request) {
    if (request.projectId() != null) estimate.setProjectId(request.projectId());
    if (request.clientId() != null) estimate.setClientId(request.clientId());
    if (request.overheadPct() != null) estimate.setOverheadPercent(request.overheadPct());
    if (request.contingencyPct() != null) estimate.setContingencyPercent(request.contingencyPct());
    if (request.profitPct() != null) estimate.setProfitPercent(request.profitPct());
    if (request.taxPct() != null) estimate.setTaxPercent(request.taxPct());
    if (request.discount() != null) estimate.setDiscountAmount(request.discount());
  }

  private void replaceSections(Estimate estimate, List<SectionRequest> sections) {
    UUID tenantId = estimate.getTenantId();
    estimate.getSections().clear();

    int sectionOrder = 0;
    for (SectionRequest sectionRequest : sections == null ? List.<SectionRequest>of() : sections) {
      EstimateSection section = new EstimateSection();
      section.setTenantId(tenantId);
      section.setEstimate(estimate);
      section.setName(sectionRequest.name());
      section.setSortOrder(sectionOrder++);

      int itemOrder = 0;
      for (ItemRequest itemRequest : sectionRequest.items() == null ? List.<ItemRequest>of() : sectionRequest.items()) {
        EstimateItem item = new EstimateItem();
        item.setTenantId(tenantId);
        item.setEstimate(estimate);
        item.setSection(section);
        item.setDescription(itemRequest.description() == null ? "" : itemRequest.description());
        item.setCategory(itemRequest.category() == null ? section.getName() : itemRequest.category());
        item.setCostType(costType(itemRequest.kind()));
        item.setMaterialId(itemRequest.materialId());
        item.setQuantity(orZero(itemRequest.quantity()));
        item.setUnit(itemRequest.unit() == null ? "item" : itemRequest.unit());
        item.setUnitCost(orZero(itemRequest.rate()));
        item.setWastePercent(orZero(itemRequest.waste()));
        item.setMarkupPercent(orZero(itemRequest.markup()));
        item.setSortOrder(itemOrder++);
        section.getItems().add(item);
      }
      estimate.getSections().add(section);
    }
  }

  private String costType(String kind) {
    if (kind == null) {
      return "MATERIAL";
    }
    String normalised = kind.toUpperCase();
    if (!COST_TYPES.contains(normalised)) {
      throw new IllegalArgumentException(
          "A line must be one of " + String.join(", ", COST_TYPES) + ".");
    }
    return normalised;
  }

  private BigDecimal orZero(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
