package com.buildflow.africa.rates;

import com.buildflow.africa.materials.Material;
import com.buildflow.africa.materials.MaterialRepository;
import com.buildflow.africa.notifications.Notification;
import com.buildflow.africa.notifications.NotificationRepository;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps a company's rate library current against the shared reference prices.
 *
 * Two things this deliberately does not do. It does not touch a company that has not opted in: a
 * contractor's price book is their commercial position and is not rewritten behind their back. And
 * it never overwrites a figure without keeping the old one, so an estimate priced last quarter can
 * still be explained.
 *
 * A company that has not opted in still gets the staleness flags, which is the honest minimum:
 * we can tell them a rate is old without pretending to know the new one.
 */
@Service
public class RateRefreshService {

  private static final Logger log = LoggerFactory.getLogger(RateRefreshService.class);

  /** Only replace a rate when the reference figure is newer than what the company holds. */
  private static final int MIN_AGE_DAYS = 30;

  /** A move this large is more likely a unit mismatch than a real price change, so it is skipped. */
  private static final BigDecimal MAX_MOVE = new BigDecimal("0.60");

  private final TenantRepository tenants;
  private final MaterialRepository materials;
  private final MaterialPriceRepository history;
  private final ReferencePriceRepository referencePrices;
  private final NotificationRepository notifications;

  public RateRefreshService(TenantRepository tenants, MaterialRepository materials,
                            MaterialPriceRepository history,
                            ReferencePriceRepository referencePrices,
                            NotificationRepository notifications) {
    this.tenants = tenants;
    this.materials = materials;
    this.history = history;
    this.referencePrices = referencePrices;
    this.notifications = notifications;
  }

  /** Nightly, a little after midnight, so a refresh is waiting when the office opens. */
  @Scheduled(cron = "${rates.refresh-cron:0 20 1 * * *}")
  public void refreshAll() {
    if (referencePrices.countByCountry("Ghana") == 0) {
      log.info("Rate refresh skipped: the reference library is empty.");
      return;
    }
    for (Tenant tenant : tenants.findAll()) {
      if (!tenant.isAutoUpdateRates()) {
        continue;
      }
      try {
        Result result = refresh(tenant.getId(), "Scheduled refresh");
        log.info("Rate refresh for {}: {} updated, {} unchanged, {} without a reference",
            tenant.getSlug(), result.updated(), result.unchanged(), result.unmatched());
      } catch (RuntimeException ex) {
        // One company's data must never stop the rest of the run.
        log.warn("Rate refresh failed for {}: {}", tenant.getSlug(), ex.getMessage());
      }
    }
  }

  /**
   * Brings one company's rates up to date. Safe to call by hand, which is what the settings page
   * does when an owner asks for a refresh now.
   */
  @Transactional
  public Result refresh(UUID tenantId, String reason) {
    Tenant tenant = tenants.findById(tenantId).orElseThrow();
    String region = tenant.getRegion();
    List<Change> changes = new ArrayList<>();
    int unchanged = 0;
    int unmatched = 0;

    for (Material material : materials.findByTenantIdAndActiveTrueOrderByName(tenantId)) {
      if (material.getEffectiveDate() != null
          && material.getEffectiveDate().isAfter(LocalDate.now().minusDays(MIN_AGE_DAYS))) {
        unchanged++;
        continue;
      }
      ReferencePrice reference = bestReference(material, region);
      if (reference == null) {
        unmatched++;
        continue;
      }
      if (material.getEffectiveDate() != null
          && !reference.getEffectiveDate().isAfter(material.getEffectiveDate())) {
        unchanged++;
        continue;
      }
      BigDecimal current = material.getPurchasePrice();
      if (current == null || current.signum() <= 0 || moveTooLarge(current, reference.getPrice())) {
        unmatched++;
        continue;
      }
      changes.add(new Change(material, current, reference));
    }

    for (Change change : changes) {
      record(tenantId, change, reason);
      change.material().setPurchasePrice(change.reference().getPrice());
      change.material().setEffectiveDate(change.reference().getEffectiveDate());
      // Now that the library holds both regional and national figures, say which one was used.
      change.material().setPriceSource(
          region != null && region.equalsIgnoreCase(change.reference().getRegion())
              ? "REGIONAL" : "NATIONAL");
      materials.save(change.material());
    }

    tenant.setRatesUpdatedAt(Instant.now());
    tenants.save(tenant);

    if (!changes.isEmpty()) {
      notify(tenantId, changes);
    }
    return new Result(changes.size(), unchanged, unmatched);
  }

  /** How many of a company's rates are old enough to need re-checking. */
  public long staleCount(UUID tenantId) {
    LocalDate cutoff = LocalDate.now().minusDays(60);
    return materials.findByTenantIdAndActiveTrueOrderByName(tenantId).stream()
        .filter(material -> material.getEffectiveDate() != null
            && material.getEffectiveDate().isBefore(cutoff))
        .count();
  }

  private ReferencePrice bestReference(Material material, String region) {
    List<ReferencePrice> candidates =
        referencePrices.candidates(material.getName(), "Ghana", region);
    return candidates.stream()
        // A rate is only comparable when it is quoted in the same unit.
        .filter(candidate -> candidate.getUnit() != null && material.getUnit() != null
            && candidate.getUnit().equalsIgnoreCase(material.getUnit()))
        .findFirst()
        .orElse(null);
  }

  private boolean moveTooLarge(BigDecimal current, BigDecimal proposed) {
    BigDecimal move = proposed.subtract(current).abs()
        .divide(current, 4, RoundingMode.HALF_UP);
    return move.compareTo(MAX_MOVE) > 0;
  }

  private void record(UUID tenantId, Change change, String reason) {
    MaterialPrice row = new MaterialPrice();
    row.setTenantId(tenantId);
    row.setMaterialId(change.material().getId());
    row.setPrice(change.previous());
    row.setSource(change.material().getPriceSource());
    row.setEffectiveDate(change.material().getEffectiveDate() == null
        ? LocalDate.now() : change.material().getEffectiveDate());
    row.setChangedBy("platform");
    row.setNote(reason + ": replaced by " + change.reference().getSource());
    history.save(row);
  }

  private void notify(UUID tenantId, List<Change> changes) {
    Notification notification = new Notification();
    notification.setTenantId(tenantId);
    notification.setType("RATES_REFRESHED");
    notification.setTone("info");
    notification.setTitle(changes.size() + (changes.size() == 1 ? " rate was" : " rates were")
        + " updated from the reference library");
    notification.setBody(changes.stream().limit(3)
        .map(change -> change.material().getName() + " "
            + change.previous().toPlainString() + " to "
            + change.reference().getPrice().toPlainString())
        .reduce((a, b) -> a + "; " + b)
        .orElse("") + ". Previous figures are kept in the price history.");
    notification.setHref("/materials");
    notifications.save(notification);
  }

  private record Change(Material material, BigDecimal previous, ReferencePrice reference) {}

  public record Result(int updated, int unchanged, int unmatched) {}
}
