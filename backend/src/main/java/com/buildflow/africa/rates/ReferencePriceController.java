package com.buildflow.africa.rates;

import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.platform.PlatformSecurity;


import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * The shared reference price library.
 *
 * Reading is open to every signed-in company: that is the point of the library. Writing is limited
 * to a platform operator, because a figure loaded here is visible to every contractor on the
 * platform and must be traceable to a named source.
 */
@RestController
@RequestMapping("/api/v1/reference-prices")
public class ReferencePriceController {

  private static final List<String> SEARCHABLE = List.of("materialName", "brand", "category", "source");
  private static final Map<String, String> FILTERS = Map.of(
      "country", "country", "region", "region", "category", "category", "unit", "unit",
      "source", "source");

  private final ReferencePriceRepository prices;
  private final ReferencePriceImportRepository imports;
  private final RateResolver resolver;
  private final RateRefreshService refresh;
  private final com.buildflow.africa.tenant.TenantRepository tenants;
  private final PlatformSecurity platform;

  public ReferencePriceController(ReferencePriceRepository prices,
                                  ReferencePriceImportRepository imports,
                                  RateResolver resolver, RateRefreshService refresh,
                                  com.buildflow.africa.tenant.TenantRepository tenants,
                                  PlatformSecurity platform) {
    this.prices = prices;
    this.imports = imports;
    this.resolver = resolver;
    this.refresh = refresh;
    this.tenants = tenants;
    this.platform = platform;
  }

  /** What this company's rates look like against the library, and whether refresh is on. */
  @GetMapping("/status")
  public Status status() {
    UUID tenantId = TenantContext.getRequired();
    var tenant = tenants.findById(tenantId).orElseThrow();
    return new Status(tenant.isAutoUpdateRates(), tenant.getRatesUpdatedAt(),
        refresh.staleCount(tenantId), prices.countByCountry("Ghana"));
  }

  /**
   * Turns automatic refresh on or off for this company. Off means the library is still
   * readable and still used to fill gaps, but nothing rewrites a stored rate.
   */
  @PatchMapping("/status")
  public Status setAutoUpdate(@RequestBody Map<String, Boolean> body) {
    UUID tenantId = TenantContext.getRequired();
    var tenant = tenants.findById(tenantId).orElseThrow();
    tenant.setAutoUpdateRates(Boolean.TRUE.equals(body.get("autoUpdateRates")));
    tenants.save(tenant);
    return status();
  }

  /** Runs the refresh now for this company, whatever the schedule says. */
  @PostMapping("/refresh")
  public RateRefreshService.Result refreshNow(@AuthenticationPrincipal AuthPrincipal principal) {
    return refresh.refresh(TenantContext.getRequired(),
        "Requested by " + (principal == null ? "an owner" : principal.email()));
  }

  @GetMapping
  public PageResponse<PriceView> list(@RequestParam Map<String, String> params) {
    Page<ReferencePrice> page = prices.findAll(
        (root, query, cb) -> {
          List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
          String q = params.get("q");
          if (q != null && !q.isBlank()) {
            String needle = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            predicates.add(cb.or(
                SEARCHABLE.stream()
                    .map(field -> cb.like(cb.lower(root.get(field).as(String.class)), needle))
                    .toArray(jakarta.persistence.criteria.Predicate[]::new)));
          }
          FILTERS.forEach((param, field) -> {
            String value = params.get(param);
            if (value != null && !value.isBlank()) {
              predicates.add(root.get(field).in(
                  Arrays.stream(value.split(",")).map(String::trim).filter(v -> !v.isEmpty()).toList()));
            }
          });
          return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        },
        ListQuery.pageable(params, "effectiveDate"));
    return PageResponse.of(page, PriceView::from);
  }

  /**
   * What this company would actually pay for a line, and where that figure came from. The estimate
   * builder and Quick Estimate both price through this, so they can never disagree.
   */
  @GetMapping("/resolve")
  public Resolved resolve(@RequestParam("description") String description) {
    RateResolver.Book book = resolver.bookFor(TenantContext.getRequired());
    return Resolved.from(description, resolver.resolve(book, description));
  }

  @GetMapping("/imports")
  public List<ImportView> importHistory() {
    return imports.findTop20ByOrderByCreatedAtDesc().stream().map(ImportView::from).toList();
  }

