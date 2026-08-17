package com.buildflow.africa.common;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.NoRepositoryBean;

/** Every tenant-scoped repository. Lookups by id always carry the tenant id. */
@NoRepositoryBean
public interface TenantRepository<T extends TenantEntity>
    extends JpaRepository<T, UUID>, JpaSpecificationExecutor<T> {

  Optional<T> findByIdAndTenantId(UUID id, UUID tenantId);

  long countByTenantId(UUID tenantId);
}
