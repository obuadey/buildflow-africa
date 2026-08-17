package com.buildflow.africa.variations;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface VariationRepository extends TenantRepository<Variation> {
  List<Variation> findByTenantIdAndContractIdAndStatus(UUID tenantId, UUID contractId, String status);
  boolean existsByTenantIdAndContractIdAndStatus(UUID tenantId, UUID contractId, String status);
}
