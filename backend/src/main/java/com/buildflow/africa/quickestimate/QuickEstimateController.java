package com.buildflow.africa.quickestimate;

import com.buildflow.africa.ai.AiClient;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.estimates.Estimate;
import com.buildflow.africa.estimates.EstimateController.EstimateRequest;
import com.buildflow.africa.estimates.EstimateController.EstimateView;
import com.buildflow.africa.estimates.EstimateController.ItemRequest;
import com.buildflow.africa.estimates.EstimateController.SectionRequest;
import com.buildflow.africa.estimates.EstimateService;
import com.buildflow.africa.rates.RateResolver;
import com.buildflow.africa.rates.ReferenceTemplate;
import com.buildflow.africa.rates.ReferenceTemplateItem;
import com.buildflow.africa.rates.ReferenceTemplateRepository;
import com.buildflow.africa.rates.ReferenceTemplateSection;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Quick Estimate: a first-pass bill in one step, which the estimator then refines.
 *
 * The four stages are deliberately separate. The model is asked what work the job involves; the
 * platform decides what every line costs, from the company's own price book first and the shared
 * reference library only as a fallback; nothing is stored until the estimator saves it.
 *
 * No rate on a returned line is ever produced by the model. A line the platform cannot price comes
 * back unpriced and flagged, because a contractor can see a blank and cannot see a plausible
 * invention.
 */
@RestController
@RequestMapping("/api/v1/quick-estimate")
public class QuickEstimateController {

  private final AiClient ai;
  private final RateResolver resolver;
  private final EstimateService estimates;
  private final TenantRepository tenants;
  private final ReferenceTemplateRepository referenceTemplates;

  public QuickEstimateController(AiClient ai, RateResolver resolver, EstimateService estimates,
                                 TenantRepository tenants,
                                 ReferenceTemplateRepository referenceTemplates) {
    this.ai = ai;
    this.resolver = resolver;
    this.estimates = estimates;
    this.tenants = tenants;
    this.referenceTemplates = referenceTemplates;
  }

  /** Step one: the questions this job has to answer before it can be priced. */
  @PostMapping("/questionnaire")
  public Map<String, Object> questionnaire(@Valid @RequestBody QuestionnaireRequest request) {
    String region = tenants.findById(TenantContext.getRequired()).map(Tenant::getRegion).orElse(null);
    return ai.post("/questionnaire", Map.of(
        "prompt", request.description(),
        "region", region == null ? "" : region));
  }

