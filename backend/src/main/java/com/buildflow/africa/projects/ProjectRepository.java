package com.buildflow.africa.projects;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends TenantRepository<Project> {
  List<Project> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
  List<Project> findByTenantIdAndClientId(UUID tenantId, UUID clientId);
  long countByTenantIdAndStatus(UUID tenantId, String status);
  long countByTenantIdAndHealth(UUID tenantId, String health);
  List<Project> findByTenantIdAndStatus(UUID tenantId, String status);
}
