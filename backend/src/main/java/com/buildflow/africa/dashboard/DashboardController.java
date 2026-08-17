package com.buildflow.africa.dashboard;

import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.expenses.ExpenseRepository;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.payments.PaymentRepository;
import com.buildflow.africa.projects.ProjectRepository;
import com.buildflow.africa.quotations.QuotationRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dashboard aggregates. Every figure is a SQL aggregate over the tenant's own rows — the endpoint
 * never loads a collection to add it up in memory.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

  private static final List<String> OPEN_INVOICE_STATUSES = List.of("SENT", "PARTIALLY_PAID", "OVERDUE");

  private final InvoiceRepository invoices;
  private final PaymentRepository payments;
  private final ExpenseRepository expenses;
  private final ProjectRepository projects;
  private final QuotationRepository quotations;

  public DashboardController(InvoiceRepository invoices, PaymentRepository payments,
                             ExpenseRepository expenses, ProjectRepository projects,
                             QuotationRepository quotations) {
    this.invoices = invoices;
    this.payments = payments;
    this.expenses = expenses;
    this.projects = projects;
    this.quotations = quotations;
  }

  @GetMapping("/summary")
  public Summary summary(@RequestParam(name = "range", required = false) String range,
                         @RequestParam(name = "from", required = false) String from,
                         @RequestParam(name = "to", required = false) String to) {
    UUID tenantId = TenantContext.getRequired();
    Period period = Period.resolve(range, from, to);
    Period previous = period.previous();

    BigDecimal revenue = invoices.revenueBetween(tenantId, period.from(), period.to());
    BigDecimal previousRevenue = invoices.revenueBetween(tenantId, previous.from(), previous.to());
    BigDecimal cost = expenses.spentBetween(tenantId, period.from(), period.to().plusDays(1));
    BigDecimal collected = payments.collectedBetween(tenantId, period.from(), period.to().plusDays(1));
    BigDecimal previousCollected = payments.collectedBetween(tenantId, previous.from(), previous.to().plusDays(1));
    BigDecimal outstanding = invoices.outstanding(tenantId);
    BigDecimal grossProfit = revenue.subtract(cost);

    long won = quotations.countByTenantIdAndStatus(tenantId, "ACCEPTED");
    long rejected = quotations.countByTenantIdAndStatus(tenantId, "REJECTED");
    long expired = quotations.countByTenantIdAndStatus(tenantId, "EXPIRED");
    long decided = won + rejected + expired;

    List<TrendPoint> trend = new ArrayList<>();
    for (int i = 11; i >= 0; i--) {
      YearMonth month = YearMonth.from(LocalDate.now()).minusMonths(i);
      LocalDate start = month.atDay(1);
      LocalDate end = month.plusMonths(1).atDay(1);
      BigDecimal monthRevenue = invoices.revenueForMonth(tenantId, start, end);
      BigDecimal monthCost = expenses.spentBetween(tenantId, start, end);
      trend.add(new TrendPoint(month.toString(), monthRevenue, monthCost, monthRevenue.subtract(monthCost)));
    }

    List<CashPoint> cashflow = new ArrayList<>();
    for (int i = 5; i >= 0; i--) {
      YearMonth month = YearMonth.from(LocalDate.now()).minusMonths(i);
      LocalDate start = month.atDay(1);
      LocalDate end = month.plusMonths(1).atDay(1);
      cashflow.add(new CashPoint(month.toString(),
          payments.collectedBetween(tenantId, start, end),
          expenses.spentBetween(tenantId, start, end)));
    }

    List<PipelineStage> pipeline = quotations.pipeline(tenantId).stream()
        .map(row -> new PipelineStage((String) row[0], ((Number) row[1]).longValue(), (BigDecimal) row[2]))
        .toList();

    Health health = new Health(
        projects.countByTenantIdAndHealth(tenantId, "ON_TRACK"),
        projects.countByTenantIdAndHealth(tenantId, "AT_RISK"),
        projects.countByTenantIdAndHealth(tenantId, "DELAYED"),
        projects.countByTenantIdAndHealth(tenantId, "COMPLETED"));

    return new Summary(
        new PeriodView(period.from().toString(), period.to().toString(), period.label()),
        new Kpis(
            new Delta(revenue, percentChange(revenue, previousRevenue)),
            new Count(outstanding, invoices.countByTenantIdAndStatusIn(tenantId, OPEN_INVOICE_STATUSES)),
            new Count(BigDecimal.valueOf(projects.countByTenantIdAndStatus(tenantId, "ACTIVE")),
                projects.countByTenantIdAndHealth(tenantId, "AT_RISK")
                    + projects.countByTenantIdAndHealth(tenantId, "DELAYED")),
            new Delta(decided == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(won * 100.0 / decided).setScale(1, RoundingMode.HALF_UP), BigDecimal.ZERO),
            new Delta(grossProfit, revenue.signum() == 0 ? BigDecimal.ZERO
                : grossProfit.multiply(BigDecimal.valueOf(100))
                    .divide(revenue, 1, RoundingMode.HALF_UP)),
            new Delta(collected, percentChange(collected, previousCollected))),
        trend, cashflow, pipeline, health);
  }

  private BigDecimal percentChange(BigDecimal current, BigDecimal previous) {
    if (previous == null || previous.signum() == 0) {
      return BigDecimal.ZERO;
    }
    return current.subtract(previous).multiply(BigDecimal.valueOf(100))
        .divide(previous, 1, RoundingMode.HALF_UP);
  }

  public record PeriodView(String from, String to, String label) {}
  public record Delta(BigDecimal value, BigDecimal delta) {}
  public record Count(BigDecimal value, long count) {}
  public record Kpis(Delta revenue, Count outstanding, Count activeProjects, Delta winRate,
                     Delta grossProfit, Delta cashCollected) {}
  public record TrendPoint(String month, BigDecimal revenue, BigDecimal cost, BigDecimal profit) {}
  public record CashPoint(String month, BigDecimal in, BigDecimal out) {}
  public record PipelineStage(String stage, long count, BigDecimal value) {}
  public record Health(long onTrack, long atRisk, long delayed, long completed) {}
  public record Summary(PeriodView period, Kpis kpis, List<TrendPoint> trend, List<CashPoint> cashflow,
                        List<PipelineStage> pipeline, Health health) {}

  /** Reporting window. Defaults to the current calendar month. */
  record Period(LocalDate from, LocalDate to, String label) {
    static Period resolve(String range, String fromParam, String toParam) {
      LocalDate today = LocalDate.now();
      if ("custom".equals(range) && fromParam != null && toParam != null) {
        return new Period(LocalDate.parse(fromParam), LocalDate.parse(toParam), "Custom range");
      }
      return switch (range == null ? "" : range) {
        case "last-month" -> new Period(today.minusMonths(1).withDayOfMonth(1),
            today.withDayOfMonth(1).minusDays(1), "Last month");
        case "quarter" -> new Period(today.withDayOfMonth(1).minusMonths(today.getMonthValue() % 3 == 0
            ? 2 : (today.getMonthValue() % 3) - 1), today, "This quarter");
        case "year" -> new Period(today.withDayOfYear(1), today, "This year");
        default -> new Period(today.withDayOfMonth(1), today, "This month");
      };
    }

    Period previous() {
      long days = java.time.temporal.ChronoUnit.DAYS.between(from, to) + 1;
      return new Period(from.minusDays(days), from.minusDays(1), "Previous period");
    }
  }
}
