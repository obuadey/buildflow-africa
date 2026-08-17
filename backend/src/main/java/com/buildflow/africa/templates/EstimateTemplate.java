package com.buildflow.africa.templates;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * A reusable estimate structure — the sections and lines a contractor prices on every job of a
 * given kind. A template carries no rates: quantities and descriptions are reused, and prices are
 * always taken fresh from the rate library when an estimate is built from it.
 */
@Entity
@Table(name = "estimate_templates")
public class EstimateTemplate extends TenantEntity {

  @Column(nullable = false) private String name;
  private String category;
  @Column(name = "typical_value", nullable = false) private BigDecimal typicalValue = BigDecimal.ZERO;
  @Column(name = "use_count", nullable = false) private int useCount;

  @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder asc")
  private List<TemplateSection> sections = new ArrayList<>();

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getCategory() { return category; }
  public void setCategory(String category) { this.category = category; }
  public BigDecimal getTypicalValue() { return typicalValue; }
  public void setTypicalValue(BigDecimal typicalValue) { this.typicalValue = typicalValue; }
  public int getUseCount() { return useCount; }
  public void setUseCount(int useCount) { this.useCount = useCount; }
  public List<TemplateSection> getSections() { return sections; }
}
