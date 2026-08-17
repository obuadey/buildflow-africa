package com.buildflow.africa.estimates;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface EstimateRepository extends TenantRepository<Estimate> {
  List<Estimate> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
  List<Estimate> findByTenantIdAndClientId(UUID tenantId, UUID clientId);
}
