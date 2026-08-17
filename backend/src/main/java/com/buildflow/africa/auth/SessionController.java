package com.buildflow.africa.auth;

import com.buildflow.africa.users.User;
import com.buildflow.africa.users.UserRepository;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Session administration. Signing out other devices raises the user's token version, which
 * invalidates every access token issued before now — the current one is reissued in the response.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class SessionController {

  private final UserRepository users;
  private final JwtService jwtService;

  public SessionController(UserRepository users, JwtService jwtService) {
    this.users = users;
    this.jwtService = jwtService;
  }

  @GetMapping("/me")
  public Map<String, Object> me(@AuthenticationPrincipal AuthPrincipal principal) {
    User user = users.findById(principal.userId()).orElseThrow();
    return Map.of("id", user.getId(), "email", user.getEmail(), "name", user.getFullName());
  }

  @PostMapping("/sessions/revoke-others")
  public Map<String, String> revokeOtherSessions(@AuthenticationPrincipal AuthPrincipal principal) {
    User user = users.findById(principal.userId()).orElseThrow();
    user.setTokenVersion(user.getTokenVersion() + 1);
    users.save(user);
    return Map.of(
        "token", jwtService.createToken(user.getId(), principal.tenantId(), user.getEmail()),
        "message", "Other devices have been signed out.");
  }
}
