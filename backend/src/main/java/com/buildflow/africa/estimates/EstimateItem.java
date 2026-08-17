package com.buildflow.africa.estimates;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "estimate_items")
public class EstimateItem {
  @Id @GeneratedValue private UUID id;
  private UUID tenantId;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "estimate_id") private Estimate estimate;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "section_id") private EstimateSection section;
  private String description;
  private String category;
  /** MATERIAL, LABOUR, EQUIPMENT or SUBCONTRACTOR — what the line is buying. */
  private String costType = "MATERIAL";
  private UUID materialId;
  private BigDecimal quantity = BigDecimal.ZERO;
  private String unit;
  private BigDecimal unitCost = BigDecimal.ZERO;
  private BigDecimal wastePercent = BigDecimal.ZERO;
  private BigDecimal labourCost = BigDecimal.ZERO;
  private BigDecimal equipmentCost = BigDecimal.ZERO;
  private BigDecimal subcontractorCost = BigDecimal.ZERO;
  private BigDecimal markupPercent = BigDecimal.ZERO;
  private BigDecimal taxPercent = BigDecimal.ZERO;
  private BigDecimal total = BigDecimal.ZERO;
  private Integer sortOrder = 0;

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public Estimate getEstimate() { return estimate; }
  public void setEstimate(Estimate estimate) { this.estimate = estimate; }
  public EstimateSection getSection() { return section; }
  public void setSection(EstimateSection section) { this.section = section; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public String getCostType() { return costType; }
  public void setCostType(String costType) { this.costType = costType; }
  public UUID getMaterialId() { return materialId; }
  public void setMaterialId(UUID materialId) { this.materialId = materialId; }
  public BigDecimal getQuantity() { return quantity; }
  public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
  public String getUnit() { return unit; }
  public void setUnit(String unit) { this.unit = unit; }
  public BigDecimal getUnitCost() { return unitCost; }
  public void setUnitCost(BigDecimal unitCost) { this.unitCost = unitCost; }
  public BigDecimal getWastePercent() { return wastePercent; }
  public void setWastePercent(BigDecimal wastePercent) { this.wastePercent = wastePercent; }
  public BigDecimal getLabourCost() { return labourCost; }
  public void setLabourCost(BigDecimal labourCost) { this.labourCost = labourCost; }
  public BigDecimal getEquipmentCost() { return equipmentCost; }
  public void setEquipmentCost(BigDecimal equipmentCost) { this.equipmentCost = equipmentCost; }
  public BigDecimal getSubcontractorCost() { return subcontractorCost; }
  public void setSubcontractorCost(BigDecimal subcontractorCost) { this.subcontractorCost = subcontractorCost; }
  public BigDecimal getMarkupPercent() { return markupPercent; }
  public void setMarkupPercent(BigDecimal markupPercent) { this.markupPercent = markupPercent; }
  public BigDecimal getTaxPercent() { return taxPercent; }
  public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }
  public BigDecimal getTotal() { return total; }
  public void setTotal(BigDecimal total) { this.total = total; }
  public Integer getSortOrder() { return sortOrder; }
  public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
