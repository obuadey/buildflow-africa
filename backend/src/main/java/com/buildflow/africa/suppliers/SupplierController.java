package com.buildflow.africa.suppliers;

import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.expenses.ExpenseRepository;
import com.buildflow.africa.materials.MaterialRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/suppliers")
public class SupplierController {

  private static final List<String> SEARCHABLE =
      List.of("name", "contactPerson", "city", "region", "email", "phone");
  private static final Map<String, String> FILTERS = Map.of("region", "region", "terms", "paymentTerms");

  private final SupplierRepository repository;
  private final MaterialRepository materials;
  private final ExpenseRepository expenses;

  public SupplierController(SupplierRepository repository, MaterialRepository materials,
                            ExpenseRepository expenses) {
    this.repository = repository;
    this.materials = materials;
    this.expenses = expenses;
  }

  @GetMapping
  public PageResponse<SupplierView> list(@RequestParam Map<String, String> params) {
    return PageResponse.of(repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "name")), SupplierView::from);
  }

  @GetMapping("/{id}")
  public SupplierView get(@PathVariable("id") UUID id) {
    return SupplierView.from(require(id));
  }

  @PostMapping
  public SupplierView create(@Valid @RequestBody SupplierRequest request) {
    Supplier supplier = new Supplier();
    supplier.setTenantId(TenantContext.getRequired());
    apply(supplier, request);
    return SupplierView.from(repository.save(supplier));
  }

  @PatchMapping("/{id}")
  public SupplierView update(@PathVariable("id") UUID id, @RequestBody SupplierRequest request) {
    Supplier supplier = require(id);
    apply(supplier, request);
    return SupplierView.from(repository.save(supplier));
  }

  private Supplier require(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("SUPPLIER_NOT_FOUND", "That supplier no longer exists."));
  }

  private void apply(Supplier supplier, SupplierRequest request) {
    if (request.name() != null) supplier.setName(request.name());
    if (request.contactPerson() != null) supplier.setContactPerson(request.contactPerson());
    if (request.phone() != null) supplier.setPhone(request.phone());
    if (request.whatsapp() != null) supplier.setWhatsapp(request.whatsapp());
    if (request.email() != null) supplier.setEmail(request.email());
    if (request.address() != null) supplier.setAddress(request.address());
    if (request.region() != null) supplier.setRegion(request.region());
    if (request.city() != null) supplier.setCity(request.city());
    if (request.paymentTerms() != null) supplier.setPaymentTerms(request.paymentTerms());
    if (request.notes() != null) supplier.setNotes(request.notes());
  }

  public record SupplierRequest(@NotBlank String name, String contactPerson, String phone, String whatsapp,
                                String email, String address, String region, String city,
                                String paymentTerms, String notes) {}

  public record SupplierView(UUID id, String name, String contactPerson, String phone, String whatsapp,
                             String email, String region, String city, String paymentTerms, String notes) {
    static SupplierView from(Supplier s) {
      return new SupplierView(s.getId(), s.getName(), s.getContactPerson(), s.getPhone(), s.getWhatsapp(),
          s.getEmail(), s.getRegion(), s.getCity(), s.getPaymentTerms(), s.getNotes());
    }
  }
}
