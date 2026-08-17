package com.buildflow.africa.rates;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaterialPriceRepository extends JpaRepository<MaterialPrice, UUID> {
  List<MaterialPrice> findByTenantIdAndMaterialIdOrderByEffectiveDateDesc(UUID tenantId, UUID materialId);
}
