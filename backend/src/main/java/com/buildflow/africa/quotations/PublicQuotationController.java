package com.buildflow.africa.quotations;

import com.buildflow.africa.activity.Activity;
import com.buildflow.africa.activity.ActivityRepository;
import com.buildflow.africa.clients.Client;
import com.buildflow.africa.clients.ClientRepository;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.estimates.Estimate;
import com.buildflow.africa.estimates.EstimateCalculator;
import com.buildflow.africa.estimates.EstimateItem;
import com.buildflow.africa.estimates.EstimateRepository;
import com.buildflow.africa.estimates.EstimateSection;
import com.buildflow.africa.projects.Project;
import com.buildflow.africa.projects.ProjectRepository;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * Client-facing quotation access.
 *
 * Reached with an opaque token that carries no tenant or database identifier. The client sees the
 * priced document — quantities, sell rates and the amount they are being asked to agree to — and
 * never cost, waste allowance, markup or margin.
 */
@RestController
@RequestMapping("/api/v1/public/quotations")
public class PublicQuotationController {

  private final QuotationRepository quotations;
  private final EstimateRepository estimates;
  private final EstimateCalculator calculator;
  private final TenantRepository tenants;
  private final ClientRepository clients;
  private final ProjectRepository projects;
  private final ActivityRepository activities;
  private final QuotationAcceptanceRepository acceptanceRepository;

  public PublicQuotationController(QuotationRepository quotations, EstimateRepository estimates,
                                   EstimateCalculator calculator, TenantRepository tenants,
                                   ClientRepository clients, ProjectRepository projects,
                                   ActivityRepository activities,
                                   QuotationAcceptanceRepository acceptanceRepository) {
    this.quotations = quotations;
    this.estimates = estimates;
    this.calculator = calculator;
    this.tenants = tenants;
    this.clients = clients;
    this.projects = projects;
    this.activities = activities;
    this.acceptanceRepository = acceptanceRepository;
  }

  @GetMapping("/{token}")
  @Transactional
  public PublicQuote view(@PathVariable("token") String token) {
    Quotation quotation = require(token);
    quotation.setViewCount(quotation.getViewCount() + 1);
    quotation.setViewedAt(Instant.now());
    if ("SENT".equals(quotation.getStatus())) {
      quotation.setStatus("VIEWED");
      activities.save(entry(quotation, "Client",
          "Quotation " + quotation.getQuoteNumber() + " was opened by the client"));
    }
    quotations.save(quotation);

    Tenant tenant = tenants.findById(quotation.getTenantId())
        .orElseThrow(() -> new NotFoundException("QUOTE_NOT_FOUND", "This quotation is no longer available."));
    Estimate estimate = quotation.getEstimateId() == null ? null
        : estimates.findById(quotation.getEstimateId()).orElse(null);
    EstimateCalculator.Totals totals = estimate == null ? null : calculator.calculate(estimate);

    String clientName = quotation.getClientId() == null ? "" : clients.findById(quotation.getClientId())
        .map(Client::getName).orElse("");
    String projectName = quotation.getProjectId() == null
        ? (estimate == null ? "" : estimate.getTitle())
        : projects.findById(quotation.getProjectId()).map(Project::getName)
            .orElse(estimate == null ? "" : estimate.getTitle());

    return new PublicQuote(
        new Company(tenant.getName(), tenant.getRegion(), tenant.getCity(),
            initials(tenant.getName()), tenant.getTin()),
        new Quote(quotation.getQuoteNumber(), quotation.getVersion(), quotation.getStatus(),
            quotation.getValidUntil(), quotation.getClientTotal(), projectName, clientName,
            quotation.getOwnerName()),
        estimate == null ? List.of() : estimate.getSections().stream().map(this::section).toList(),
        totals == null ? null
            : new Summary(totals.subtotal(), totals.tax(), totals.discount(), totals.total()),
        quotation.getTerms());
  }

