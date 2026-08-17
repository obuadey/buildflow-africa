package com.buildflow.africa.integrations;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IntegrationSettingRepository extends TenantRepository<IntegrationSetting> {
  List<IntegrationSetting> findByTenantId(UUID tenantId);
  Optional<IntegrationSetting> findByTenantIdAndProvider(UUID tenantId, String provider);
}
