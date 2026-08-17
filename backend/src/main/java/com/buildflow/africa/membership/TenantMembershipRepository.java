package com.buildflow.africa.membership;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantMembershipRepository extends JpaRepository<TenantMembership, UUID> {
  List<TenantMembership> findByUserIdAndStatus(UUID userId, String status);
  List<TenantMembership> findByTenantId(UUID tenantId);
  Optional<TenantMembership> findByTenantIdAndUserId(UUID tenantId, UUID userId);
}
