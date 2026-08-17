package com.buildflow.africa.common;

import java.util.UUID;

public final class TenantContext {
  private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

  private TenantContext() {}

  public static void set(UUID tenantId) {
    CURRENT.set(tenantId);
  }

  public static UUID getRequired() {
    UUID tenantId = CURRENT.get();
    if (tenantId == null) {
      throw new IllegalStateException("Tenant context is not available");
    }
    return tenantId;
  }

  public static UUID getOrNull() {
    return CURRENT.get();
  }

  public static void clear() {
    CURRENT.remove();
  }
}

