package com.buildflow.africa.platform;

import com.buildflow.africa.audit.AuditService;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.rates.ReferenceAssemblyRepository;
import com.buildflow.africa.rates.ReferencePrice;
import com.buildflow.africa.rates.ReferencePriceImportRepository;
import com.buildflow.africa.rates.ReferencePriceRepository;
import com.buildflow.africa.rates.ReferenceTemplateRepository;
import com.buildflow.africa.users.User;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * The shared cost library, from the operator's side.
 *
 * Every company on the platform reads these rates, which is exactly why editing them belongs here
 * and not in a company's own settings. A figure changed on this page moves what every contractor
 * without their own price for that item sees, so each write is recorded in the platform audit
 * trail with the figure it replaced.
 *
 * The console reaches the API through a proxy that prefixes /platform, so these routes live under
 * that prefix rather than alongside the tenant-facing library in
 * {@link com.buildflow.africa.rates.ReferencePriceController}. The reading side of that controller
 * stays where it is: a contractor needs to see the library, and needs no operator role to do it.
 */
@RestController
@RequestMapping("/api/v1/platform")
public class PlatformCatalogController {

  private static final String COUNTRY = "Ghana";

  private final PlatformSecurity security;
  private final ReferencePriceRepository prices;
  private final ReferencePriceImportRepository imports;
  private final ReferenceTemplateRepository templates;
  private final ReferenceAssemblyRepository assemblies;
  private final AuditService audit;

  public PlatformCatalogController(PlatformSecurity security, ReferencePriceRepository prices,
                                   ReferencePriceImportRepository imports,
                                   ReferenceTemplateRepository templates,
                                   ReferenceAssemblyRepository assemblies, AuditService audit) {
    this.security = security;
    this.prices = prices;
    this.imports = imports;
    this.templates = templates;
    this.assemblies = assemblies;
    this.audit = audit;
  }

  /* ---------------------------------------------------------------- the library at a glance */

  /**
   * What the library actually holds. The counts are split national against regional because that
   * split is the one an operator needs: a trade with a national rate and no regional rows prices
   * every company off an Accra figure, and that is worth being able to see.
   */
  @GetMapping("/library")
  public LibrarySummary library(@AuthenticationPrincipal AuthPrincipal principal) {
    security.require(principal);
    List<ReferencePrice> all = prices.findAll();

    List<CategoryCount> categories = all.stream()
        .collect(java.util.stream.Collectors.groupingBy(
            price -> price.getCategory() == null ? "Uncategorised" : price.getCategory(),
            java.util.stream.Collectors.toList()))
        .entrySet().stream()
        .map(entry -> new CategoryCount(entry.getKey(), entry.getValue().size(),
            entry.getValue().stream().filter(price -> price.getRegion() == null).count()))
        .sorted(Comparator.comparing(CategoryCount::category))
        .toList();

    List<RegionCount> regions = all.stream()
        .filter(price -> price.getRegion() != null)
        .collect(java.util.stream.Collectors.groupingBy(ReferencePrice::getRegion,
            java.util.stream.Collectors.counting()))
        .entrySet().stream()
        .map(entry -> new RegionCount(entry.getKey(), entry.getValue()))
        .sorted(Comparator.comparing(RegionCount::region))
        .toList();

    LocalDate newest = all.stream().map(ReferencePrice::getEffectiveDate)
        .filter(java.util.Objects::nonNull).max(LocalDate::compareTo).orElse(null);
    LocalDate oldest = all.stream().map(ReferencePrice::getEffectiveDate)
        .filter(java.util.Objects::nonNull).min(LocalDate::compareTo).orElse(null);

    return new LibrarySummary(
        all.size(),
        all.stream().filter(price -> price.getRegion() == null).count(),
        all.stream().filter(price -> price.getRegion() != null).count(),
        all.stream().filter(price -> price.getImportId() != null).count(),
        templates.findByCountryOrderBySortOrderAsc(COUNTRY).size(),
        assemblies.findByCountryOrderBySortOrderAsc(COUNTRY).size(),
        imports.findTop20ByOrderByCreatedAtDesc().size(),
        newest, oldest, categories, regions);
  }

