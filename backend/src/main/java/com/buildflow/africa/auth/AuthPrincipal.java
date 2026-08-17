package com.buildflow.africa.auth;

import java.util.UUID;

/** The authenticated caller. `tokenVersion` is checked against the user record on every request. */
public record AuthPrincipal(UUID userId, UUID tenantId, String email, int tokenVersion) {

  public AuthPrincipal(UUID userId, UUID tenantId, String email) {
    this(userId, tenantId, email, 0);
  }
}
