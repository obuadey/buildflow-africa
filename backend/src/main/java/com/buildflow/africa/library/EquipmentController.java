package com.buildflow.africa.library;

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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/equipment")
public class EquipmentController {

  private static final List<String> SEARCHABLE = List.of("name", "unit");
  private static final Map<String, String> FILTERS = Map.of("supplier", "supplierId", "unit", "unit");

  private final EquipmentRepository repository;
  private final SupplierRepository suppliers;

  public EquipmentController(EquipmentRepository repository, SupplierRepository suppliers) {
    this.repository = repository;
    this.suppliers = suppliers;
  }

  @GetMapping
  public PageResponse<EquipmentView> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    Page<Equipment> page = repository.findAll(
        ListQuery.spec(tenantId, params, SEARCHABLE, FILTERS, "updatedAt"),
        ListQuery.pageable(params, "name"));
    Map<UUID, String> supplierNames = supplierNames(tenantId, page.getContent());
    return PageResponse.of(page, equipment ->
        EquipmentView.of(equipment, supplierNames.get(equipment.getSupplierId())));
  }

  @PostMapping
  public EquipmentView create(@Valid @RequestBody EquipmentRequest request) {
    Equipment equipment = new Equipment();
    equipment.setTenantId(TenantContext.getRequired());
    apply(equipment, request);
    return withSupplier(repository.save(equipment));
  }

  @PatchMapping("/{id}")
  public EquipmentView update(@PathVariable("id") UUID id, @RequestBody EquipmentRequest request) {
    Equipment equipment = find(id);
    apply(equipment, request);
    return withSupplier(repository.save(equipment));
  }

  /** Retired rather than deleted, so estimates priced from it keep their history. */
  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    Equipment equipment = find(id);
    equipment.setActive(false);
    repository.save(equipment);
  }

  private Equipment find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("EQUIPMENT_NOT_FOUND", "That equipment record no longer exists."));
  }

  private Map<UUID, String> supplierNames(UUID tenantId, List<Equipment> rows) {
    List<UUID> ids = rows.stream().map(Equipment::getSupplierId).filter(Objects::nonNull).distinct().toList();
    if (ids.isEmpty()) {
      return new HashMap<>();
    }
    // Mutable on purpose: a record with no supplier looks its name up by a null id.
    return new HashMap<>(suppliers.findAllById(ids).stream()
        .filter(supplier -> tenantId.equals(supplier.getTenantId()))
        .collect(Collectors.toMap(Supplier::getId, Supplier::getName, (a, b) -> a)));
  }

  private EquipmentView withSupplier(Equipment equipment) {
    return EquipmentView.of(equipment,
        supplierNames(TenantContext.getRequired(), List.of(equipment)).get(equipment.getSupplierId()));
  }

  private void apply(Equipment equipment, EquipmentRequest request) {
    if (request.name() != null) equipment.setName(request.name());
    if (request.unit() != null) equipment.setUnit(request.unit());
    if (request.hireRate() != null) equipment.setHireRate(request.hireRate());
    if (request.transport() != null) equipment.setTransportCost(request.transport());
    if (request.operatorCost() != null) equipment.setOperatorCost(request.operatorCost());
    if (request.supplierId() != null) equipment.setSupplierId(request.supplierId());
    if (request.active() != null) equipment.setActive(request.active());
  }

  public record EquipmentRequest(
      @NotBlank String name, String unit, BigDecimal hireRate, BigDecimal transport,
      BigDecimal operatorCost, UUID supplierId, String supplierName, Boolean active) {}

  public record EquipmentView(
      UUID id, String name, String unit, BigDecimal hireRate, BigDecimal transport,
      BigDecimal operatorCost, BigDecimal allInRate, UUID supplierId, String supplierName,
      boolean active, Instant updatedAt) {

    static EquipmentView of(Equipment equipment, String supplierName) {
      BigDecimal hire = orZero(equipment.getHireRate());
      BigDecimal transport = orZero(equipment.getTransportCost());
      BigDecimal operator = orZero(equipment.getOperatorCost());
      return new EquipmentView(equipment.getId(), equipment.getName(), equipment.getUnit(), hire,
          transport, operator, hire.add(transport).add(operator), equipment.getSupplierId(),
          supplierName, equipment.isActive(),
          equipment.getUpdatedAt() == null ? equipment.getCreatedAt() : equipment.getUpdatedAt());
    }

    private static BigDecimal orZero(BigDecimal value) {
      return value == null ? BigDecimal.ZERO : value;
    }
  }
}
