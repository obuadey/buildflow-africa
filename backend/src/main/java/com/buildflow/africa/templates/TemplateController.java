package com.buildflow.africa.templates;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.estimates.Estimate;
import com.buildflow.africa.estimates.EstimateController.EstimateRequest;
import com.buildflow.africa.estimates.EstimateController.EstimateView;
import com.buildflow.africa.estimates.EstimateController.ItemRequest;
import com.buildflow.africa.estimates.EstimateController.SectionRequest;
import com.buildflow.africa.estimates.EstimateItem;
import com.buildflow.africa.estimates.EstimateSection;
import com.buildflow.africa.estimates.EstimateService;
import com.buildflow.africa.materials.Material;
import com.buildflow.africa.materials.MaterialRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Estimate templates: the structures a contractor reuses for the jobs they quote most often.
 *
 * A template stores the shape of an estimate — its sections, descriptions, quantities and units —
 * and deliberately not its rates. Prices move; when an estimate is built from a template the rates
 * are looked up fresh from the library, so a template can never quietly reintroduce a stale price.
 */
@RestController
@RequestMapping("/api/v1/templates")
public class TemplateController {

  private static final List<String> SEARCHABLE = List.of("name", "category");
  private static final Map<String, String> FILTERS = Map.of("category", "category");

  private final EstimateTemplateRepository repository;
  private final EstimateService estimates;
  private final MaterialRepository materials;
  private final ActivityRecorder activity;

