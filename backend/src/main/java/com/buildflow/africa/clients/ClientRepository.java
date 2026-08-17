package com.buildflow.africa.clients;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface ClientRepository extends TenantRepository<Client> {
  List<Client> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
