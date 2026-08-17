package com.buildflow.africa.settings;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaxRateService {

  private static final LocalDate GHANA_EFFECTIVE_FROM = LocalDate.of(2026, 1, 1);
  private static final List<DefaultTax> GHANA_DEFAULTS = List.of(
      new DefaultTax("VAT", "15.0000", "Standard taxable supplies"),
      new DefaultTax("NHIL", "2.5000", "National Health Insurance Levy"),
      new DefaultTax("GETFund Levy", "2.5000", "Ghana Education Trust Fund Levy"),
      new DefaultTax("Communication Service Tax", "5.0000", "Electronic communications services"));

  private final TaxRateRepository taxes;

  public TaxRateService(TaxRateRepository taxes) {
    this.taxes = taxes;
  }

  @Transactional
  public List<TaxRate> listOrSeedGhanaDefaults(UUID tenantId) {
    List<TaxRate> rows = taxes.findByTenantIdOrderByEffectiveFromDesc(tenantId);
    return rows.isEmpty() ? resetToGhanaDefaults(tenantId) : rows;
  }

  @Transactional
  public List<TaxRate> resetToGhanaDefaults(UUID tenantId) {
    taxes.deleteAll(taxes.findByTenantIdOrderByEffectiveFromDesc(tenantId));
    GHANA_DEFAULTS.forEach(defaultTax -> taxes.save(toRate(tenantId, defaultTax)));
    return taxes.findByTenantIdOrderByEffectiveFromDesc(tenantId);
  }

  @Transactional
  public BigDecimal defaultEstimateTaxRate(UUID tenantId) {
    List<TaxRate> active = listOrSeedGhanaDefaults(tenantId).stream()
        .filter(TaxRate::isActive)
        .toList();
    return active.stream()
        .filter(tax -> "vat".equals(tax.getName().toLowerCase(Locale.ROOT)))
        .findFirst()
        .or(() -> active.stream().findFirst())
        .map(TaxRate::getRate)
        .orElse(BigDecimal.ZERO);
  }

  private TaxRate toRate(UUID tenantId, DefaultTax defaultTax) {
    TaxRate rate = new TaxRate();
    rate.setTenantId(tenantId);
    rate.setName(defaultTax.name());
    rate.setRate(new BigDecimal(defaultTax.rate()));
    rate.setAppliesTo(defaultTax.appliesTo());
    rate.setEffectiveFrom(GHANA_EFFECTIVE_FROM);
    rate.setActive(true);
    return rate;
  }

  private record DefaultTax(String name, String rate, String appliesTo) {}
}
