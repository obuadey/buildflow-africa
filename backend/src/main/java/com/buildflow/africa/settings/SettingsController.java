package com.buildflow.africa.settings;

import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.membership.TenantAccessService;


import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Company profile, estimating defaults, document branding and tax rates. */
@RestController
@RequestMapping("/api/v1/settings")
public class SettingsController {

  private static final List<String> ADMIN_ROLES = List.of("OWNER", "ADMIN");

  private final TenantRepository tenants;
  private final TenantSettingsRepository settings;
  private final TaxRateRepository taxes;
  private final TaxRateService taxRateService;
  private final DocumentNumberingRepository numbering;
  private final TenantAccessService access;
  private final ObjectMapper mapper = new ObjectMapper();

  public SettingsController(TenantRepository tenants, TenantSettingsRepository settings,
                            TaxRateRepository taxes, TaxRateService taxRateService,
                            DocumentNumberingRepository numbering, TenantAccessService access) {
    this.tenants = tenants;
    this.settings = settings;
    this.taxes = taxes;
    this.taxRateService = taxRateService;
    this.numbering = numbering;
    this.access = access;
  }

  @GetMapping
  public SettingsView get() {
    UUID tenantId = TenantContext.getRequired();
    Tenant tenant = tenants.findById(tenantId).orElseThrow();
    TenantSettings row = settings.findById(tenantId).orElseGet(() -> {
      TenantSettings created = new TenantSettings();
      created.setTenantId(tenantId);
      return settings.save(created);
    });
    return SettingsView.from(tenant, row, taxRateService.listOrSeedGhanaDefaults(tenantId),
        loadNumbering(tenantId), readNotifications(row.getNotificationPrefs()));
  }

  @PatchMapping
  @Transactional
  public SettingsView update(@RequestBody SettingsRequest request,
                             @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    Tenant tenant = tenants.findById(tenantId).orElseThrow();

    if (request.company() != null) {
      CompanyRequest company = request.company();
      if (company.name() != null) tenant.setName(company.name());
      if (company.phone() != null) tenant.setPhone(company.phone());
      if (company.email() != null) tenant.setEmail(company.email());
      if (company.address() != null) tenant.setAddress(company.address());
      if (company.region() != null) tenant.setRegion(company.region());
      if (company.city() != null) tenant.setCity(company.city());
      if (company.website() != null) tenant.setWebsite(company.website());
      if (company.tin() != null) tenant.setTin(company.tin());
      if (company.vatRegistered() != null) tenant.setVatRegistered(company.vatRegistered());
    }
    if (request.defaults() != null) {
      DefaultsRequest defaults = request.defaults();
      if (defaults.currency() != null) tenant.setDefaultCurrency(defaults.currency());
      if (defaults.markup() != null) tenant.setDefaultMarkup(defaults.markup());
      if (defaults.overhead() != null) tenant.setDefaultOverhead(defaults.overhead());
      if (defaults.profit() != null) tenant.setDefaultProfitMargin(defaults.profit());
      if (defaults.validityDays() != null) tenant.setEstimateValidityDays(defaults.validityDays());
      if (defaults.paymentTerms() != null) tenant.setPaymentTerms(defaults.paymentTerms());
    }
    tenants.save(tenant);

    TenantSettings row = settings.findById(tenantId).orElseGet(() -> {
      TenantSettings created = new TenantSettings();
      created.setTenantId(tenantId);
      return created;
    });
    if (request.branding() != null) {
      BrandingRequest branding = request.branding();
      if (branding.introduction() != null) row.setIntroduction(branding.introduction());
      if (branding.exclusions() != null) row.setExclusions(branding.exclusions());
      if (branding.footer() != null) row.setFooterText(branding.footer());
      if (branding.bank() != null) row.setBankDetails(branding.bank());
      if (branding.momo() != null) row.setMomoDetails(branding.momo());
      if (branding.logo() != null) tenant.setLogoKey(branding.logo());
      if (branding.accent() != null) {
        tenant.setAccentColor(branding.accent());
        tenants.save(tenant);
      }
    }
    if (request.notifications() != null) {
      row.setNotificationPrefs(writeJson(request.notifications()));
    }
    if (request.security() != null) {
      SecurityRequest security = request.security();
      if (security.mfaRequired() != null) row.setMfaRequired(security.mfaRequired());
      if (security.ipRestrictionEnabled() != null) row.setIpRestrictionEnabled(security.ipRestrictionEnabled());
      if (security.allowedIpRanges() != null) row.setAllowedIpRanges(security.allowedIpRanges());
    }
    row.setUpdatedAt(Instant.now());
    settings.save(row);

    if (request.numbering() != null) {
      saveNumbering(tenantId, request.numbering());
    }

    if (request.taxes() != null) {
      taxes.deleteAll(taxes.findByTenantIdOrderByEffectiveFromDesc(tenantId));
      for (TaxRequest tax : request.taxes()) {
        TaxRate rate = new TaxRate();
        rate.setTenantId(tenantId);
        rate.setName(tax.name());
        rate.setRate(tax.rate() == null ? BigDecimal.ZERO : tax.rate());
        rate.setAppliesTo(tax.appliesTo());
        if (tax.effectiveFrom() != null) rate.setEffectiveFrom(tax.effectiveFrom());
        if (tax.active() != null) rate.setActive(tax.active());
        taxes.save(rate);
      }
    }

    return get();
  }