  /* ------------------------------------------------------------------------------- the rates */

  @GetMapping("/prices")
  public PageResponse<PriceView> list(@AuthenticationPrincipal AuthPrincipal principal,
                                      @RequestParam Map<String, String> params) {
    security.require(principal);
    String q = params.getOrDefault("q", "").trim().toLowerCase(Locale.ROOT);
    String category = params.get("category");
    String region = params.get("region");

    Specification<ReferencePrice> spec = (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (!q.isEmpty()) {
        String needle = "%" + q + "%";
        predicates.add(cb.or(
            cb.like(cb.lower(root.get("materialName").as(String.class)), needle),
            cb.like(cb.lower(root.get("brand").as(String.class)), needle),
            cb.like(cb.lower(root.get("category").as(String.class)), needle),
            cb.like(cb.lower(root.get("source").as(String.class)), needle)));
      }
      if (category != null && !category.isBlank()) {
        predicates.add(cb.equal(root.get("category"), category));
      }
      // "national" is a filter on its own, because the absence of a region is the thing an
      // operator most often wants to look at.
      if ("national".equalsIgnoreCase(region)) {
        predicates.add(cb.isNull(root.get("region")));
      } else if (region != null && !region.isBlank()) {
        predicates.add(cb.equal(root.get("region"), region));
      }
      return cb.and(predicates.toArray(Predicate[]::new));
    };

    int page = Math.max(1, parseInt(params.get("page"), 1));
    int size = Math.min(200, Math.max(1, parseInt(params.get("size"), 50)));
    Page<ReferencePrice> result = prices.findAll(spec, PageRequest.of(page - 1, size,
        Sort.by(Sort.Direction.ASC, "category", "materialName", "region")));
    return PageResponse.of(result, PriceView::from);
  }

  @PostMapping("/prices")
  @Transactional
  public PriceView create(@AuthenticationPrincipal AuthPrincipal principal,
                          @Valid @RequestBody PriceRequest request) {
    User operator = security.requireWrite(principal);
    ReferencePrice price = new ReferencePrice();
    apply(price, request);
    // A rate an operator typed is attributable to that operator, and says so rather than
    // borrowing the wording the seeded baselines use.
    price.setSource(blank(request.source()) ? "Entered by " + operator.getEmail() : request.source());
    ReferencePrice saved = prices.save(price);
    audit.recordPlatform("REFERENCE_PRICE_CREATED", "reference_price", saved.getId(), null,
        describe(saved), operator.getEmail(), operator.getId(), null);
    return PriceView.from(saved);
  }

  @PatchMapping("/prices/{id}")
  @Transactional
  public PriceView update(@AuthenticationPrincipal AuthPrincipal principal,
                          @PathVariable("id") UUID id, @RequestBody PriceRequest request) {
    User operator = security.requireWrite(principal);
    ReferencePrice price = prices.findById(id)
        .orElseThrow(() -> new NotFoundException("PRICE_NOT_FOUND", "That reference rate does not exist."));
    Map<String, Object> before = describe(price);
    if (!blank(request.materialName())) price.setMaterialName(request.materialName());
    if (!blank(request.unit())) price.setUnit(request.unit());
    if (request.price() != null) {
      if (request.price().signum() <= 0) {
        throw new IllegalArgumentException("A reference rate must be greater than zero.");
      }
      price.setPrice(request.price());
    }
    if (request.category() != null) price.setCategory(emptyToNull(request.category()));
    if (request.brand() != null) price.setBrand(emptyToNull(request.brand()));
    if (request.region() != null) price.setRegion(emptyToNull(request.region()));
    if (request.city() != null) price.setCity(emptyToNull(request.city()));
    if (!blank(request.source())) price.setSource(request.source());
    if (request.effectiveDate() != null) price.setEffectiveDate(request.effectiveDate());
    ReferencePrice saved = prices.save(price);
    audit.recordPlatform("REFERENCE_PRICE_UPDATED", "reference_price", id, before, describe(saved),
        operator.getEmail(), operator.getId(), null);
    return PriceView.from(saved);
  }

