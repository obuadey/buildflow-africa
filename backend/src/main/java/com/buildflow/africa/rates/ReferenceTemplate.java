package com.buildflow.africa.rates;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A template on the shared shelf, readable by every company.
 *
 * It describes what work a job of this kind contains and in what quantity per unit — per square
 * metre of floor, per metre of wall — and carries no rates at all. What it costs is decided when a
 * company builds an estimate from it, out of that company's own price book.
 */
@Entity
@Table(name = "platform_templates")
public class ReferenceTemplate {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(nullable = false) private String name;
  private String category;
  private String description;
  @Column(nullable = false) private String unit = "item";
  @Column(nullable = false) private String country = "Ghana";
  @Column(nullable = false) private boolean indicative = true;
  @Column(name = "sort_order", nullable = false) private int sortOrder;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
  @JoinColumn(name = "template_id")
  @OrderBy("sortOrder asc")
  private List<ReferenceTemplateSection> sections = new ArrayList<>();

  public UUID getId() { return id; }
  public String getName() { return name; }
  public String getCategory() { return category; }
  public String getDescription() { return description; }
  public String getUnit() { return unit; }
  public boolean isIndicative() { return indicative; }
  public int getSortOrder() { return sortOrder; }
  public List<ReferenceTemplateSection> getSections() { return sections; }
}
