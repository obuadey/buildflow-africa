package com.buildflow.africa.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Access tokens.
 *
 * Short lived (15 minutes by default) and carrying the user's token version, so raising that
 * version on the user record invalidates every token already in circulation. Long-lived access is
 * the refresh token's job, not this one's.
 */
@Service
public class JwtService {

  private final SecretKey key;
  private final long ttlSeconds;

  public JwtService(@Value("${app.jwt-secret}") String secret,
                    @Value("${app.jwt-ttl-seconds:900}") long ttlSeconds) {
    byte[] material = secret.getBytes(StandardCharsets.UTF_8);
    if (material.length < 32) {
      throw new IllegalStateException(
          "app.jwt-secret must be at least 32 bytes. Set a strong value in the environment.");
    }
    this.key = Keys.hmacShaKeyFor(material);
    this.ttlSeconds = ttlSeconds;
  }

  public String createToken(UUID userId, UUID tenantId, String email) {
    return createToken(userId, tenantId, email, 0);
  }

  public String createToken(UUID userId, UUID tenantId, String email, int tokenVersion) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(userId.toString())
        .claim("tenantId", tenantId == null ? null : tenantId.toString())
        .claim("email", email)
        .claim("ver", tokenVersion)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plusSeconds(ttlSeconds)))
        .signWith(key)
        .compact();
  }

  /** Returns null rather than throwing, so a bad token is simply unauthenticated. */
  public AuthPrincipal parse(String token) {
    try {
      Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
      String tenantId = claims.get("tenantId", String.class);
      Integer version = claims.get("ver", Integer.class);
      return new AuthPrincipal(
          UUID.fromString(claims.getSubject()),
          tenantId == null ? null : UUID.fromString(tenantId),
          claims.get("email", String.class),
          version == null ? 0 : version);
    } catch (JwtException | IllegalArgumentException ex) {
      return null;
    }
  }

  public long ttlSeconds() {
    return ttlSeconds;
  }
}
