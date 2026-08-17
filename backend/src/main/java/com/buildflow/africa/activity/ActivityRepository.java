package com.buildflow.africa.activity;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface ActivityRepository extends TenantRepository<Activity> {

  List<Activity> findByTenantIdAndEntityIdOrderByCreatedAtDesc(UUID tenantId, UUID entityId);
}
