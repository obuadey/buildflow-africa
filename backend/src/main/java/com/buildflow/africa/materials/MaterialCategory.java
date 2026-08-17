package com.buildflow.africa.materials;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Trade groupings for the rate library. Rows with no tenant are the shared starter list. */
@Entity
@Table(name = "material_categories")
public class MaterialCategory {
  @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
  @Column(name = "tenant_id") private UUID tenantId;
  @Column(nullable = false) private String name;
  @Column(name = "updated_at") private Instant updatedAt;

  public UUID getId() { return id; }
  public UUID getTenantId() { return tenantId; }
  public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public Instant getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
