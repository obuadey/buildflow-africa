package com.buildflow.africa.rates;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "platform_template_sections")
public class ReferenceTemplateSection {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(nullable = false) private String name;
  @Column(name = "sort_order", nullable = false) private int sortOrder;

  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
  @JoinColumn(name = "section_id")
  @OrderBy("sortOrder asc")
  private List<ReferenceTemplateItem> items = new ArrayList<>();

  public UUID getId() { return id; }
  public String getName() { return name; }
  public int getSortOrder() { return sortOrder; }
  public List<ReferenceTemplateItem> getItems() { return items; }
}
