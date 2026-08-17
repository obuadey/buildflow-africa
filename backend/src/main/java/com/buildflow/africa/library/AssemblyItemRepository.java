package com.buildflow.africa.library;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface AssemblyItemRepository extends TenantRepository<AssemblyItem> {
  List<AssemblyItem> findByTenantIdAndAssemblyIdOrderBySortOrderAsc(UUID tenantId, UUID assemblyId);
}
