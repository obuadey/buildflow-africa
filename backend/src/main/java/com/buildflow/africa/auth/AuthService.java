package com.buildflow.africa.auth;

import com.buildflow.africa.membership.TenantMembership;
import com.buildflow.africa.membership.TenantMembershipRepository;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import com.buildflow.africa.users.User;
import com.buildflow.africa.users.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration, sign-in, refresh rotation and credential recovery.
 *
 * Design points that matter:
 * - refresh tokens are random 256-bit values; only a SHA-256 hash is stored
 * - every refresh rotates the token, and reusing a spent one revokes the entire family, which is
 *   how a stolen token is detected
 * - failed sign-ins are counted per account and per address, and an account locks for 15 minutes
 * - responses never reveal whether an email exists
 */
@Service
public class AuthService {

  private static final int MAX_FAILURES = 5;
  private static final Duration LOCKOUT = Duration.ofMinutes(15);
  private static final Duration REFRESH_TTL = Duration.ofDays(14);
  private static final Duration RESET_TTL = Duration.ofHours(1);
  private static final SecureRandom RANDOM = new SecureRandom();

  private final UserRepository users;
  private final TenantRepository tenants;
  private final TenantMembershipRepository memberships;
  private final RefreshTokenRepository refreshTokens;
  private final AuthTokenRepository authTokens;
  private final LoginAttemptRepository attempts;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(UserRepository users, TenantRepository tenants, TenantMembershipRepository memberships,
                     RefreshTokenRepository refreshTokens, AuthTokenRepository authTokens,
                     LoginAttemptRepository attempts, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.users = users;
    this.tenants = tenants;
    this.memberships = memberships;
    this.refreshTokens = refreshTokens;
    this.authTokens = authTokens;
    this.attempts = attempts;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  public record Tokens(String accessToken, String refreshToken, long expiresInSeconds,
                       UUID userId, String email, String fullName, String tenantSlug) {}

  /* ------------------------------------------------------------------ registration */

  @Transactional
  public Tokens register(String fullName, String email, String password, String companyName,
                         String region, String city, String phone, String userAgent, String ip) {
    validatePassword(password, email, fullName);
    String normalised = email.trim().toLowerCase(Locale.ROOT);
    if (users.findByEmailIgnoreCase(normalised).isPresent()) {
      throw new IllegalArgumentException("An account already exists for that email.");
    }

    Tenant tenant = new Tenant();
    tenant.setName(companyName.trim());
    tenant.setSlug(uniqueSlug(companyName));
    tenant.setRegion(region);
    tenant.setCity(city);
    tenant.setPhone(phone);
    tenant.setEmail(normalised);
    tenant = tenants.save(tenant);

    User user = new User();
    user.setTenantId(tenant.getId());
    user.setFullName(fullName.trim());
    user.setEmail(normalised);
    user.setPasswordHash(passwordEncoder.encode(password));
    user.setPasswordChangedAt(Instant.now());
    user = users.save(user);

    TenantMembership membership = new TenantMembership();
    membership.setTenantId(tenant.getId());
    membership.setUserId(user.getId());
    membership.setRole("OWNER");
    membership.setStatus("ACTIVE");
    memberships.save(membership);

    return issue(user, tenant.getSlug(), userAgent, ip);
  }

  /** Slugs are unique across the platform because they appear in every URL. */
  private String uniqueSlug(String companyName) {
    String base = companyName.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    if (base.isBlank()) {
      base = "company";
    }
    String candidate = base;
    int suffix = 2;
    while (tenants.findBySlugIgnoreCase(candidate).isPresent()) {
      candidate = base + "-" + suffix++;
    }
    return candidate;
  }

  /* ------------------------------------------------------------------------ login */

  @Transactional
  public Tokens login(String email, String password, String userAgent, String ip) {
    String normalised = email.trim().toLowerCase(Locale.ROOT);
    Instant window = Instant.now().minus(Duration.ofMinutes(15));

    if (ip != null && attempts.countByIpAddressAndSuccessfulFalseAndAttemptedAtAfter(ip, window) > 20) {
      throw new LockedException("Too many attempts from this address. Try again in a few minutes.");
    }

    User user = users.findByEmailIgnoreCase(normalised).orElse(null);
    if (user == null) {
      recordAttempt(normalised, ip, false);
      // Same message and roughly the same work as a wrong password, so the response cannot be
      // used to discover which addresses have accounts.
      passwordEncoder.encode(password);
      throw new BadCredentialsException("That email and password did not match an account.");
    }
    if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
      throw new LockedException("This account is locked for a few minutes after repeated failed sign-ins.");
    }
    if (!user.isEnabled()) {
      throw new LockedException("This account has been disabled. Ask an administrator to restore it.");
    }
    if (!passwordEncoder.matches(password, user.getPasswordHash())) {
      int failures = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
      user.setFailedLoginAttempts(failures);
      if (failures >= MAX_FAILURES) {
        user.setLockedUntil(Instant.now().plus(LOCKOUT));
        user.setFailedLoginAttempts(0);
      }
      users.save(user);
      recordAttempt(normalised, ip, false);
      throw new BadCredentialsException("That email and password did not match an account.");
    }

    user.setFailedLoginAttempts(0);
    user.setLockedUntil(null);
    user.setLastLoginAt(Instant.now());
    users.save(user);
    recordAttempt(normalised, ip, true);

    String slug = memberships.findByUserIdAndStatus(user.getId(), "ACTIVE").stream()
        .findFirst()
        .flatMap(membership -> tenants.findById(membership.getTenantId()))
        .map(Tenant::getSlug)
        .orElse(null);
    return issue(user, slug, userAgent, ip);
  }