  @PostMapping("/{token}/decision")
  @Transactional
  public Decision decide(@PathVariable("token") String token, @Valid @RequestBody DecisionRequest request) {
    if (!List.of("ACCEPTED", "REJECTED", "NEGOTIATING").contains(request.decision())) {
      throw new IllegalArgumentException("That decision is not recognised.");
    }
    Quotation quotation = require(token);
    if (quotation.getValidUntil() != null && quotation.getValidUntil().isBefore(LocalDate.now())) {
      throw new IllegalArgumentException(
          "This quotation has expired. Ask for a fresh copy before responding.");
    }
    if (List.of("ACCEPTED", "REJECTED").contains(quotation.getStatus())) {
      throw new IllegalArgumentException("A decision has already been recorded for this quotation.");
    }
    quotation.setStatus(request.decision());
    quotations.save(quotation);

    QuotationAcceptance acceptance = new QuotationAcceptance();
    acceptance.setTenantId(quotation.getTenantId());
    acceptance.setQuotationId(quotation.getId());
    acceptance.setDecision(request.decision());
    acceptance.setComment(request.comment());
    acceptance.setIpAddress(request.ipAddress());
    acceptance.setUserAgent(request.userAgent());
    acceptanceRepository.save(acceptance);

    activities.save(entry(quotation, "Client", "Quotation " + quotation.getQuoteNumber() + " was "
        + request.decision().toLowerCase() + " by the client"));
    return new Decision(quotation.getStatus(), Instant.now());
  }

  private Quotation require(String token) {
    return quotations.findByPublicToken(token)
        .orElseThrow(() -> new NotFoundException("QUOTE_NOT_FOUND",
            "This quotation link is not available. It may have expired or been withdrawn."));
  }

  private Activity entry(Quotation quotation, String actor, String message) {
    Activity activity = new Activity();
    activity.setTenantId(quotation.getTenantId());
    activity.setActorName(actor);
    activity.setChannel("SALES");
    activity.setMessage(message);
    activity.setEntityType("quotation");
    activity.setEntityId(quotation.getId());
    activity.setHref("/quotations/" + quotation.getId());
    return activity;
  }

  private Section section(EstimateSection section) {
    return new Section(section.getName(), section.getItems().stream().map(this::line).toList());
  }

  /**
   * A client-facing line: the quantity ordered and the rate they pay for it. The sell rate is
   * derived from the line total, so no cost or markup figure leaves the building.
   */
  private Line line(EstimateItem item) {
    BigDecimal quantity = item.getQuantity() == null ? BigDecimal.ZERO : item.getQuantity();
    BigDecimal total = item.getTotal() == null ? BigDecimal.ZERO : item.getTotal();
    BigDecimal rate = quantity.compareTo(BigDecimal.ZERO) == 0
        ? total
        : total.divide(quantity, 2, RoundingMode.HALF_UP);
    return new Line(item.getDescription(), quantity, item.getUnit(), rate, total);
  }

  private String initials(String name) {
    return Arrays.stream(name.trim().split("\\s+"))
        .filter(part -> !part.isEmpty())
        .limit(2)
        .map(part -> part.substring(0, 1).toUpperCase())
        .collect(Collectors.joining());
  }

  public record Company(String name, String region, String city, String initials, String tin) {}

  public record Quote(String id, Integer version, String status, LocalDate expiry, BigDecimal amount,
                      String project, String client, String owner) {}

  public record Line(String description, BigDecimal quantity, String unit, BigDecimal rate,
                     BigDecimal amount) {}

  public record Section(String name, List<Line> items) {}

  public record Summary(BigDecimal subtotal, BigDecimal tax, BigDecimal discount, BigDecimal total) {}

  public record PublicQuote(Company company, Quote quote, List<Section> sections, Summary summary,
                            String terms) {}

  public record DecisionRequest(@NotBlank String decision, String comment, String ipAddress,
                                String userAgent) {}

  public record Decision(String status, Instant recordedAt) {}
}
