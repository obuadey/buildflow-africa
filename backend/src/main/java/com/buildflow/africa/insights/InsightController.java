package com.buildflow.africa.insights;

import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.invoices.Invoice;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.materials.Material;
import com.buildflow.africa.materials.MaterialRepository;
import com.buildflow.africa.projects.Project;
import com.buildflow.africa.projects.ProjectRepository;
import com.buildflow.africa.quotations.Quotation;
import com.buildflow.africa.quotations.QuotationRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The things worth a contractor's attention this morning, read off their own records: money that is
 * late, quotations going cold, rates that have gone stale, projects drifting.
 *
 * Every item is a plain observation with a link to the record behind it. Nothing here changes
 * anything, and nothing is invented — if the data does not support an observation, it is not made.
 */
@RestController
@RequestMapping("/api/v1/insights")
public class InsightController {

  private static final int STALE_RATE_DAYS = 60;
  private static final int COLD_QUOTE_DAYS = 7;
  private static final Map<String, Integer> TONE_ORDER =
      Map.of("danger", 0, "warning", 1, "ai", 2, "positive", 3);

  private final InvoiceRepository invoices;
  private final QuotationRepository quotations;
  private final ProjectRepository projects;
  private final MaterialRepository materials;

  public InsightController(InvoiceRepository invoices, QuotationRepository quotations,
                           ProjectRepository projects, MaterialRepository materials) {
    this.invoices = invoices;
    this.quotations = quotations;
    this.projects = projects;
    this.materials = materials;
  }

  @GetMapping
  public PageResponse<Insight> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    List<Insight> found = new ArrayList<>();

    overdueInvoices(tenantId, found);
    coldQuotations(tenantId, found);
    staleRates(tenantId, found);
    driftingProjects(tenantId, found);
    thinMargins(tenantId, found);
    wins(tenantId, found);

    String tone = params.get("tone");
    List<Insight> rows = found.stream()
        .filter(insight -> tone == null || tone.isBlank() || tone.equalsIgnoreCase(insight.tone()))
        .sorted(Comparator.comparingInt(insight -> TONE_ORDER.getOrDefault(insight.tone(), 9)))
        .toList();

