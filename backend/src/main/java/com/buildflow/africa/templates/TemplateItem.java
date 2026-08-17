package com.buildflow.africa.templates;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "estimate_template_items")
public class TemplateItem {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "tenant_id", nullable = false) private UUID tenantId;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "template_section_id") private TemplateSection section;
  @Column(nullable = false) private String description;
  private String category;
  @Column(name = "cost_type", nullable = false) private String costType = "MATERIAL";
  @Column(nullable = false) private BigDecimal quantity = BigDecimal.ONE;
  @Column(nullable = false) private String unit = "item";
  @Column(name = "sort_order", nullable = false) private int sortOrder;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  @Column(name = "updated_at") private Instant updatedAt;

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public TemplateSection getSection() { return section; }
  public void setSection(TemplateSection section) { this.section = section; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public String getCostType() { return costType; }
  public void setCostType(String costType) { this.costType = costType; }
  public BigDecimal getQuantity() { return quantity; }
  public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public int getSortOrder() { return sortOrder; }
  public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
