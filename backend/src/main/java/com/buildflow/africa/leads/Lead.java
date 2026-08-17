package com.buildflow.africa.leads;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "leads")
public class Lead extends TenantEntity {

  @Column(nullable = false) private String reference;
  @Column(nullable = false) private String name;
  @Column(name = "contact_name") private String contactName;
  private String phone;
  private String email;
  @Column(nullable = false) private String stage = "NEW";
  @Column(name = "estimated_value", nullable = false) private BigDecimal estimatedValue = BigDecimal.ZERO;
  private String source;
  @Column(name = "owner_name") private String ownerName;
  private String region;
  private String city;
  @Column(name = "next_action") private String nextAction;
  @Column(name = "client_id") private UUID clientId;
  @Column(name = "project_id") private UUID projectId;
  private String notes;

  public String getReference() { return reference; }
  public void setReference(String reference) { this.reference = reference; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getContactName() { return contactName; }
  public void setContactName(String contactName) { this.contactName = contactName; }
  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getStage() { return stage; }
  public void setStage(String stage) { this.stage = stage; }
  public BigDecimal getEstimatedValue() { return estimatedValue; }
  public void setEstimatedValue(BigDecimal estimatedValue) { this.estimatedValue = estimatedValue; }
  public String getSource() { return source; }
  public void setSource(String source) { this.source = source; }
  public String getOwnerName() { return ownerName; }
  public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public String getNextAction() { return nextAction; }
  public void setNextAction(String nextAction) { this.nextAction = nextAction; }
  public UUID getClientId() { return clientId; }
  public void setClientId(UUID clientId) { this.clientId = clientId; }
  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
}
