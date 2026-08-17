package com.buildflow.africa.platform;

import com.buildflow.africa.platform.PlatformEntities.FeatureFlag;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, UUID> {
  Optional<FeatureFlag> findByCode(String code);
}
