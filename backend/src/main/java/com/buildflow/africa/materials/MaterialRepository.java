package com.buildflow.africa.materials;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface MaterialRepository extends TenantRepository<Material> {
  List<Material> findByTenantIdAndActiveTrueOrderByName(UUID tenantId);
}