  public TemplateController(EstimateTemplateRepository repository, EstimateService estimates,
                            MaterialRepository materials, ActivityRecorder activity) {
    this.repository = repository;
    this.estimates = estimates;
    this.materials = materials;
    this.activity = activity;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public PageResponse<TemplateView> list(@RequestParam Map<String, String> params) {
    Page<EstimateTemplate> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "updatedAt"),
        ListQuery.pageable(params, "useCount"));
    return PageResponse.of(page, TemplateView::from);
  }

  @GetMapping("/{id}")
  @Transactional(readOnly = true)
  public TemplateDetail get(@PathVariable("id") UUID id) {
    return TemplateDetail.from(find(id));
  }

  /**
   * Saves a structure as a template. Given an estimate id it copies that estimate's shape; given
   * sections it takes them directly.
   */
  @PostMapping
  @Transactional
  public TemplateView create(@Valid @RequestBody TemplateRequest request,
                             @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    EstimateTemplate template = new EstimateTemplate();
    template.setTenantId(tenantId);
    template.setName(request.name());
    template.setCategory(request.category());

    if (request.estimateId() != null) {
      Estimate estimate = estimates.findTenantEstimate(request.estimateId());
      template.setTypicalValue(estimate.getTotalAmount());
      if (template.getCategory() == null) {
        template.setCategory(estimate.getSections().stream().findFirst()
            .map(EstimateSection::getName).orElse("General"));
      }
      copyFromEstimate(template, estimate);
    } else {
      template.setTypicalValue(request.typicalValue() == null ? BigDecimal.ZERO : request.typicalValue());
      copyFromRequest(template, request.sections());
    }

    EstimateTemplate saved = repository.save(template);
    activity.record(principal == null ? null : principal.email(), "SALES",
        "Template saved — " + saved.getName(), "template", saved.getId(), "/templates");
    return TemplateView.from(saved);
  }

  @PatchMapping("/{id}")
  @Transactional
  public TemplateView update(@PathVariable("id") UUID id, @RequestBody TemplateRequest request) {
    EstimateTemplate template = find(id);
    if (request.name() != null) template.setName(request.name());
    if (request.category() != null) template.setCategory(request.category());
    if (request.typicalValue() != null) template.setTypicalValue(request.typicalValue());
    if (request.sections() != null) copyFromRequest(template, request.sections());
    return TemplateView.from(repository.save(template));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    repository.delete(find(id));
  }

  /**
   * Starts a new estimate from the template. Every line is repriced from the current rate library,
   * matched on description, so the new estimate opens with today's prices rather than the ones that
   * were current when the template was saved.
   */
  @PostMapping("/{id}/use")
  @Transactional
  public EstimateView use(@PathVariable("id") UUID id, @RequestBody(required = false) UseRequest request,
                          @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    EstimateTemplate template = find(id);
    UseRequest options = request == null ? new UseRequest(null, null, null, null) : request;

    Map<String, Material> library = materials.findByTenantIdAndActiveTrueOrderByName(tenantId).stream()
        .collect(Collectors.toMap(material -> material.getName().toLowerCase(Locale.ROOT),
            material -> material, (a, b) -> a));

    List<SectionRequest> sections = template.getSections().stream()
        .map(section -> new SectionRequest(section.getName(), section.getItems().stream()
            .map(item -> {
              Material match = library.get(item.getDescription().toLowerCase(Locale.ROOT));
              return new ItemRequest(item.getDescription(), item.getCategory(), item.getCostType(),
                  match == null ? null : match.getId(), item.getQuantity(), item.getUnit(),
                  match == null ? BigDecimal.ZERO : match.getPurchasePrice(),
                  BigDecimal.ZERO, BigDecimal.ZERO);
            })
            .toList()))
        .toList();

    Estimate estimate = estimates.create(new EstimateRequest(
        options.title() == null || options.title().isBlank() ? template.getName() : options.title(),
        options.projectId(), options.clientId(), null, "DRAFT", null,
        null, null, null, options.taxPct(), null, sections),
        principal == null ? null : principal.email());

    template.setUseCount(template.getUseCount() + 1);
    repository.save(template);

    activity.record(principal == null ? null : principal.email(), "SALES",
        "Estimate " + estimate.getEstimateNumber() + " started from template " + template.getName(),
        "estimate", estimate.getId(), "/estimates/" + estimate.getId());
    return EstimateView.detail(estimate, null, null);
  }

  private EstimateTemplate find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("TEMPLATE_NOT_FOUND", "That template no longer exists."));
  }

  private void copyFromEstimate(EstimateTemplate template, Estimate estimate) {
    template.getSections().clear();
    int sectionOrder = 0;
    for (EstimateSection source : estimate.getSections()) {
      TemplateSection section = section(template, source.getName(), sectionOrder++);
      int itemOrder = 0;
      for (EstimateItem item : source.getItems()) {
        TemplateItem copy = new TemplateItem();
        copy.setTenantId(template.getTenantId());
        copy.setSection(section);
        copy.setDescription(item.getDescription());
        copy.setCategory(item.getCategory());
        copy.setCostType(item.getCostType());
        copy.setQuantity(item.getQuantity());
        copy.setUnit(item.getUnit());
        copy.setSortOrder(itemOrder++);
        section.getItems().add(copy);
      }
      template.getSections().add(section);
    }
  }

  private void copyFromRequest(EstimateTemplate template, List<TemplateSectionRequest> sections) {
    template.getSections().clear();
    int sectionOrder = 0;
    for (TemplateSectionRequest source : sections == null ? List.<TemplateSectionRequest>of() : sections) {
      TemplateSection section = section(template, source.name(), sectionOrder++);
      int itemOrder = 0;
      for (TemplateItemRequest item : source.items() == null ? List.<TemplateItemRequest>of() : source.items()) {
        TemplateItem copy = new TemplateItem();
        copy.setTenantId(template.getTenantId());
        copy.setSection(section);
        copy.setDescription(item.description());
        copy.setCategory(item.category());
        copy.setCostType(item.kind() == null ? "MATERIAL" : item.kind().toUpperCase(Locale.ROOT));
        copy.setQuantity(item.quantity() == null ? BigDecimal.ONE : item.quantity());
        copy.setUnit(item.unit() == null ? "item" : item.unit());
        copy.setSortOrder(itemOrder++);
        section.getItems().add(copy);
      }
      template.getSections().add(section);
    }
  }

  private TemplateSection section(EstimateTemplate template, String name, int order) {
    TemplateSection section = new TemplateSection();
    section.setTenantId(template.getTenantId());
    section.setTemplate(template);
    section.setName(name == null ? "Section" : name);
    section.setSortOrder(order);
    return section;
  }

  public record TemplateRequest(
      @NotBlank String name, String category, UUID estimateId, BigDecimal typicalValue,
      List<TemplateSectionRequest> sections) {}

  public record TemplateSectionRequest(String name, List<TemplateItemRequest> items) {}

  public record TemplateItemRequest(String description, String category, String kind,
                                    BigDecimal quantity, String unit) {}

  public record UseRequest(String title, UUID projectId, UUID clientId, BigDecimal taxPct) {}

  public record TemplateView(UUID id, String name, String category, int sections, int items,
                             BigDecimal typicalValue, int uses, Instant updatedAt) {

    static TemplateView from(EstimateTemplate template) {
      return new TemplateView(template.getId(), template.getName(),
          template.getCategory() == null ? "General" : template.getCategory(),
          template.getSections().size(),
          template.getSections().stream().mapToInt(section -> section.getItems().size()).sum(),
          template.getTypicalValue(), template.getUseCount(),
          template.getUpdatedAt() == null ? template.getCreatedAt() : template.getUpdatedAt());
    }
  }

  public record TemplateDetail(UUID id, String name, String category, BigDecimal typicalValue,
                               int uses, List<SectionView> sections, Instant updatedAt) {

    static TemplateDetail from(EstimateTemplate template) {
      List<SectionView> sections = new ArrayList<>();
      for (TemplateSection section : template.getSections()) {
        sections.add(new SectionView(section.getId(), section.getName(),
            section.getItems().stream()
                .map(item -> new ItemView(item.getId(), item.getDescription(), item.getCategory(),
                    item.getCostType(), item.getQuantity(), item.getUnit()))
                .toList()));
      }
      return new TemplateDetail(template.getId(), template.getName(), template.getCategory(),
          template.getTypicalValue(), template.getUseCount(), sections,
          template.getUpdatedAt() == null ? template.getCreatedAt() : template.getUpdatedAt());
    }
  }

  public record SectionView(UUID id, String name, List<ItemView> items) {}

  public record ItemView(UUID id, String description, String category, String kind,
                         BigDecimal quantity, String unit) {}
}