  private void recordAttempt(String email, String ip, boolean successful) {
    LoginAttempt attempt = new LoginAttempt();
    attempt.setEmail(email);
    attempt.setIpAddress(ip);
    attempt.setSuccessful(successful);
    attempts.save(attempt);
  }

  /* ---------------------------------------------------------------------- refresh */

  @Transactional
  public Tokens refresh(String presentedToken, String userAgent, String ip) {
    String hash = sha256(presentedToken);
    RefreshToken stored = refreshTokens.findByTokenHash(hash)
        .orElseThrow(() -> new BadCredentialsException("Your session has expired. Sign in again."));

    if (stored.getRevokedAt() != null) {
      // A spent token has been presented again: treat the family as compromised.
      refreshTokens.findByFamilyId(stored.getFamilyId()).forEach(token -> {
        token.setRevokedAt(Instant.now());
        refreshTokens.save(token);
      });
      users.findById(stored.getUserId()).ifPresent(user -> {
        user.setTokenVersion(user.getTokenVersion() + 1);
        users.save(user);
      });
      throw new BadCredentialsException("That session was already used. Sign in again.");
    }
    if (stored.getExpiresAt().isBefore(Instant.now())) {
      throw new BadCredentialsException("Your session has expired. Sign in again.");
    }

    User user = users.findById(stored.getUserId())
        .orElseThrow(() -> new BadCredentialsException("Your session is no longer valid."));

    String slug = memberships.findByUserIdAndStatus(user.getId(), "ACTIVE").stream()
        .findFirst()
        .flatMap(membership -> tenants.findById(membership.getTenantId()))
        .map(Tenant::getSlug)
        .orElse(null);

    Tokens tokens = issue(user, slug, userAgent, ip, stored.getFamilyId());
    stored.setRevokedAt(Instant.now());
    refreshTokens.save(stored);
    return tokens;
  }

  @Transactional
  public void logout(String presentedToken) {
    if (presentedToken == null || presentedToken.isBlank()) {
      return;
    }
    refreshTokens.findByTokenHash(sha256(presentedToken)).ifPresent(token -> {
      token.setRevokedAt(Instant.now());
      refreshTokens.save(token);
    });
  }

  @Transactional
  public void revokeAll(UUID userId) {
    refreshTokens.findByUserIdAndRevokedAtIsNull(userId).forEach(token -> {
      token.setRevokedAt(Instant.now());
      refreshTokens.save(token);
    });
    users.findById(userId).ifPresent(user -> {
      user.setTokenVersion(user.getTokenVersion() + 1);
      users.save(user);
    });
  }

  /* -------------------------------------------------------------- password recovery */

