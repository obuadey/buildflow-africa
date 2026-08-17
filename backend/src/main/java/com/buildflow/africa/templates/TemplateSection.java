package com.buildflow.africa.templates;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "estimate_template_sections")
public class TemplateSection {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "tenant_id", nullable = false) private UUID tenantId;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "template_id") private EstimateTemplate template;
  @Column(nullable = false) private String name;
  @Column(name = "sort_order", nullable = false) private int sortOrder;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
  @Column(name = "updated_at") private Instant updatedAt;

  @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("sortOrder asc")
  private List<TemplateItem> items = new ArrayList<>();

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public EstimateTemplate getTemplate() { return template; }
  public void setTemplate(EstimateTemplate template) { this.template = template; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public int getSortOrder() { return sortOrder; }
  public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
  public List<TemplateItem> getItems() { return items; }
}
