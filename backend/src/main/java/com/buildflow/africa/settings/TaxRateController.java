package com.buildflow.africa.settings;

import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.membership.TenantAccessService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tax-rates")
public class TaxRateController {

  private static final List<String> ADMIN_ROLES = List.of("OWNER", "ADMIN");

  private final TaxRateRepository taxes;
  private final TaxRateService taxRateService;
  private final TenantAccessService access;

  public TaxRateController(TaxRateRepository taxes, TaxRateService taxRateService,
                           TenantAccessService access) {
    this.taxes = taxes;
    this.taxRateService = taxRateService;
    this.access = access;
  }

  @GetMapping
  public PageResponse<TaxView> list(@RequestParam(name = "status", required = false) String status) {
    UUID tenantId = TenantContext.getRequired();
    List<TaxRate> rows = taxRateService.listOrSeedGhanaDefaults(tenantId);
    if ("active".equalsIgnoreCase(status)) {
      rows = rows.stream().filter(TaxRate::isActive).toList();
    } else if ("inactive".equalsIgnoreCase(status)) {
      rows = rows.stream().filter(row -> !row.isActive()).toList();
    }
    return PageResponse.of(new PageImpl<>(rows, PageRequest.of(0, Math.max(rows.size(), 1)), rows.size()),
        TaxView::from);
  }

  @GetMapping("/{id}")
  public TaxView get(@PathVariable("id") UUID id) {
    return TaxView.from(find(id));
  }

  @PostMapping
  public TaxView create(@Valid @RequestBody TaxRequest request,
                        @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    TaxRate rate = new TaxRate();
    rate.setTenantId(tenantId);
    apply(rate, request);
    return TaxView.from(taxes.save(rate));
  }

  @PatchMapping("/{id}")
  public TaxView update(@PathVariable("id") UUID id, @RequestBody TaxRequest request,
                        @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    TaxRate rate = find(id);
    apply(rate, request);
    return TaxView.from(taxes.save(rate));
  }

  @PostMapping("/{id}/{action}")
  public TaxView action(@PathVariable("id") UUID id, @PathVariable("action") String action,
                        @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    TaxRate rate = find(id);
    switch (action) {
      case "activate" -> rate.setActive(true);
      case "deactivate" -> rate.setActive(false);
      case "duplicate" -> {
        TaxRate copy = new TaxRate();
        copy.setTenantId(tenantId);
        copy.setName(rate.getName() + " copy");
        copy.setRate(rate.getRate());
        copy.setAppliesTo(rate.getAppliesTo());
        copy.setEffectiveFrom(rate.getEffectiveFrom());
        copy.setActive(false);
        return TaxView.from(taxes.save(copy));
      }
      default -> throw new IllegalArgumentException("That tax-rate action is not supported.");
    }
    return TaxView.from(taxes.save(rate));
  }

  @PostMapping("/reset-ghana-defaults")
  @Transactional
  public PageResponse<TaxView> resetGhanaDefaults(@AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    List<TaxRate> rows = taxRateService.resetToGhanaDefaults(tenantId);
    return PageResponse.of(new PageImpl<>(rows, PageRequest.of(0, Math.max(rows.size(), 1)), rows.size()),
        TaxView::from);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id, @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    taxes.delete(find(id));
  }

  private TaxRate find(UUID id) {
    return taxes.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("TAX_RATE_NOT_FOUND", "That tax rate no longer exists."));
  }

  private void apply(TaxRate rate, TaxRequest request) {
    if (request.name() != null) rate.setName(request.name().trim());
    if (request.rate() != null) rate.setRate(request.rate());
    if (request.appliesTo() != null) rate.setAppliesTo(request.appliesTo().trim());
    if (request.effectiveFrom() != null) rate.setEffectiveFrom(request.effectiveFrom());
    if (request.active() != null) rate.setActive(request.active());
  }

  public record TaxRequest(@NotBlank String name, BigDecimal rate, String appliesTo,
                           LocalDate effectiveFrom, Boolean active) {}

  public record TaxView(UUID id, String name, BigDecimal rate, String appliesTo,
                        LocalDate effectiveFrom, boolean active, Instant createdAt, Instant updatedAt) {
    static TaxView from(TaxRate tax) {
      return new TaxView(tax.getId(), tax.getName(), tax.getRate(), tax.getAppliesTo(),
          tax.getEffectiveFrom(), tax.isActive(), tax.getCreatedAt(),
          tax.getUpdatedAt() == null ? tax.getCreatedAt() : tax.getUpdatedAt());
    }
  }
}
