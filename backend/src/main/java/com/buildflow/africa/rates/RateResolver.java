package com.buildflow.africa.rates;

import com.buildflow.africa.materials.Material;
import com.buildflow.africa.materials.MaterialRepository;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Turns a line description into a rate, and says where the rate came from.
 *
 * The order is deliberate and runs from most specific to least:
 *
 * <ol>
 *   <li>the company's own price book, because a contractor's negotiated price beats any average;</li>
 *   <li>a price a named supplier quoted them, delivered where that is known;</li>
 *   <li>a reference price published for their region;</li>
 *   <li>a reference price published nationally.</li>
 * </ol>
 *
 * A description that matches nothing resolves to nothing. The caller is expected to show that line
 * unpriced rather than fill it with an average, because a visible gap costs a contractor far less
 * than a plausible wrong number.
 */
@Service
public class RateResolver {

  /** Words too common to identify a material on their own. */
  private static final Set<String> NOISE = Set.of(
      "and", "the", "for", "with", "per", "of", "to", "in", "on", "at", "supply", "install",
      "installed", "fix", "fixed", "laying", "lay", "works", "work", "including", "include", "mm",
      "size", "type", "grade", "quality", "standard", "new", "each", "no", "nos", "item", "items");

  private final MaterialRepository materials;
  private final SupplierItemRepository supplierItems;
  private final ReferencePriceRepository referencePrices;
  private final TenantRepository tenants;

  public RateResolver(MaterialRepository materials, SupplierItemRepository supplierItems,
                      ReferencePriceRepository referencePrices, TenantRepository tenants) {
    this.materials = materials;
    this.supplierItems = supplierItems;
    this.referencePrices = referencePrices;
    this.tenants = tenants;
  }

  /**
   * Where a rate came from. `PRICE_BOOK` and `SUPPLIER` are the company's own figures; the two
   * reference origins are published data and are shown to the user as such.
   */
  public enum Origin { PRICE_BOOK, SUPPLIER, REGIONAL_REFERENCE, NATIONAL_REFERENCE, NONE }

  /**
   * @param rate      null when nothing matched, which the caller must render as an unpriced line
   * @param confidence 0 to 1, from how much of the description the match accounted for
   */
  public record Rate(
      BigDecimal rate, String unit, Origin origin, String source, LocalDate effectiveDate,
      Integer ageDays, UUID materialId, String matchedName, double confidence) {

    public static Rate none() {
      return new Rate(null, null, Origin.NONE, null, null, null, null, null, 0);
    }

    public boolean matched() {
      return rate != null;
    }

    /** A rate confirmed more than 60 days ago is old enough that a contractor should re-check it. */
    public boolean stale() {
      return ageDays != null && ageDays > 60;
    }
  }

  /** Everything a company can price from, loaded once and reused across a whole estimate. */
  public record Book(UUID tenantId, String region, List<Material> priceBook, List<SupplierItem> supplied) {}

  public Book bookFor(UUID tenantId) {
    String region = tenants.findById(tenantId).map(Tenant::getRegion).orElse(null);
    return new Book(tenantId, region,
        materials.findByTenantIdAndActiveTrueOrderByName(tenantId),
        supplierItems.findByTenantIdOrderByEffectiveDateDesc(tenantId));
  }

  public Rate resolve(Book book, String description) {
    if (description == null || description.isBlank()) {
      return Rate.none();
    }
    Set<String> wanted = tokens(description);
    if (wanted.isEmpty()) {
      return Rate.none();
    }

    Optional<Rate> own = bestMaterial(book, wanted);
    if (own.isPresent()) {
      return own.get();
    }
    Optional<Rate> supplied = bestSupplied(book, wanted);
    if (supplied.isPresent()) {
      return supplied.get();
    }
    return reference(description, wanted, book.region());
  }

  private Optional<Rate> bestMaterial(Book book, Set<String> wanted) {
    Material best = null;
    double bestScore = 0;
    for (Material material : book.priceBook()) {
      double score = score(wanted, tokens(material.getName() + " " + orEmpty(material.getBrand())));
      if (score > bestScore) {
        bestScore = score;
        best = material;
      }
    }
    if (best == null || bestScore < 0.5 || best.getPurchasePrice() == null
        || best.getPurchasePrice().signum() <= 0) {
      return Optional.empty();
    }
    return Optional.of(new Rate(best.getPurchasePrice(), best.getUnit(), Origin.PRICE_BOOK,
        "Your price book", best.getEffectiveDate(), age(best.getEffectiveDate()), best.getId(),
        best.getName(), bestScore));
  }

  private Optional<Rate> bestSupplied(Book book, Set<String> wanted) {
    SupplierItem best = null;
    double bestScore = 0;
    for (SupplierItem item : book.supplied()) {
      double score = score(wanted, tokens(item.getDescription()));
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best == null || bestScore < 0.5 || best.landedPrice().signum() <= 0) {
      return Optional.empty();
    }
    return Optional.of(new Rate(best.landedPrice(), best.getUnit(), Origin.SUPPLIER,
        "Supplier quotation", best.getEffectiveDate(), age(best.getEffectiveDate()),
        best.getMaterialId(), best.getDescription(), bestScore));
  }

  /** Published data. Only reached when the company has no figure of its own for the line. */
  private Rate reference(String description, Set<String> wanted, String region) {
    String needle = wanted.stream().max((a, b) -> a.length() - b.length()).orElse(description);
    List<ReferencePrice> candidates = referencePrices.candidates(needle, "Ghana", region);

    ReferencePrice best = null;
    double bestScore = 0;
    for (ReferencePrice candidate : candidates) {
      double score = score(wanted, tokens(candidate.getMaterialName() + " " + orEmpty(candidate.getBrand())));
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (best == null || bestScore < 0.5 || best.getPrice().signum() <= 0) {
      return Rate.none();
    }

    boolean regional = region != null && region.equalsIgnoreCase(orEmpty(best.getRegion()));
    return new Rate(best.getPrice(), best.getUnit(),
        regional ? Origin.REGIONAL_REFERENCE : Origin.NATIONAL_REFERENCE,
        best.getSource(), best.getEffectiveDate(), age(best.getEffectiveDate()), null,
        best.getMaterialName(), bestScore);
  }

  /**
   * How much of the wanted description the candidate accounts for. Scoring against the wanted side
   * means a short catalogue entry can still match a long bill description, while a candidate that
   * only shares a stop word cannot.
   */
  private double score(Set<String> wanted, Set<String> candidate) {
    if (wanted.isEmpty() || candidate.isEmpty()) {
      return 0;
    }
    long hits = wanted.stream().filter(word -> candidate.stream()
        .anyMatch(other -> other.equals(word) || (word.length() > 4 && other.startsWith(word))
            || (other.length() > 4 && word.startsWith(other)))).count();
    return (double) hits / wanted.size();
  }

  private Set<String> tokens(String text) {
    return java.util.Arrays.stream(text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+"))
        .filter(word -> word.length() > 1 && !NOISE.contains(word))
        .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
  }

  private Integer age(LocalDate date) {
    return date == null ? null : (int) ChronoUnit.DAYS.between(date, LocalDate.now());
  }

  private String orEmpty(String value) {
    return value == null ? "" : value;
  }
}