  /**
   * Steps two and three: draft the bill, then price every line from this company's rates.
   *
   * `source` decides how the content is read. A description is put to the model; a pasted or
   * uploaded bill is parsed instead, because the estimator has already done the take-off and does
   * not need it invented again.
   */
  @PostMapping("/generate")
  @Transactional(readOnly = true)
  @SuppressWarnings("unchecked")
  public Draft generate(@Valid @RequestBody GenerateRequest request) {
    UUID tenantId = TenantContext.getRequired();
    Tenant tenant = tenants.findById(tenantId).orElseThrow();

    Map<String, Object> drafted = switch (request.source()) {
      // A template already states the scope, so no model is involved at all: the quantities are
      // read off the shelf and scaled to the size of this job.
      case "TEMPLATE" -> fromTemplate(request);
      case "PASTE", "SPREADSHEET" -> ai.post("/extract",
          Map.of("content", request.content(), "kind", "paste"));
      default -> ai.post("/scope", Map.of(
          "prompt", request.content(),
          "country", "Ghana",
          "region", tenant.getRegion() == null ? "" : tenant.getRegion(),
          "parameters", request.parameters() == null ? Map.of() : request.parameters()));
    };

    RateResolver.Book book = resolver.bookFor(tenantId);
    List<Map<String, Object>> rawSections =
        (List<Map<String, Object>>) drafted.getOrDefault("sections", List.of());

    List<DraftSection> sections = new ArrayList<>();
    int priced = 0;
    int unpriced = 0;
    int stale = 0;
    BigDecimal directCost = BigDecimal.ZERO;

    for (Map<String, Object> rawSection : rawSections) {
      List<Map<String, Object>> rawItems =
          (List<Map<String, Object>>) rawSection.getOrDefault("items", List.of());
      List<DraftLine> lines = new ArrayList<>();

      for (Map<String, Object> rawItem : rawItems) {
        String description = String.valueOf(rawItem.getOrDefault("description", "")).trim();
        if (description.isEmpty()) {
          continue;
        }
        BigDecimal quantity = decimal(rawItem.get("quantity"));
        String unit = String.valueOf(rawItem.getOrDefault("unit", "item"));
        String kind = String.valueOf(rawItem.getOrDefault("cost_type", "MATERIAL")).toUpperCase();
        BigDecimal waste = decimal(rawItem.get("waste_percent"));

        RateResolver.Rate rate = resolver.resolve(book, description);
        if (rate.matched()) {
          priced++;
          if (rate.stale()) {
            stale++;
          }
          BigDecimal adjusted = quantity.multiply(BigDecimal.ONE.add(
              waste.divide(new BigDecimal("100"), 8, RoundingMode.HALF_UP)));
          directCost = directCost.add(adjusted.multiply(rate.rate()));
        } else {
          unpriced++;
        }

        lines.add(new DraftLine(description, quantity,
            rate.matched() && rate.unit() != null ? rate.unit() : unit, kind, waste,
            rate.rate(), rate.origin().name(), rate.source(), rate.effectiveDate(), rate.ageDays(),
            rate.stale(), rate.matchedName(), rate.materialId(),
            Math.round(rate.confidence() * 100) / 100.0));
      }
      if (!lines.isEmpty()) {
        sections.add(new DraftSection(String.valueOf(rawSection.getOrDefault("name", "Scope")), lines));
      }
    }

    List<String> notes = new ArrayList<>(
        (List<String>) drafted.getOrDefault("notes", new ArrayList<String>()));
    if (unpriced > 0) {
      notes.add(unpriced + (unpriced == 1 ? " line has" : " lines have")
          + " no rate in your price book or the reference library, and are left blank for you to price.");
    }
    if (stale > 0) {
      notes.add(stale + (stale == 1 ? " rate is" : " rates are")
          + " older than 60 days. Confirm them before this goes to a client.");
    }

    return new Draft(
        String.valueOf(drafted.getOrDefault("project_type", "General construction")),
        (Map<String, Object>) drafted.getOrDefault("basis", Map.of()),
        sections, notes,
        String.valueOf(drafted.getOrDefault("provider", "deterministic")),
        new Summary(priced + unpriced, priced, unpriced, stale,
            directCost.setScale(2, RoundingMode.HALF_UP), tenant.getDefaultCurrency()));
  }

  /**
   * Step four: save the draft as a real estimate, which the builder then owns. Unpriced lines are
   * kept at zero so the gap stays visible in the sheet.
   */
  @PostMapping("/save")
  @Transactional
  public EstimateView save(@Valid @RequestBody SaveRequest request,
                           @AuthenticationPrincipal AuthPrincipal principal) {
    Tenant tenant = tenants.findById(TenantContext.getRequired()).orElseThrow();

    List<SectionRequest> sections = request.sections().stream()
        .map(section -> new SectionRequest(section.name(), section.lines().stream()
            .map(line -> new ItemRequest(
                line.description(), section.name(), line.kind(), line.materialId(),
                line.quantity(), line.unit(),
                line.rate() == null ? BigDecimal.ZERO : line.rate(),
                line.waste(), request.markupPercent() == null ? BigDecimal.ZERO : request.markupPercent()))
            .toList()))
        .toList();

    Estimate estimate = estimates.create(new EstimateRequest(
        request.title(), request.projectId(), request.clientId(),
        principal == null ? null : principal.email(), "DRAFT", tenant.getDefaultCurrency(),
        orZero(request.overheadPct(), tenant.getDefaultOverhead()),
        orZero(request.contingencyPct(), BigDecimal.ZERO),
        orZero(request.profitPct(), tenant.getDefaultProfitMargin()),
        request.taxPct(),
        BigDecimal.ZERO, sections),
        principal == null ? null : principal.email());

    return EstimateView.detail(estimate, null, null);
  }

