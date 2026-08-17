package com.buildflow.africa.estimates;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "estimate_sections")
public class EstimateSection {
  @Id @GeneratedValue private UUID id;
  private UUID tenantId;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "estimate_id") private Estimate estimate;
  private String name;
  private Integer sortOrder = 0;
  private BigDecimal subtotal = BigDecimal.ZERO;
  @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder asc")
  private List<EstimateItem> items = new ArrayList<>();

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public Estimate getEstimate() { return estimate; }
  public void setEstimate(Estimate estimate) { this.estimate = estimate; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public Integer getSortOrder() { return sortOrder; }
  public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
  public BigDecimal getSubtotal() { return subtotal; }
  public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
  public List<EstimateItem> getItems() { return items; }
}