  /**
   * Removes one rate. The audit entry keeps the figure that was removed, so a rate deleted by
   * mistake can be put back as it was rather than re-guessed.
   */
  @DeleteMapping("/prices/{id}")
  @Transactional
  public Map<String, String> delete(@AuthenticationPrincipal AuthPrincipal principal,
                                    @PathVariable("id") UUID id) {
    User operator = security.requireWrite(principal);
    ReferencePrice price = prices.findById(id)
        .orElseThrow(() -> new NotFoundException("PRICE_NOT_FOUND", "That reference rate does not exist."));
    Map<String, Object> before = describe(price);
    prices.delete(price);
    audit.recordPlatform("REFERENCE_PRICE_DELETED", "reference_price", id, before, null,
        operator.getEmail(), operator.getId(), null);
    return Map.of("message", "That rate has been removed from the shared library.");
  }

  /* -------------------------------------------------------------------------------- helpers */

  private void apply(ReferencePrice price, PriceRequest request) {
    if (request.price() == null || request.price().signum() <= 0) {
      throw new IllegalArgumentException("A reference rate must be greater than zero.");
    }
    price.setCountry(blank(request.country()) ? COUNTRY : request.country());
    price.setMaterialName(request.materialName());
    price.setUnit(request.unit());
    price.setPrice(request.price());
    price.setCategory(emptyToNull(request.category()));
    price.setBrand(emptyToNull(request.brand()));
    price.setRegion(emptyToNull(request.region()));
    price.setCity(emptyToNull(request.city()));
    price.setEffectiveDate(request.effectiveDate() == null ? LocalDate.now() : request.effectiveDate());
  }

  private static Map<String, Object> describe(ReferencePrice price) {
    Map<String, Object> values = new java.util.LinkedHashMap<>();
    values.put("material", price.getMaterialName());
    values.put("unit", price.getUnit());
    values.put("price", price.getPrice());
    values.put("region", price.getRegion());
    values.put("category", price.getCategory());
    values.put("source", price.getSource());
    values.put("effectiveDate", String.valueOf(price.getEffectiveDate()));
    return values;
  }

  private static boolean blank(String value) {
    return value == null || value.isBlank();
  }

  private static String emptyToNull(String value) {
    return blank(value) ? null : value.trim();
  }

  private static int parseInt(String value, int fallback) {
    try {
      return value == null ? fallback : Integer.parseInt(value);
    } catch (NumberFormatException ex) {
      return fallback;
    }
  }

  /* ------------------------------------------------------------------ requests and responses */

  public record PriceRequest(@NotBlank String materialName, @NotBlank String unit,
                             @NotNull BigDecimal price, String category, String brand,
                             String country, String region, String city, String source,
                             LocalDate effectiveDate) {}

  public record CategoryCount(String category, int rates, long national) {}

  public record RegionCount(String region, long rates) {}

  public record LibrarySummary(long rates, long national, long regional, long imported,
                               int templates, int assemblies, int importBatches,
                               LocalDate newestRate, LocalDate oldestRate,
                               List<CategoryCount> categories, List<RegionCount> regions) {}

  public record PriceView(UUID id, String country, String region, String city, String category,
                          String material, String brand, String unit, BigDecimal price,
                          String source, LocalDate effectiveDate, Integer ageDays,
                          boolean fromImport) {
    static PriceView from(ReferencePrice price) {
      Integer age = price.getEffectiveDate() == null ? null
          : (int) java.time.temporal.ChronoUnit.DAYS.between(price.getEffectiveDate(), LocalDate.now());
      return new PriceView(price.getId(), price.getCountry(), price.getRegion(), price.getCity(),
          price.getCategory(), price.getMaterialName(), price.getBrand(), price.getUnit(),
          price.getPrice(), price.getSource(), price.getEffectiveDate(), age,
          price.getImportId() != null);
    }
  }
}
