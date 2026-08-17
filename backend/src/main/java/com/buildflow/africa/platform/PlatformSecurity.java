package com.buildflow.africa.platform;

import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.users.User;
import com.buildflow.africa.users.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

/**
 * Platform administration is a separate privilege from any tenant role.
 *
 * A company OWNER has no platform access, and a platform operator has no automatic access to a
 * company's data — reaching it requires an audited impersonation session.
 */
@Service
public class PlatformSecurity {

  public static final String SUPPORT = "PLATFORM_SUPPORT";
  public static final String ADMIN = "PLATFORM_ADMIN";
  public static final String OWNER = "PLATFORM_OWNER";

  private static final List<String> ALL = List.of(SUPPORT, ADMIN, OWNER);
  private static final List<String> WRITE = List.of(ADMIN, OWNER);

  private final UserRepository users;

  public PlatformSecurity(UserRepository users) {
    this.users = users;
  }

  /**
   * Confirms the account holds a platform role, and nothing more.
   *
   * Only the console's own identity call uses this. Everything else goes through {@link #require},
   * because an operator who still holds a password someone else chose must be told to replace it
   * rather than be met with a screen implying they have no access at all.
   */
  public User requireIdentity(AuthPrincipal principal) {
    if (principal == null) {
      throw new AccessDeniedException("Platform administration requires an operator account.");
    }
    User user = users.findById(principal.userId())
        .orElseThrow(() -> new AccessDeniedException("Platform administration requires an operator account."));
    if (user.getPlatformRole() == null || !ALL.contains(user.getPlatformRole())) {
      throw new AccessDeniedException("Platform administration requires an operator account.");
    }
    return user;
  }

  public User require(AuthPrincipal principal) {
    User user = requireIdentity(principal);
    if (user.isMustChangePassword()) {
      // A password someone else chose is a shared secret until it is replaced. It is enough to
      // sign in and set a new one, and not enough to administer the platform.
      throw new AccessDeniedException(
          "Set a new password before using platform administration. This account was created with"
              + " a password chosen by someone else.");
    }
    return user;
  }

  public User requireWrite(AuthPrincipal principal) {
    User user = require(principal);
    if (!WRITE.contains(user.getPlatformRole())) {
      throw new AccessDeniedException("Your platform role is read-only.");
    }
    return user;
  }

  public User requireOwner(AuthPrincipal principal) {
    User user = require(principal);
    if (!OWNER.equals(user.getPlatformRole())) {
      throw new AccessDeniedException("This action is restricted to the platform owner.");
    }
    return user;
  }

  public UUID idOf(User user) {
    return user.getId();
  }
}
