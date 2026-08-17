package com.buildflow.africa.membership;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

/** The slug identifies a company; only an ACTIVE membership authorises access to it. */
@ExtendWith(MockitoExtension.class)
class TenantIsolationTest {

  @Mock private TenantRepository tenants;
  @Mock private TenantMembershipRepository memberships;

  private TenantAccessService service;
  private final UUID insider = UUID.randomUUID();
  private final UUID outsider = UUID.randomUUID();
  private Tenant tenant;

  @BeforeEach
  void setUp() {
    service = new TenantAccessService(tenants, memberships);
    tenant = new Tenant();
    tenant.setSlug("obuadey-construction");
  }

  @Test
  @DisplayName("a member resolves the company and receives their role")
  void memberResolves() {
    TenantMembership membership = new TenantMembership();
    membership.setRole("OWNER");
    membership.setStatus("ACTIVE");
    when(tenants.findBySlugIgnoreCase("obuadey-construction")).thenReturn(Optional.of(tenant));
    when(memberships.findByTenantIdAndUserId(tenant.getId(), insider)).thenReturn(Optional.of(membership));

    assertEquals("OWNER", service.resolve("obuadey-construction", insider).role());
  }

  @Test
  @DisplayName("a non-member is refused even with a valid slug")
  void nonMemberRefused() {
    when(tenants.findBySlugIgnoreCase("obuadey-construction")).thenReturn(Optional.of(tenant));
    when(memberships.findByTenantIdAndUserId(tenant.getId(), outsider)).thenReturn(Optional.empty());

    assertThrows(AccessDeniedException.class, () -> service.resolve("obuadey-construction", outsider));
  }

  @Test
  @DisplayName("an unknown slug is refused with the same message, revealing nothing")
  void unknownSlugRefused() {
    when(tenants.findBySlugIgnoreCase("someone-else")).thenReturn(Optional.empty());
    assertThrows(AccessDeniedException.class, () -> service.resolve("someone-else", insider));
  }

  @Test
  @DisplayName("a suspended membership does not grant access")
  void suspendedRefused() {
    TenantMembership membership = new TenantMembership();
    membership.setStatus("DISABLED");
    when(tenants.findBySlugIgnoreCase("obuadey-construction")).thenReturn(Optional.of(tenant));
    when(memberships.findByTenantIdAndUserId(tenant.getId(), insider)).thenReturn(Optional.of(membership));

    assertThrows(AccessDeniedException.class, () -> service.resolve("obuadey-construction", insider));
  }

  @Test
  @DisplayName("a role outside the allowed list is rejected")
  void roleEnforced() {
    TenantMembership membership = new TenantMembership();
    membership.setRole("VIEWER");
    when(memberships.findByTenantIdAndUserId(tenant.getId(), insider)).thenReturn(Optional.of(membership));

    assertThrows(AccessDeniedException.class,
        () -> service.requireRole(tenant.getId(), insider, List.of("OWNER", "ADMIN")));
  }
}
