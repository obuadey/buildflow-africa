package com.buildflow.africa.rates;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

/** One line of a shared template. {@code quantity} is per one unit of the template's own unit. */
@Entity
@Table(name = "platform_template_items")
public class ReferenceTemplateItem {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(nullable = false) private String description;
  private String category;
  @Column(name = "cost_type", nullable = false) private String costType = "MATERIAL";
  @Column(nullable = false) private BigDecimal quantity = BigDecimal.ONE;
  @Column(nullable = false) private String unit;
  @Column(name = "waste_percent", nullable = false) private BigDecimal wastePercent = BigDecimal.ZERO;
  @Column(name = "sort_order", nullable = false) private int sortOrder;

  public UUID getId() { return id; }
  public String getDescription() { return description; }
  public String getCategory() { return category; }
  public String getCostType() { return costType; }
  public BigDecimal getQuantity() { return quantity; }
  public String getUnit() { return unit; }
  public BigDecimal getWastePercent() { return wastePercent; }
  public int getSortOrder() { return sortOrder; }
}
