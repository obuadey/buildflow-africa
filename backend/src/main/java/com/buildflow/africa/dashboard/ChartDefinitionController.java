package com.buildflow.africa.dashboard;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard-charts")
public class ChartDefinitionController {

  private static final Set<String> CHART_TYPES = Set.of("number", "bar", "donut", "line", "area");
  private static final Set<String> DATASETS = Set.of("invoices", "payments", "expenses", "projects");
  private static final Set<String> AGGREGATIONS = Set.of("sum", "count", "avg", "min", "max");
  private static final Set<String> SORT_DIRS = Set.of("asc", "desc");

  private final ChartDefinitionRepository repository;
  private final ActivityRecorder activity;

  public ChartDefinitionController(ChartDefinitionRepository repository, ActivityRecorder activity) {
    this.repository = repository;
    this.activity = activity;
  }

  @GetMapping
  public PageResponse<ChartView> list(@RequestParam(defaultValue = "finance") String scope) {
    List<ChartView> rows = repository.findByTenantIdAndScopeOrderByCreatedAtAsc(TenantContext.getRequired(), clean(scope))
        .stream().map(ChartView::from).toList();
    return new PageResponse<>(rows, rows.size(), 1, Math.max(rows.size(), 1), 1);
  }

  @GetMapping("/{id}")
  public ChartView get(@PathVariable("id") UUID id) {
    return ChartView.from(find(id));
  }

  @PostMapping
  public ChartView create(@Valid @RequestBody ChartRequest request,
                          @AuthenticationPrincipal AuthPrincipal principal) {
    ChartDefinition chart = new ChartDefinition();
    chart.setTenantId(TenantContext.getRequired());
    apply(chart, request);
    ChartDefinition saved = repository.save(chart);
    activity.record(principal == null ? null : principal.email(), "FINANCE",
        "Dashboard chart added — " + saved.getTitle(), "dashboard-chart", saved.getId(),
        "/module/finance");
    return ChartView.from(saved);
  }

  @PatchMapping("/{id}")
  public ChartView update(@PathVariable("id") UUID id, @Valid @RequestBody ChartRequest request,
                          @AuthenticationPrincipal AuthPrincipal principal) {
    ChartDefinition chart = find(id);
    apply(chart, request);
    ChartDefinition saved = repository.save(chart);
    activity.record(principal == null ? null : principal.email(), "FINANCE",
        "Dashboard chart updated — " + saved.getTitle(), "dashboard-chart", saved.getId(),
        "/module/finance");
    return ChartView.from(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    repository.delete(find(id));
  }

  private ChartDefinition find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("CHART_NOT_FOUND", "That dashboard chart no longer exists."));
  }

  private void apply(ChartDefinition chart, ChartRequest request) {
    chart.setScope(clean(request.scope() == null ? "finance" : request.scope()));
    chart.setTitle(clean(request.title()));
    chart.setChartType(allowed(request.chartType(), CHART_TYPES, "bar"));
    chart.setDataset(allowed(request.dataset(), DATASETS, "invoices"));
    chart.setMeasure(clean(request.measure()));
    chart.setGroupBy(clean(request.groupBy()));
    chart.setAggregation(allowed(request.aggregation(), AGGREGATIONS, "sum"));
    chart.setDateField(blankToNull(request.dateField()));
    chart.setStatusFilter(blankToNull(request.statusFilter()));
    chart.setProjectFilter(blankToNull(request.projectFilter()));
    chart.setLimitCount(Math.min(Math.max(request.limitCount() == null ? 8 : request.limitCount(), 1), 20));
    chart.setSortDir(allowed(request.sortDir(), SORT_DIRS, "desc"));
    chart.setStacked(Boolean.TRUE.equals(request.stacked()));
  }

  private String allowed(String value, Set<String> allowed, String fallback) {
    String cleaned = clean(value == null ? fallback : value).toLowerCase();
    return allowed.contains(cleaned) ? cleaned : fallback;
  }

  private String blankToNull(String value) {
    String cleaned = clean(value);
    return cleaned.isBlank() ? null : cleaned;
  }

  private String clean(String value) {
    return value == null ? "" : value.trim();
  }

  public record ChartRequest(
      String scope,
      @NotBlank String title,
      @NotBlank String chartType,
      @NotBlank String dataset,
      @NotBlank String measure,
      @NotBlank String groupBy,
      @NotBlank String aggregation,
      String dateField,
      String statusFilter,
      String projectFilter,
      @NotNull Integer limitCount,
      @NotBlank String sortDir,
      Boolean stacked) {}

  public record ChartView(
      UUID id, String scope, String title, String chartType, String dataset, String measure,
      String groupBy, String aggregation, String dateField, String statusFilter,
      String projectFilter, int limitCount, String sortDir, boolean stacked, Instant createdAt,
      Instant updatedAt) {
    static ChartView from(ChartDefinition chart) {
      return new ChartView(chart.getId(), chart.getScope(), chart.getTitle(), chart.getChartType(),
          chart.getDataset(), chart.getMeasure(), chart.getGroupBy(), chart.getAggregation(),
          chart.getDateField(), chart.getStatusFilter(), chart.getProjectFilter(),
          chart.getLimitCount(), chart.getSortDir(), chart.isStacked(), chart.getCreatedAt(),
          chart.getUpdatedAt() == null ? chart.getCreatedAt() : chart.getUpdatedAt());
    }
  }
}
