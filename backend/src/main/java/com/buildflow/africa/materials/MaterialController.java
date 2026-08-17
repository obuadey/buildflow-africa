package com.buildflow.africa.materials;

import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.suppliers.Supplier;
import com.buildflow.africa.suppliers.SupplierRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;

/** The rate library a contractor prices from. */
@RestController
@RequestMapping("/api/v1/materials")
public class MaterialController {

  private static final List<String> SEARCHABLE =
      List.of("name", "brand", "description", "location", "unit");
  private static final Map<String, String> FILTERS = Map.of(
      "supplier", "supplierId", "source", "priceSource", "brand", "brand", "unit", "unit");

  private final MaterialRepository repository;
  private final SupplierRepository suppliers;
  private final MaterialCategoryRepository categories;

  public MaterialController(MaterialRepository repository, SupplierRepository suppliers,
                            MaterialCategoryRepository categories) {
    this.repository = repository;
    this.suppliers = suppliers;
    this.categories = categories;
  }

  @GetMapping
  public PageResponse<MaterialView> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    Page<Material> page = repository.findAll(
        ListQuery.<Material>spec(tenantId, params, SEARCHABLE, FILTERS, "updatedAt")
            .and(active(params))
            .and(inCategory(params.get("category"), tenantId)),
        ListQuery.pageable(params, "name"));
    Map<UUID, String> supplierNames = supplierNames(tenantId, page.getContent());
    Map<UUID, String> categoryNames = categoryNames(tenantId);
    return PageResponse.of(page, material -> MaterialView.of(material,
        supplierNames.get(material.getSupplierId()), categoryNames.get(material.getCategoryId())));
  }

  @GetMapping("/{id}")
  public MaterialView get(@PathVariable("id") UUID id) {
    return withSupplier(find(id));
  }

  @PostMapping
  public MaterialView create(@Valid @RequestBody MaterialRequest request) {
    Material material = new Material();
    material.setTenantId(TenantContext.getRequired());
    apply(material, request);
    return withSupplier(repository.save(material));
  }

  @PatchMapping("/{id}")
  public MaterialView update(@PathVariable("id") UUID id, @RequestBody MaterialRequest request) {
    Material material = find(id);
    apply(material, request);
    return withSupplier(repository.save(material));
  }

  /**
   * Retiring a rate rather than deleting it: estimates priced from it keep their history, and it
   * simply stops appearing in the library.
   */
  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    Material material = find(id);
    material.setActive(false);
    repository.save(material);
  }

  /** Retired rates are hidden unless a caller explicitly asks to see them. */
  private Specification<Material> active(Map<String, String> params) {
    boolean includeRetired = "all".equalsIgnoreCase(params.get("status"))
        || "true".equalsIgnoreCase(params.get("includeRetired"));
    return (root, query, cb) -> includeRetired ? cb.conjunction() : cb.isTrue(root.get("active"));
  }

  /** The library filters by trade name, which the browser knows; ids stay on this side. */
  private Specification<Material> inCategory(String name, UUID tenantId) {
    if (name == null || name.isBlank()) {
      return (root, query, cb) -> cb.conjunction();
    }
    List<UUID> ids = Arrays.stream(name.split(","))
        .map(String::trim).filter(value -> !value.isEmpty())
        .map(value -> categories.byName(value, tenantId).orElse(null))
        .filter(java.util.Objects::nonNull)
        .map(MaterialCategory::getId)
        .toList();
    return ids.isEmpty()
        ? (root, query, cb) -> cb.disjunction()
        : (root, query, cb) -> root.get("categoryId").in(ids);
  }

  private Map<UUID, String> categoryNames(UUID tenantId) {
    return categories.visibleTo(tenantId).stream()
        .collect(Collectors.toMap(MaterialCategory::getId, MaterialCategory::getName, (a, b) -> a));
  }

  private Material find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("MATERIAL_NOT_FOUND", "That rate is no longer in the library."));
  }

  private Map<UUID, String> supplierNames(UUID tenantId, List<Material> materials) {
    List<UUID> ids = materials.stream().map(Material::getSupplierId)
        .filter(java.util.Objects::nonNull).distinct().toList();
    if (ids.isEmpty()) {
      return new HashMap<>();
    }
    // Mutable on purpose: a record with no supplier looks its name up by a null id.
    return new HashMap<>(suppliers.findAllById(ids).stream()
        .filter(supplier -> tenantId.equals(supplier.getTenantId()))
        .collect(Collectors.toMap(Supplier::getId, Supplier::getName, (a, b) -> a)));
  }

  private MaterialView withSupplier(Material material) {
    UUID tenantId = TenantContext.getRequired();
    return MaterialView.of(material,
        supplierNames(tenantId, List.of(material)).get(material.getSupplierId()),
        categoryNames(tenantId).get(material.getCategoryId()));
  }

  private void apply(Material material, MaterialRequest request) {
    if (request.category() != null) {
      material.setCategoryId(categories.byName(request.category(), material.getTenantId())
          .map(MaterialCategory::getId)
          .orElseGet(() -> {
            MaterialCategory created = new MaterialCategory();
            created.setTenantId(material.getTenantId());
            created.setName(request.category());
            return categories.save(created).getId();
          }));
    }
    if (request.name() != null) material.setName(request.name());
    if (request.description() != null) material.setDescription(request.description());
    if (request.brand() != null) material.setBrand(request.brand());
    if (request.unit() != null) material.setUnit(request.unit());
    if (request.cost() != null) material.setPurchasePrice(request.cost());
    if (request.sellingRate() != null) material.setSellingRate(request.sellingRate());
    if (request.supplierId() != null) material.setSupplierId(request.supplierId());
    if (request.location() != null) material.setLocation(request.location());
    if (request.effectiveDate() != null) material.setEffectiveDate(request.effectiveDate());
    if (request.vat() != null) material.setVatApplicable(request.vat());
    if (request.source() != null) material.setPriceSource(request.source());
    if (request.active() != null) material.setActive(request.active());
    if (request.notes() != null) material.setNotes(request.notes());
    if (material.getUnit() == null) material.setUnit("item");
  }

  public record MaterialRequest(
      @NotBlank String name, String description, String category, String brand, String unit,
      BigDecimal cost, BigDecimal sellingRate, UUID supplierId, String location,
      LocalDate effectiveDate, Boolean vat, String source, Boolean active, String notes) {}

  public record MaterialView(
      UUID id, String name, String description, String category, String brand, String unit,
      BigDecimal cost, BigDecimal sellingRate, UUID supplierId, String supplierName, String location,
      LocalDate effectiveDate, boolean vat, String source, boolean active, Instant updatedAt) {

    public static MaterialView of(Material material, String supplierName, String category) {
      return new MaterialView(material.getId(), material.getName(), material.getDescription(),
          category == null ? "Uncategorised" : category, material.getBrand(), material.getUnit(),
          material.getPurchasePrice(), material.getSellingRate(), material.getSupplierId(),
          supplierName, material.getLocation(), material.getEffectiveDate(),
          material.isVatApplicable(), material.getPriceSource(), material.isActive(),
          material.getUpdatedAt() == null ? material.getCreatedAt() : material.getUpdatedAt());
    }
  }
}