  /** Plan change. Recorded on the tenant and reflected on the next billing run. */
  @PostMapping("/plan")
  public SettingsView changePlan(@RequestBody PlanRequest request,
                                 @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    if (request.plan() == null || !List.of("Starter", "Business", "Enterprise").contains(request.plan())) {
      throw new IllegalArgumentException("That plan is not available.");
    }
    Tenant tenant = tenants.findById(tenantId).orElseThrow();
    tenant.setPlan(request.plan());
    tenants.save(tenant);
    return get();
  }

  public record PlanRequest(String plan) {}

  public record CompanyRequest(String name, String phone, String email, String address, String region,
                               String city, String website, String tin, Boolean vatRegistered) {}
  public record DefaultsRequest(String currency, BigDecimal markup, BigDecimal overhead, BigDecimal profit,
                                Integer validityDays, String paymentTerms) {}
  public record BrandingRequest(String accent, String footer, String introduction, String exclusions,
                                String bank, String momo, String logo) {}
  public record TaxRequest(String name, BigDecimal rate, String appliesTo, LocalDate effectiveFrom,
                           Boolean active) {}
  public record SecurityRequest(Boolean mfaRequired, Boolean ipRestrictionEnabled, String allowedIpRanges) {}
  public record SettingsRequest(CompanyRequest company, DefaultsRequest defaults, BrandingRequest branding,
                                List<TaxRequest> taxes, Map<String, Boolean> notifications,
                                Map<String, String> numbering, SecurityRequest security) {}

  public record CompanyView(String name, String slug, String phone, String email, String address,
                            String region, String city, String website, String tin, boolean vatRegistered) {}
  public record DefaultsView(String currency, BigDecimal markup, BigDecimal overhead, BigDecimal profit,
                             Integer validityDays, String paymentTerms) {}
  public record BrandingView(String accent, String footer, String introduction, String exclusions,
                             String bank, String momo, String logo) {}
  public record TaxView(UUID id, String name, BigDecimal rate, String appliesTo, LocalDate effectiveFrom,
                        boolean active, Instant createdAt, Instant updatedAt) {}
  public record SecurityView(boolean mfaRequired, boolean ipRestrictionEnabled, String allowedIpRanges) {}
  public record SettingsView(CompanyView company, DefaultsView defaults, BrandingView branding,
                             List<TaxView> taxes, Map<String, String> numbering,
                             Map<String, Boolean> notifications, SecurityView security) {

    static SettingsView from(Tenant tenant, TenantSettings row, List<TaxRate> taxes,
                             Map<String, String> numbering, Map<String, Boolean> notifications) {
      return new SettingsView(
          new CompanyView(tenant.getName(), tenant.getSlug(), tenant.getPhone(), tenant.getEmail(),
              tenant.getAddress(), tenant.getRegion(), tenant.getCity(), tenant.getWebsite(),
              tenant.getTin(), tenant.isVatRegistered()),
          new DefaultsView(tenant.getDefaultCurrency(), tenant.getDefaultMarkup(), tenant.getDefaultOverhead(),
              tenant.getDefaultProfitMargin(), tenant.getEstimateValidityDays(), tenant.getPaymentTerms()),
          new BrandingView(tenant.getAccentColor(), row.getFooterText(), row.getIntroduction(),
              row.getExclusions(), row.getBankDetails(), row.getMomoDetails(), tenant.getLogoKey()),
          taxes.stream().map(tax -> new TaxView(tax.getId(), tax.getName(), tax.getRate(),
              tax.getAppliesTo(), tax.getEffectiveFrom(), tax.isActive(), tax.getCreatedAt(),
              tax.getUpdatedAt() == null ? tax.getCreatedAt() : tax.getUpdatedAt())).toList(),
          numbering,
          notifications,
          new SecurityView(row.isMfaRequired(), row.isIpRestrictionEnabled(), row.getAllowedIpRanges()));
    }
  }

  private Map<String, String> loadNumbering(UUID tenantId) {
    Map<String, String> values = new HashMap<>(defaultNumbering());
    for (DocumentNumbering row : numbering.findByTenantId(tenantId)) {
      values.put(row.getDocumentType(), row.getPattern());
    }
    return values;
  }

  private void saveNumbering(UUID tenantId, Map<String, String> values) {
    Map<String, String> allowed = defaultNumbering();
    values.forEach((type, pattern) -> {
      if (!allowed.containsKey(type) || pattern == null || pattern.isBlank()) return;
      DocumentNumbering row = numbering.findByTenantIdAndDocumentType(tenantId, type)
          .orElseGet(() -> {
            DocumentNumbering created = new DocumentNumbering();
            created.setTenantId(tenantId);
            created.setDocumentType(type);
            return created;
          });
      row.setPattern(pattern.trim());
      numbering.save(row);
    });
  }

  private Map<String, String> defaultNumbering() {
    return Map.of(
        "project", "PRJ-{YYYY}-{0000}",
        "estimate", "EST-{YYYY}-{0000}",
        "quotation", "QUO-{YYYY}-{0000}",
        "invoice", "INV-{YYYY}-{0000}",
        "variation", "VAR-{YYYY}-{0000}");
  }

  private Map<String, Boolean> readNotifications(String raw) {
    if (raw == null || raw.isBlank()) return new HashMap<>();
    try {
      return mapper.readValue(raw, new TypeReference<>() {});
    } catch (Exception ex) {
      return new HashMap<>();
    }
  }

  private String writeJson(Map<String, Boolean> values) {
    try {
      return mapper.writeValueAsString(values == null ? Map.of() : values);
    } catch (Exception ex) {
      throw new IllegalArgumentException("Notification settings could not be stored.");
    }
  }
}