  /**
   * Loads a rate file into the library.
   *
   * The header must name the columns; order does not matter. `material` and `unit` and `price` are
   * required, and a row missing any of them is rejected and counted rather than guessed at. Every
   * row inherits the source and effective date of the import, so no figure in the library is ever
   * anonymous.
   */
  @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Transactional
  public ImportView importCsv(@RequestPart("file") MultipartFile file,
                              @RequestParam("source") String source,
                              @RequestParam(name = "country", defaultValue = "Ghana") String country,
                              @RequestParam(name = "region", required = false) String region,
                              @RequestParam(name = "effectiveDate", required = false) String effectiveDate,
                              @RequestParam(name = "notes", required = false) String notes,
                              @AuthenticationPrincipal AuthPrincipal principal) throws IOException {
    platform.requireWrite(principal);

    ReferencePriceImport record = new ReferencePriceImport();
    record.setSource(source);
    record.setFileName(file.getOriginalFilename());
    record.setCountry(country);
    record.setRegion(region);
    record.setEffectiveDate(effectiveDate == null || effectiveDate.isBlank()
        ? LocalDate.now() : LocalDate.parse(effectiveDate));
    record.setImportedBy(principal == null ? null : principal.email());
    record.setNotes(notes);
    ReferencePriceImport saved = imports.save(record);

    int loaded = 0;
    int rejected = 0;
    List<ReferencePrice> batch = new ArrayList<>();

    try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
      String headerLine = reader.readLine();
      if (headerLine == null) {
        throw new IllegalArgumentException("That file is empty.");
      }
      List<String> header = Arrays.stream(split(headerLine))
          .map(cell -> cell.trim().toLowerCase(Locale.ROOT)).toList();
      int material = indexOf(header, "material", "description", "item", "name");
      int unit = indexOf(header, "unit", "uom");
      int price = indexOf(header, "price", "rate", "amount", "cost");
      int brand = indexOf(header, "brand", "make");
      int category = indexOf(header, "category", "trade", "section");
      int cityColumn = indexOf(header, "city", "town");
      int regionColumn = indexOf(header, "region");

      if (material < 0 || unit < 0 || price < 0) {
        throw new IllegalArgumentException(
            "The file needs at least a material, a unit and a price column. Found: "
                + String.join(", ", header));
      }

      String line;
      while ((line = reader.readLine()) != null) {
        if (line.isBlank()) {
          continue;
        }
        String[] cells = split(line);
        String name = cell(cells, material);
        BigDecimal value = money(cell(cells, price));
        String uom = cell(cells, unit);
        if (name.isBlank() || uom.isBlank() || value == null || value.signum() <= 0) {
          rejected++;
          continue;
        }
        ReferencePrice row = new ReferencePrice();
        row.setCountry(country);
        row.setRegion(regionColumn >= 0 && !cell(cells, regionColumn).isBlank()
            ? cell(cells, regionColumn) : region);
        row.setCity(cityColumn >= 0 ? emptyToNull(cell(cells, cityColumn)) : null);
        row.setCategory(category >= 0 ? emptyToNull(cell(cells, category)) : null);
        row.setMaterialName(name);
        row.setBrand(brand >= 0 ? emptyToNull(cell(cells, brand)) : null);
        row.setUnit(uom);
        row.setPrice(value);
        row.setSource(source);
        row.setEffectiveDate(saved.getEffectiveDate());
        row.setImportId(saved.getId());
        batch.add(row);
        loaded++;
      }
    }

    prices.saveAll(batch);
    saved.setRowsImported(loaded);
    saved.setRowsRejected(rejected);
    return ImportView.from(imports.save(saved));
  }

  /** Withdraws one load. Used when a file turns out to be wrong; the rates go with it. */
  @DeleteMapping("/imports/{id}")
  @Transactional
  public Map<String, Object> revert(@PathVariable("id") UUID id,
                                    @AuthenticationPrincipal AuthPrincipal principal) {
    platform.requireWrite(principal);
    List<ReferencePrice> loaded = prices.findByImportId(id);
    prices.deleteAll(loaded);
    imports.deleteById(id);
    return Map.of("removed", loaded.size());
  }

  private static String[] split(String line) {
    // Splits on commas outside quotes, which is all a rate file needs.
    List<String> cells = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    boolean quoted = false;
    for (char character : line.toCharArray()) {
      if (character == '"') {
        quoted = !quoted;
      } else if (character == ',' && !quoted) {
        cells.add(current.toString());
        current.setLength(0);
      } else {
        current.append(character);
      }
    }
    cells.add(current.toString());
    return cells.toArray(String[]::new);
  }

  private static int indexOf(List<String> header, String... names) {
    for (String name : names) {
      int index = header.indexOf(name);
      if (index >= 0) {
        return index;
      }
    }
    return -1;
  }

  private static String cell(String[] cells, int index) {
    return index >= 0 && index < cells.length ? cells[index].trim() : "";
  }

  private static String emptyToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private static BigDecimal money(String value) {
    try {
      String cleaned = value.replaceAll("[^0-9.\\-]", "");
      return cleaned.isBlank() ? null : new BigDecimal(cleaned);
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  public record PriceView(UUID id, String country, String region, String city, String category,
                          String material, String brand, String unit, BigDecimal price,
                          String source, LocalDate effectiveDate, Integer ageDays) {
    static PriceView from(ReferencePrice price) {
      Integer age = price.getEffectiveDate() == null ? null
          : (int) java.time.temporal.ChronoUnit.DAYS.between(price.getEffectiveDate(), LocalDate.now());
      return new PriceView(price.getId(), price.getCountry(), price.getRegion(), price.getCity(),
          price.getCategory(), price.getMaterialName(), price.getBrand(), price.getUnit(),
          price.getPrice(), price.getSource(), price.getEffectiveDate(), age);
    }
  }

  public record ImportView(UUID id, String source, String fileName, String country, String region,
                           LocalDate effectiveDate, int rowsImported, int rowsRejected,
                           String importedBy, String notes, java.time.Instant createdAt) {
    static ImportView from(ReferencePriceImport record) {
      return new ImportView(record.getId(), record.getSource(), record.getFileName(),
          record.getCountry(), record.getRegion(), record.getEffectiveDate(),
          record.getRowsImported(), record.getRowsRejected(), record.getImportedBy(),
          record.getNotes(), record.getCreatedAt());
    }
  }

  public record Resolved(String description, boolean matched, BigDecimal rate, String unit,
                         String origin, String source, LocalDate effectiveDate, Integer ageDays,
                         boolean stale, String matchedName, double confidence) {
    static Resolved from(String description, RateResolver.Rate rate) {
      return new Resolved(description, rate.matched(), rate.rate(), rate.unit(),
          rate.origin().name(), rate.source(), rate.effectiveDate(), rate.ageDays(), rate.stale(),
          rate.matchedName(), Math.round(rate.confidence() * 100) / 100.0);
    }
  }

  public record Status(boolean autoUpdateRates, java.time.Instant ratesUpdatedAt,
                       long staleRates, long referenceRates) {}
}
