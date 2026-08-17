package com.buildflow.africa.platform;

import com.buildflow.africa.platform.PlatformEntities.TenantFeatureFlag;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantFeatureFlagRepository extends JpaRepository<TenantFeatureFlag, UUID> {
  List<TenantFeatureFlag> findByTenantId(UUID tenantId);

  Optional<TenantFeatureFlag> findByTenantIdAndFlagCode(UUID tenantId, String flagCode);
}
