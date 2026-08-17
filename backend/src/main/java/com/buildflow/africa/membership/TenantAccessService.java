package com.buildflow.africa.membership;

import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Resolves a company from the slug in a URL and verifies that the authenticated user belongs to
 * it. The slug identifies; the membership authorises. Nothing else grants access.
 */
@Service
public class TenantAccessService {

  private final TenantRepository tenants;
  private final TenantMembershipRepository memberships;

  public TenantAccessService(TenantRepository tenants, TenantMembershipRepository memberships) {
    this.tenants = tenants;
    this.memberships = memberships;
  }

  public record Access(Tenant tenant, String role) {}

  public Access resolve(String slug, UUID userId) {
    Tenant tenant = tenants.findBySlugIgnoreCase(slug)
        .orElseThrow(() -> new AccessDeniedException("You do not have access to this company."));
    TenantMembership membership = memberships.findByTenantIdAndUserId(tenant.getId(), userId)
        .filter(m -> "ACTIVE".equals(m.getStatus()))
        .orElseThrow(() -> new AccessDeniedException("You do not have access to this company."));
    return new Access(tenant, membership.getRole());
  }

  public List<Access> membershipsOf(UUID userId) {
    return memberships.findByUserIdAndStatus(userId, "ACTIVE").stream()
        .map(membership -> tenants.findById(membership.getTenantId())
            .map(tenant -> new Access(tenant, membership.getRole()))
            .orElse(null))
        .filter(java.util.Objects::nonNull)
        .toList();
  }

  public void requireRole(UUID tenantId, UUID userId, List<String> roles) {
    TenantMembership membership = memberships.findByTenantIdAndUserId(tenantId, userId)
        .orElseThrow(() -> new AccessDeniedException("You do not have access to this company."));
    if (!roles.contains(membership.getRole())) {
      throw new AccessDeniedException("Your role does not allow this action.");
    }
  }
}
