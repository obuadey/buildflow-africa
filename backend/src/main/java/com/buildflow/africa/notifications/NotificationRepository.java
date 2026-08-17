package com.buildflow.africa.notifications;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends TenantRepository<Notification> {
  List<Notification> findByTenantIdAndReadAtIsNull(UUID tenantId);
  long countByTenantIdAndReadAtIsNull(UUID tenantId);
}
