package com.buildflow.africa.platform;

import com.buildflow.africa.platform.PlatformEntities.PlatformPrice;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface PlatformPriceRepository
    extends JpaRepository<PlatformPrice, UUID>, JpaSpecificationExecutor<PlatformPrice> {}
