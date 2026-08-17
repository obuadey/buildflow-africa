package com.buildflow.africa.projects;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project extends TenantEntity {
  private UUID clientId;
  private String projectNumber;
  private String name;
  private String projectType;
  private String location;
  private String region;
  private String city;
  private String description;
  private LocalDate startDate;
  private LocalDate expectedCompletionDate;
  private String status = "DRAFT";
  private BigDecimal budget;
  private String notes;
  private String managerName;
  private int completionPercent;
  private String health = "ON_TRACK";
  private String riskNote;
  private BigDecimal contractValue = BigDecimal.ZERO;

  public UUID getClientId() { return clientId; }
  public void setClientId(UUID clientId) { this.clientId = clientId; }
  public String getProjectNumber() { return projectNumber; }
  public void setProjectNumber(String projectNumber) { this.projectNumber = projectNumber; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getProjectType() { return projectType; }
  public void setProjectType(String projectType) { this.projectType = projectType; }
  public String getLocation() { return location; }
  public void setLocation(String location) { this.location = location; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public LocalDate getStartDate() { return startDate; }
  public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
  public LocalDate getExpectedCompletionDate() { return expectedCompletionDate; }
  public void setExpectedCompletionDate(LocalDate expectedCompletionDate) { this.expectedCompletionDate = expectedCompletionDate; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public BigDecimal getBudget() { return budget; }
  public void setBudget(BigDecimal budget) { this.budget = budget; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
  public String getManagerName() { return managerName; }
  public void setManagerName(String managerName) { this.managerName = managerName; }
  public int getCompletionPercent() { return completionPercent; }
  public void setCompletionPercent(int completionPercent) { this.completionPercent = completionPercent; }
  public String getHealth() { return health; }
  public void setHealth(String health) { this.health = health; }
  public String getRiskNote() { return riskNote; }
  public void setRiskNote(String riskNote) { this.riskNote = riskNote; }
  public BigDecimal getContractValue() { return contractValue; }
  public void setContractValue(BigDecimal contractValue) { this.contractValue = contractValue; }
}
