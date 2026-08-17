package com.buildflow.africa.library;

import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Composite rates. The unit cost is always the sum of the components, never a typed-in figure. */
@RestController
@RequestMapping("/api/v1/assemblies")
public class AssemblyController {

  private static final List<String> SEARCHABLE = List.of("name", "category");
  private static final Map<String, String> FILTERS = Map.of("category", "category");

  private final AssemblyRepository repository;
  private final AssemblyItemRepository items;

  public AssemblyController(AssemblyRepository repository, AssemblyItemRepository items) {
    this.repository = repository;
    this.items = items;
  }

  @GetMapping
  public PageResponse<AssemblyView> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    return PageResponse.of(repository.findAll(
        ListQuery.spec(tenantId, params, SEARCHABLE, FILTERS, "updatedAt"),
        ListQuery.pageable(params, "name")),
        assembly -> AssemblyView.from(assembly, components(assembly.getId())));
  }

  @GetMapping("/{id}")
  public AssemblyView get(@PathVariable("id") UUID id) {
    Assembly assembly = require(id);
    return AssemblyView.from(assembly, components(id));
  }

  @PostMapping
  @Transactional
  public AssemblyView create(@Valid @RequestBody AssemblyRequest request) {
    UUID tenantId = TenantContext.getRequired();
    Assembly assembly = new Assembly();
    assembly.setTenantId(tenantId);
    assembly.setName(request.name());
    assembly.setCategory(request.category());
    if (request.unit() != null) assembly.setUnit(request.unit());
    assembly.setNotes(request.notes());
    Assembly saved = repository.save(assembly);
    return AssemblyView.from(saved, replaceComponents(saved, request.components()));
  }

  @PatchMapping("/{id}")
  @Transactional
  public AssemblyView update(@PathVariable("id") UUID id, @RequestBody AssemblyRequest request) {
    Assembly assembly = require(id);
    if (request.name() != null) assembly.setName(request.name());
    if (request.category() != null) assembly.setCategory(request.category());
    if (request.unit() != null) assembly.setUnit(request.unit());
    if (request.notes() != null) assembly.setNotes(request.notes());
    List<AssemblyItem> components = request.components() == null
        ? components(id)
        : replaceComponents(assembly, request.components());
    return AssemblyView.from(repository.save(assembly), components);
  }

  private List<AssemblyItem> replaceComponents(Assembly assembly, List<ComponentRequest> requested) {
    UUID tenantId = TenantContext.getRequired();
    items.deleteAll(components(assembly.getId()));
    List<AssemblyItem> saved = new java.util.ArrayList<>();
    int order = 0;
    BigDecimal unitCost = BigDecimal.ZERO;
    for (ComponentRequest component : requested == null ? List.<ComponentRequest>of() : requested) {
      AssemblyItem item = new AssemblyItem();
      item.setTenantId(tenantId);
      item.setAssemblyId(assembly.getId());
      item.setDescription(component.description());
      item.setQuantity(component.quantity() == null ? BigDecimal.ONE : component.quantity());
      item.setUnit(component.unit() == null ? assembly.getUnit() : component.unit());
      item.setRate(component.rate() == null ? BigDecimal.ZERO : component.rate());
      item.setMaterialId(component.materialId());
      item.setLabourRateId(component.labourRateId());
      item.setSortOrder(order++);
      saved.add(items.save(item));
      unitCost = unitCost.add(item.getQuantity().multiply(item.getRate()));
    }
    assembly.setUnitCost(unitCost);
    repository.save(assembly);
    return saved;
  }

  private List<AssemblyItem> components(UUID assemblyId) {
    return items.findByTenantIdAndAssemblyIdOrderBySortOrderAsc(TenantContext.getRequired(), assemblyId);
  }

  private Assembly require(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("ASSEMBLY_NOT_FOUND", "That assembly no longer exists."));
  }

  public record ComponentRequest(String description, BigDecimal quantity, String unit, BigDecimal rate,
                                 UUID materialId, UUID labourRateId) {}

  public record AssemblyRequest(@NotBlank String name, String category, String unit, String notes,
                                List<ComponentRequest> components) {}

  public record ComponentView(UUID id, String description, BigDecimal quantity, String unit, BigDecimal rate) {
    static ComponentView from(AssemblyItem item) {
      return new ComponentView(item.getId(), item.getDescription(), item.getQuantity(), item.getUnit(), item.getRate());
    }
  }

  public record AssemblyView(UUID id, String name, String category, String unit, BigDecimal unitCost,
                             List<ComponentView> components, Instant updatedAt) {
    static AssemblyView from(Assembly assembly, List<AssemblyItem> items) {
      return new AssemblyView(assembly.getId(), assembly.getName(), assembly.getCategory(), assembly.getUnit(),
          assembly.getUnitCost(), items.stream().map(ComponentView::from).toList(), assembly.getUpdatedAt());
    }
  }
}
