package com.buildflow.africa.rates;

import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.templates.EstimateTemplate;
import com.buildflow.africa.templates.EstimateTemplateRepository;
import com.buildflow.africa.templates.TemplateItem;
import com.buildflow.africa.templates.TemplateSection;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * The shared template and assembly shelf.
 *
 * Every company reads the same shelf, and nothing on it is priced. A company that adopts a
 * template gets its own copy to edit, because the moment they change a quantity it stops being
 * the platform's template and becomes theirs.
 */
@RestController
@RequestMapping("/api/v1/reference-library")
public class ReferenceLibraryController {

  private final ReferenceTemplateRepository templates;
  private final ReferenceAssemblyRepository assemblies;
  private final EstimateTemplateRepository ownTemplates;

  public ReferenceLibraryController(ReferenceTemplateRepository templates,
                                    ReferenceAssemblyRepository assemblies,
                                    EstimateTemplateRepository ownTemplates) {
    this.templates = templates;
    this.assemblies = assemblies;
    this.ownTemplates = ownTemplates;
  }

  // The shelf is small and fixed, so there is nothing to page through. It still answers in the
  // list envelope every other collection uses, so the client reads it the same way.
  @GetMapping("/templates")
  @Transactional(readOnly = true)
  public PageResponse<TemplateView> templates() {
    List<TemplateView> rows = templates.findByCountryOrderBySortOrderAsc("Ghana").stream()
        .map(TemplateView::of).toList();
    return new PageResponse<>(rows, rows.size(), 1, Math.max(rows.size(), 1), 1);
  }

  @GetMapping("/templates/{id}")
  @Transactional(readOnly = true)
  public TemplateView template(@PathVariable("id") UUID id) {
    return TemplateView.detail(templates.findById(id).orElseThrow());
  }

  @GetMapping("/assemblies")
  @Transactional(readOnly = true)
  public PageResponse<AssemblyView> assemblies() {
    List<AssemblyView> rows = assemblies.findByCountryOrderBySortOrderAsc("Ghana").stream()
        .map(AssemblyView::of).toList();
    return new PageResponse<>(rows, rows.size(), 1, Math.max(rows.size(), 1), 1);
  }

  /**
   * Copies a shared template into the company's own templates, scaled to the size of the job.
   *
   * The shelf copy is left untouched. Quantities are multiplied out here rather than stored as a
   * factor, because from this point the estimator edits real quantities for a real building.
   */
  @PostMapping("/templates/{id}/adopt")
  @Transactional
  public AdoptResult adopt(@PathVariable("id") UUID id, @RequestBody(required = false) AdoptRequest request) {
    UUID tenantId = TenantContext.getRequired();
    ReferenceTemplate source = templates.findById(id).orElseThrow();
    BigDecimal size = request == null || request.quantity() == null || request.quantity().signum() <= 0
        ? BigDecimal.ONE
        : request.quantity();

    EstimateTemplate copy = new EstimateTemplate();
    copy.setTenantId(tenantId);
    copy.setName(request != null && request.name() != null && !request.name().isBlank()
        ? request.name()
        : source.getName());
    copy.setCategory(source.getCategory());

    int lines = 0;
    for (ReferenceTemplateSection section : source.getSections()) {
      TemplateSection sectionCopy = new TemplateSection();
      sectionCopy.setTenantId(tenantId);
      sectionCopy.setName(section.getName());
      sectionCopy.setSortOrder(section.getSortOrder());
      sectionCopy.setTemplate(copy);

      for (ReferenceTemplateItem item : section.getItems()) {
        TemplateItem itemCopy = new TemplateItem();
        itemCopy.setTenantId(tenantId);
        itemCopy.setDescription(item.getDescription());
        itemCopy.setCategory(item.getCategory());
        itemCopy.setCostType(item.getCostType());
        itemCopy.setQuantity(item.getQuantity().multiply(size));
        itemCopy.setUnit(item.getUnit());
        itemCopy.setSortOrder(item.getSortOrder());
        itemCopy.setSection(sectionCopy);
        sectionCopy.getItems().add(itemCopy);
        lines++;
      }
      copy.getSections().add(sectionCopy);
    }

    ownTemplates.save(copy);
    return new AdoptResult(copy.getId(), copy.getName(), copy.getSections().size(), lines);
  }

  public record AdoptRequest(BigDecimal quantity, String name) {}

  public record AdoptResult(UUID id, String name, int sections, int lines) {}

  public record ItemView(String description, String category, String costType, BigDecimal quantity,
                         String unit, BigDecimal wastePercent) {}

  public record SectionView(String name, List<ItemView> items) {
    static SectionView of(ReferenceTemplateSection section) {
      return new SectionView(section.getName(), section.getItems().stream()
          .map(item -> new ItemView(item.getDescription(), item.getCategory(), item.getCostType(),
              item.getQuantity(), item.getUnit(), item.getWastePercent()))
          .toList());
    }
  }

  /**
   * `sections` is empty in the list view and populated in the detail view, for the same reason the
   * estimates list omits its lines: drawing a catalogue should not load every composition.
   */
  public record TemplateView(UUID id, String name, String category, String description, String unit,
                             boolean indicative, int lines, List<SectionView> sections) {

    static TemplateView of(ReferenceTemplate template) {
      return new TemplateView(template.getId(), template.getName(), template.getCategory(),
          template.getDescription(), template.getUnit(), template.isIndicative(),
          countLines(template), List.of());
    }

    static TemplateView detail(ReferenceTemplate template) {
      return new TemplateView(template.getId(), template.getName(), template.getCategory(),
          template.getDescription(), template.getUnit(), template.isIndicative(),
          countLines(template), template.getSections().stream().map(SectionView::of).toList());
    }

    private static int countLines(ReferenceTemplate template) {
      return template.getSections().stream().mapToInt(section -> section.getItems().size()).sum();
    }
  }

  public record AssemblyView(UUID id, String name, String category, String unit, String notes,
                             boolean indicative, List<ItemView> items) {
    static AssemblyView of(ReferenceAssembly assembly) {
      return new AssemblyView(assembly.getId(), assembly.getName(), assembly.getCategory(),
          assembly.getUnit(), assembly.getNotes(), assembly.isIndicative(),
          assembly.getItems().stream()
              .map(item -> new ItemView(item.getDescription(), null, item.getCostType(),
                  item.getQuantity(), item.getUnit(), item.getWastePercent()))
              .toList());
    }
  }
}
