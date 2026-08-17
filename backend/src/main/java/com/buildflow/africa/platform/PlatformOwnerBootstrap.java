package com.buildflow.africa.platform;

import com.buildflow.africa.membership.TenantMembership;
import com.buildflow.africa.membership.TenantMembershipRepository;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import com.buildflow.africa.users.User;
import com.buildflow.africa.users.UserRepository;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the first platform operator, so a fresh installation has someone who can sign in and
 * administer it.
 *
 * The credential normally comes from the environment. Local/demo installs also have a known
 * handover credential configured in application.yml so the platform console is reachable in a
 * fresh database.
 *
 * Any seeded account is created with {@code mustChangePassword} set, and
 * {@link PlatformSecurity#require} refuses every administrative call until it is cleared. The
 * bootstrap credential therefore opens exactly one door — changing itself — and nothing else.
 *
 * Running twice is safe. An existing account is promoted if needed, but its password is never
 * touched: rotating a working operator's password on every restart would be its own outage.
 */
@Component
@Order(20)
public class PlatformOwnerBootstrap implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(PlatformOwnerBootstrap.class);

  /** Short enough to be typed once, long enough not to be guessed. */
  private static final int MIN_PASSWORD_LENGTH = 12;

  private static final String SYSTEM_TENANT_SLUG = "platform-operations";

  private final UserRepository users;
  private final TenantRepository tenants;
  private final TenantMembershipRepository memberships;
  private final PasswordEncoder passwordEncoder;
  private final String email;
  private final String password;
  private final String name;

  public PlatformOwnerBootstrap(UserRepository users, TenantRepository tenants,
                                TenantMembershipRepository memberships, PasswordEncoder passwordEncoder,
                                @Value("${platform.owner.email:admin@buildflow.africa}") String email,
                                @Value("${platform.owner.password:BuildFlow@2026!Admin}") String password,
                                @Value("${platform.owner.name:Platform Super Admin}") String name) {
    this.users = users;
    this.tenants = tenants;
    this.memberships = memberships;
    this.passwordEncoder = passwordEncoder;
    this.email = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    this.password = password == null ? "" : password;
    this.name = name;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (email.isBlank()) {
      log.info("No platform owner seeded: platform.owner.email is blank.");
      return;
    }

    Optional<User> existing = users.findByEmailIgnoreCase(email);
    if (existing.isPresent()) {
      User user = existing.get();
      if (PlatformSecurity.OWNER.equals(user.getPlatformRole())) {
        log.info("Platform owner {} is already in place.", email);
        return;
      }
      // The account exists for another reason — someone registered a company with this address.
      // Promoting it is what was asked for; overwriting its password was not.
      user.setPlatformRole(PlatformSecurity.OWNER);
      users.save(user);
      log.info("Promoted the existing account {} to platform owner.", email);
      return;
    }

    if (password.length() < MIN_PASSWORD_LENGTH) {
      log.error("Platform owner not seeded: PLATFORM_OWNER_PASSWORD must be at least {} characters."
          + " Set a longer value and restart.", MIN_PASSWORD_LENGTH);
      return;
    }

    Tenant systemTenant = tenants.findBySlugIgnoreCase(SYSTEM_TENANT_SLUG).orElseGet(() -> {
      Tenant created = new Tenant();
      created.setName("Platform Operations");
      created.setSlug(SYSTEM_TENANT_SLUG);
      created.setPlan("Internal");
      created.setStatus("ACTIVE");
      created.setRegion("Greater Accra");
      created.setCity("Accra");
      return tenants.save(created);
    });

    User owner = new User();
    owner.setTenantId(systemTenant.getId());
    owner.setFullName(name);
    owner.setEmail(email);
    owner.setPasswordHash(passwordEncoder.encode(password));
    owner.setPlatformRole(PlatformSecurity.OWNER);
    owner.setEnabled(true);
    owner.setEmailVerified(true);
    owner.setMustChangePassword(true);
    users.save(owner);

    TenantMembership membership = new TenantMembership();
    membership.setTenantId(systemTenant.getId());
    membership.setUserId(owner.getId());
    membership.setRole("OWNER");
    membership.setStatus("ACTIVE");
    memberships.save(membership);

    log.info("Seeded platform owner {}. The first sign-in must set a new password before any"
        + " administrative action is permitted.", email);
  }
}
