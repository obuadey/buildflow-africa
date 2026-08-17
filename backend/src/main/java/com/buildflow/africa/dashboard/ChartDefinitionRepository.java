package com.buildflow.africa.dashboard;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface ChartDefinitionRepository extends TenantRepository<ChartDefinition> {
  List<ChartDefinition> findByTenantIdAndScopeOrderByCreatedAtAsc(UUID tenantId, String scope);
}
