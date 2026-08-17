package com.buildflow.africa.rates;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A unit rate build-up on the shared shelf: what one square metre or one metre of an element
 * actually consumes. Like a template it holds quantities and no money.
 */
@Entity
@Table(name = "platform_assemblies")
public class ReferenceAssembly {

  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(nullable = false) private String name;
  private String category;
  @Column(nullable = false) private String unit = "m2";
  private String notes;
  @Column(nullable = false) private String country = "Ghana";
  @Column(nullable = false) private boolean indicative = true;
  @Column(name = "sort_order", nullable = false) private int sortOrder;
  @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
  @JoinColumn(name = "assembly_id")
  @OrderBy("sortOrder asc")
  private List<ReferenceAssemblyItem> items = new ArrayList<>();

  public UUID getId() { return id; }
  public String getName() { return name; }
  public String getCategory() { return category; }
  public String getUnit() { return unit; }
  public String getNotes() { return notes; }
  public boolean isIndicative() { return indicative; }
  public List<ReferenceAssemblyItem> getItems() { return items; }
}
