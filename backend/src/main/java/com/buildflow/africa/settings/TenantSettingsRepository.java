package com.buildflow.africa.settings;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantSettingsRepository extends JpaRepository<TenantSettings, UUID> {}
