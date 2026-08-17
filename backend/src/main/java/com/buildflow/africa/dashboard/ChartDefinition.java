package com.buildflow.africa.dashboard;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "dashboard_charts")
public class ChartDefinition extends TenantEntity {

  @Column(nullable = false) private String scope = "finance";
  @Column(nullable = false) private String title;
  @Column(name = "chart_type", nullable = false) private String chartType = "bar";
  @Column(nullable = false) private String dataset = "invoices";
  @Column(nullable = false) private String measure = "total";
  @Column(name = "group_by", nullable = false) private String groupBy = "status";
  @Column(nullable = false) private String aggregation = "sum";
  @Column(name = "date_field") private String dateField;
  @Column(name = "status_filter") private String statusFilter;
  @Column(name = "project_filter") private String projectFilter;
  @Column(nullable = false) private int limitCount = 8;
  @Column(nullable = false) private String sortDir = "desc";
  @Column(nullable = false) private boolean stacked = false;

  public String getScope() { return scope; }
  public void setScope(String scope) { this.scope = scope; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getChartType() { return chartType; }
  public void setChartType(String chartType) { this.chartType = chartType; }
  public String getDataset() { return dataset; }
  public void setDataset(String dataset) { this.dataset = dataset; }
  public String getMeasure() { return measure; }
  public void setMeasure(String measure) { this.measure = measure; }
  public String getGroupBy() { return groupBy; }
  public void setGroupBy(String groupBy) { this.groupBy = groupBy; }
  public String getAggregation() { return aggregation; }
  public void setAggregation(String aggregation) { this.aggregation = aggregation; }
  public String getDateField() { return dateField; }
  public void setDateField(String dateField) { this.dateField = dateField; }
  public String getStatusFilter() { return statusFilter; }
  public void setStatusFilter(String statusFilter) { this.statusFilter = statusFilter; }
  public String getProjectFilter() { return projectFilter; }
  public void setProjectFilter(String projectFilter) { this.projectFilter = projectFilter; }
  public int getLimitCount() { return limitCount; }
  public void setLimitCount(int limitCount) { this.limitCount = limitCount; }
  public String getSortDir() { return sortDir; }
  public void setSortDir(String sortDir) { this.sortDir = sortDir; }
  public boolean isStacked() { return stacked; }
  public void setStacked(boolean stacked) { this.stacked = stacked; }
}