  /** Always succeeds from the caller's point of view, so it cannot be used to probe for accounts. */
  @Transactional
  public String requestPasswordReset(String email) {
    User user = users.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
    if (user == null) {
      return null;
    }
    String token = randomToken();
    AuthToken row = new AuthToken();
    row.setUserId(user.getId());
    row.setPurpose("PASSWORD_RESET");
    row.setTokenHash(sha256(token));
    row.setExpiresAt(Instant.now().plus(RESET_TTL));
    authTokens.save(row);
    return token;
  }

  @Transactional
  public void resetPassword(String token, String newPassword) {
    AuthToken row = authTokens.findByTokenHashAndPurpose(sha256(token), "PASSWORD_RESET")
        .orElseThrow(() -> new BadCredentialsException("That reset link is not valid."));
    if (row.getConsumedAt() != null || row.getExpiresAt().isBefore(Instant.now())) {
      throw new BadCredentialsException("That reset link has expired. Request a new one.");
    }
    User user = users.findById(row.getUserId())
        .orElseThrow(() -> new BadCredentialsException("That reset link is not valid."));
    validatePassword(newPassword, user.getEmail(), user.getFullName());

    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.setPasswordChangedAt(Instant.now());
    user.setFailedLoginAttempts(0);
    user.setLockedUntil(null);
    user.setMustChangePassword(false);
    users.save(user);

    row.setConsumedAt(Instant.now());
    authTokens.save(row);
    revokeAll(user.getId());
  }

  @Transactional
  public void changePassword(UUID userId, String currentPassword, String newPassword) {
    User user = users.findById(userId).orElseThrow();
    if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
      throw new BadCredentialsException("Your current password is not correct.");
    }
    validatePassword(newPassword, user.getEmail(), user.getFullName());
    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.setPasswordChangedAt(Instant.now());
    // Whoever else knew the old password no longer holds a working credential.
    user.setMustChangePassword(false);
    users.save(user);
    revokeAll(userId);
  }

  /* ------------------------------------------------------------------------ helpers */

  private Tokens issue(User user, String tenantSlug, String userAgent, String ip) {
    return issue(user, tenantSlug, userAgent, ip, UUID.randomUUID());
  }

  private Tokens issue(User user, String tenantSlug, String userAgent, String ip, UUID familyId) {
    String refresh = randomToken();
    RefreshToken token = new RefreshToken();
    token.setUserId(user.getId());
    token.setFamilyId(familyId);
    token.setTokenHash(sha256(refresh));
    token.setExpiresAt(Instant.now().plus(REFRESH_TTL));
    token.setUserAgent(userAgent == null ? null : userAgent.substring(0, Math.min(userAgent.length(), 240)));
    token.setIpAddress(ip);
    refreshTokens.save(token);

    String access = jwtService.createToken(user.getId(), user.getTenantId(), user.getEmail(), user.getTokenVersion());
    return new Tokens(access, refresh, jwtService.ttlSeconds(), user.getId(), user.getEmail(),
        user.getFullName(), tenantSlug);
  }

  /** Length first, then obvious reuse of the account's own details. */
  private void validatePassword(String password, String email, String name) {
    if (password == null || password.length() < 12) {
      throw new IllegalArgumentException("Use at least 12 characters.");
    }
    if (password.length() > 200) {
      throw new IllegalArgumentException("That password is too long.");
    }
    String lower = password.toLowerCase(Locale.ROOT);
    if (email != null && lower.contains(email.toLowerCase(Locale.ROOT).split("@")[0])) {
      throw new IllegalArgumentException("Your password cannot contain your email address.");
    }
    if (name != null) {
      for (String part : name.toLowerCase(Locale.ROOT).split("\\s+")) {
        if (part.length() > 3 && lower.contains(part)) {
          throw new IllegalArgumentException("Your password cannot contain your name.");
        }
      }
    }
    List<String> banned = List.of("password", "12345678", "qwerty", "letmein", "buildflow", "construction");
    for (String candidate : banned) {
      if (lower.contains(candidate)) {
        throw new IllegalArgumentException("That password is too easy to guess.");
      }
    }
  }

  private String randomToken() {
    byte[] bytes = new byte[32];
    RANDOM.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException("SHA-256 is unavailable", ex);
    }
  }
}
