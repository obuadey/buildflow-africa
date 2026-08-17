package com.buildflow.africa.rates;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface SupplierItemRepository extends TenantRepository<SupplierItem> {
  List<SupplierItem> findByTenantIdOrderByEffectiveDateDesc(UUID tenantId);
}
