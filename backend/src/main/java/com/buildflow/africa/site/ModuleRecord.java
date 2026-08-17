package com.buildflow.africa.site;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** A site accommodation record kept against a running project. */
@Entity
@Table(name = "module_records")
public class ModuleRecord extends TenantEntity {

  @Column(name = "project_id") private UUID projectId;
  @Column(nullable = false) private String module;
  @Column(nullable = false) private String title;
  @Column(nullable = false) private String source = "FIELD";
  private String type;
  @Column(nullable = false) private String status = "Open";
  private String priority;
  @Column(name = "owner_name") private String ownerName;
  @Column(name = "due_date") private LocalDate dueDate;
  private BigDecimal value;
  private BigDecimal quantity;
  private String unit;
  @Column(name = "linked_record") private String linkedRecord;
  private String details;

  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public String getModule() { return module; }
  public void setModule(String module) { this.module = module; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getSource() { return source; }
  public void setSource(String source) { this.source = source; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getPriority() { return priority; }
  public void setPriority(String priority) { this.priority = priority; }
  public String getOwnerName() { return ownerName; }
  public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
  public LocalDate getDueDate() { return dueDate; }
  public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
  public BigDecimal getValue() { return value; }
  public void setValue(BigDecimal value) { this.value = value; }
  public BigDecimal getQuantity() { return quantity; }
  public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public String getLinkedRecord() { return linkedRecord; }
  public void setLinkedRecord(String linkedRecord) { this.linkedRecord = linkedRecord; }
  public String getDetails() { return details; }
  public void setDetails(String details) { this.details = details; }
}
