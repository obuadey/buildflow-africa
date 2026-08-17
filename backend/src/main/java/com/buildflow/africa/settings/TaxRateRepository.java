package com.buildflow.africa.settings;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface TaxRateRepository extends TenantRepository<TaxRate> {
  List<TaxRate> findByTenantIdOrderByEffectiveFromDesc(UUID tenantId);
  List<TaxRate> findByTenantIdAndActiveTrueOrderByEffectiveFromDesc(UUID tenantId);
}