    int size = Math.min(Math.max(parse(params.get("size"), 25), 1), 100);
    int page = Math.max(parse(params.get("page"), 1), 1);
    int from = Math.min((page - 1) * size, rows.size());
    int to = Math.min(from + size, rows.size());
    return new PageResponse<>(rows.subList(from, to), rows.size(), page, size,
        Math.max((int) Math.ceil(rows.size() / (double) size), 1));
  }

  private void overdueInvoices(UUID tenantId, List<Insight> found) {
    List<Invoice> overdue = invoices.findAll((root, query, cb) -> cb.and(
            cb.equal(root.get("tenantId"), tenantId),
            root.get("status").in(List.of("SENT", "PARTIALLY_PAID", "OVERDUE")),
            cb.lessThan(root.get("dueDate"), LocalDate.now())))
        .stream().toList();
    if (overdue.isEmpty()) {
      return;
    }
    BigDecimal total = overdue.stream().map(Invoice::outstanding)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    Invoice worst = overdue.stream().min(Comparator.comparing(Invoice::getDueDate)).orElseThrow();
    long days = ChronoUnit.DAYS.between(worst.getDueDate(), LocalDate.now());

    found.add(new Insight("overdue-invoices", "danger",
        overdue.size() + (overdue.size() == 1 ? " invoice is overdue" : " invoices are overdue"),
        money(total) + " is past its due date. The oldest, " + worst.getInvoiceNumber()
            + ", is " + days + (days == 1 ? " day" : " days") + " late.",
        "Chase payment", "/invoices?status=OVERDUE"));
  }

  private void coldQuotations(UUID tenantId, List<Insight> found) {
    Instant cutoff = Instant.now().minus(COLD_QUOTE_DAYS, ChronoUnit.DAYS);
    List<Quotation> cold = quotations.findAll((root, query, cb) -> cb.and(
            cb.equal(root.get("tenantId"), tenantId),
            root.get("status").in(List.of("SENT", "VIEWED")),
            cb.lessThan(root.get("sentAt"), cutoff)))
        .stream().toList();
    if (cold.isEmpty()) {
      return;
    }
    BigDecimal value = cold.stream().map(Quotation::getClientTotal)
        .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    found.add(new Insight("cold-quotations", "warning",
        cold.size() + (cold.size() == 1 ? " quotation has" : " quotations have")
            + " had no answer for over a week",
        money(value) + " of work is sitting undecided. A follow-up call is usually what closes it.",
        "Review quotations", "/quotations?status=SENT,VIEWED"));
  }

  private void staleRates(UUID tenantId, List<Insight> found) {
    List<Material> library = materials.findByTenantIdAndActiveTrueOrderByName(tenantId);
    LocalDate cutoff = LocalDate.now().minusDays(STALE_RATE_DAYS);
    List<Material> stale = library.stream()
        .filter(material -> material.getEffectiveDate() != null
            && material.getEffectiveDate().isBefore(cutoff))
        .toList();
    if (stale.isEmpty()) {
      return;
    }
    found.add(new Insight("stale-rates", "warning",
        stale.size() + (stale.size() == 1 ? " rate is" : " rates are")
            + " older than " + STALE_RATE_DAYS + " days",
        "Pricing from an out-of-date rate is the quickest way to lose margin. "
            + stale.get(0).getName() + " is the oldest.",
        "Update the rate library", "/materials?freshness=stale"));
  }

  private void driftingProjects(UUID tenantId, List<Insight> found) {
    List<Project> drifting = projects.findAll((root, query, cb) -> cb.and(
            cb.equal(root.get("tenantId"), tenantId),
            root.get("health").in(List.of("AT_RISK", "DELAYED"))))
        .stream().toList();
    if (drifting.isEmpty()) {
      return;
    }
    found.add(new Insight("project-health", "warning",
        drifting.size() + (drifting.size() == 1 ? " project needs" : " projects need") + " attention",
        drifting.stream().limit(3).map(Project::getName).reduce((a, b) -> a + ", " + b).orElse("")
            + (drifting.size() > 3 ? " and others are" : " is") + " flagged at risk or delayed.",
        "Open projects", "/projects?health=AT_RISK,DELAYED"));
  }

  private void thinMargins(UUID tenantId, List<Insight> found) {
    List<Project> thin = projects.findByTenantIdAndStatus(tenantId, "ACTIVE").stream()
        .filter(project -> project.getContractValue() != null
            && project.getContractValue().signum() > 0
            && project.getBudget() != null
            && project.getBudget().compareTo(
                project.getContractValue().multiply(new BigDecimal("0.88"))) > 0)
        .toList();
    if (thin.isEmpty()) {
      return;
    }
    found.add(new Insight("thin-margin", "ai",
        thin.size() + (thin.size() == 1 ? " active project is" : " active projects are")
            + " budgeted within 12% of its contract value",
        "There is very little room for a variation or a price rise on "
            + thin.get(0).getName() + ". Check the markup before the next valuation.",
        "Review the numbers", "/projects?status=ACTIVE"));
  }

  private void wins(UUID tenantId, List<Insight> found) {
    long accepted = quotations.countByTenantIdAndStatus(tenantId, "ACCEPTED");
    long rejected = quotations.countByTenantIdAndStatus(tenantId, "REJECTED");
    long decided = accepted + rejected;
    if (decided < 3) {
      return;
    }
    BigDecimal rate = BigDecimal.valueOf(accepted * 100.0 / decided).setScale(0, RoundingMode.HALF_UP);
    if (rate.intValue() < 50) {
      found.add(new Insight("win-rate", "warning",
          "You are winning " + rate + "% of the work you quote",
          "Fewer than half of decided quotations are converting. It is worth checking whether the "
              + "pricing or the follow-up is the reason.",
          "Open the pipeline", "/quotations"));
    } else {
      found.add(new Insight("win-rate", "positive",
          "You are winning " + rate + "% of the work you quote",
          accepted + " of the last " + decided + " decided quotations were accepted.",
          "Open the pipeline", "/quotations"));
    }
  }

  private String money(BigDecimal amount) {
    return amount.setScale(0, RoundingMode.HALF_UP).toPlainString();
  }

  private int parse(String value, int fallback) {
    try {
      return value == null ? fallback : Integer.parseInt(value);
    } catch (NumberFormatException ex) {
      return fallback;
    }
  }

  public record Insight(String id, String tone, String title, String detail, String action, String href) {}
}