  /**
   * Builds the same shape the AI service returns, out of a shared template. `content` carries the
   * template id and `parameters.size` how much of it there is: 180 for a 180 m2 house.
   */
  private Map<String, Object> fromTemplate(GenerateRequest request) {
    ReferenceTemplate template = referenceTemplates.findById(UUID.fromString(request.content()))
        .orElseThrow(() -> new IllegalArgumentException("That template is no longer available."));
    BigDecimal size = decimal(request.parameters() == null ? null : request.parameters().get("size"));
    if (size.signum() <= 0) {
      size = BigDecimal.ONE;
    }

    List<Map<String, Object>> sections = new ArrayList<>();
    for (ReferenceTemplateSection section : template.getSections()) {
      List<Map<String, Object>> items = new ArrayList<>();
      for (ReferenceTemplateItem item : section.getItems()) {
        Map<String, Object> line = new HashMap<>();
        line.put("description", item.getDescription());
        line.put("quantity", item.getQuantity().multiply(size));
        line.put("unit", item.getUnit());
        line.put("cost_type", item.getCostType());
        line.put("waste_percent", item.getWastePercent());
        items.add(line);
      }
      sections.add(Map.of("name", section.getName(), "items", items));
    }

    return Map.of(
        "project_type", template.getName(),
        "basis", Map.of("template", template.getName(), "size", size, "unit", template.getUnit()),
        "sections", sections,
        "notes", new ArrayList<>(List.of(
            "Quantities come from the " + template.getName() + " template at " + size.stripTrailingZeros().toPlainString()
                + " " + template.getUnit() + ". Check them against your drawings before pricing.")),
        "provider", "template");
  }

  private BigDecimal orZero(BigDecimal given, BigDecimal fallback) {
    if (given != null) {
      return given;
    }
    return fallback == null ? BigDecimal.ZERO : fallback;
  }

  private static BigDecimal decimal(Object value) {
    if (value instanceof Number number) {
      return BigDecimal.valueOf(number.doubleValue());
    }
    try {
      return value == null ? BigDecimal.ZERO : new BigDecimal(String.valueOf(value));
    } catch (NumberFormatException ex) {
      return BigDecimal.ZERO;
    }
  }

  public record QuestionnaireRequest(@NotBlank String description) {}

  public record GenerateRequest(
      @NotBlank String source, @NotBlank String content, Map<String, Object> parameters) {}

  public record SaveRequest(
      @NotBlank String title, UUID projectId, UUID clientId, List<SaveSection> sections,
      BigDecimal overheadPct, BigDecimal contingencyPct, BigDecimal profitPct, BigDecimal taxPct,
      BigDecimal markupPercent) {}

  public record SaveSection(String name, List<SaveLine> lines) {}

  public record SaveLine(String description, String kind, BigDecimal quantity, String unit,
                         BigDecimal rate, BigDecimal waste, UUID materialId) {}

  /** One drafted line, with the rate and everything needed to judge whether to trust it. */
  public record DraftLine(
      String description, BigDecimal quantity, String unit, String kind, BigDecimal waste,
      BigDecimal rate, String origin, String source, LocalDate effectiveDate, Integer ageDays,
      boolean stale, String matchedName, UUID materialId, double confidence) {

    public boolean priced() {
      return rate != null;
    }
  }

  public record DraftSection(String name, List<DraftLine> lines) {}

  public record Summary(int lines, int priced, int unpriced, int stale, BigDecimal directCost,
                        String currency) {}

  public record Draft(String projectType, Map<String, Object> basis, List<DraftSection> sections,
                      List<String> notes, String provider, Summary summary) {}
}
