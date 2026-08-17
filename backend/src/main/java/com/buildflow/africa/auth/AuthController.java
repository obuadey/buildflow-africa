package com.buildflow.africa.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  @PostMapping("/register")
  public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                               HttpServletRequest http) {
    AuthService.Tokens tokens = auth.register(request.fullName(), request.email(), request.password(),
        request.companyName(), request.region(), request.city(), request.phone(),
        http.getHeader("User-Agent"), clientIp(http));
    return ResponseEntity.status(HttpStatus.CREATED).body(AuthResponse.from(tokens));
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
    return AuthResponse.from(auth.login(request.email(), request.password(),
        http.getHeader("User-Agent"), clientIp(http)));
  }

  @PostMapping("/refresh")
  public AuthResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest http) {
    return AuthResponse.from(auth.refresh(request.refreshToken(), http.getHeader("User-Agent"), clientIp(http)));
  }

  @PostMapping("/logout")
  public Map<String, String> logout(@RequestBody(required = false) RefreshRequest request) {
    auth.logout(request == null ? null : request.refreshToken());
    return Map.of("status", "signed out");
  }

  /** Always 202: the response must not reveal whether an account exists. */
  @PostMapping("/password/forgot")
  public ResponseEntity<Map<String, String>> forgot(@Valid @RequestBody ForgotRequest request) {
    String token = auth.requestPasswordReset(request.email());
    Map<String, String> body = new java.util.HashMap<>();
    body.put("message", "If that email has an account, a reset link is on its way.");
    if (token != null && Boolean.parseBoolean(System.getenv().getOrDefault("AUTH_RETURN_RESET_TOKEN", "false"))) {
      body.put("token", token);
    }
    return ResponseEntity.accepted().body(body);
  }

  @PostMapping("/password/reset")
  public Map<String, String> reset(@Valid @RequestBody ResetRequest request) {
    auth.resetPassword(request.token(), request.password());
    return Map.of("message", "Your password has been changed. Sign in with the new one.");
  }

  @PostMapping("/password/change")
  public Map<String, String> change(@Valid @RequestBody ChangeRequest request,
                                    @AuthenticationPrincipal AuthPrincipal principal) {
    auth.changePassword(principal.userId(), request.currentPassword(), request.newPassword());
    return Map.of("message", "Your password has been changed. Other devices have been signed out.");
  }

  private String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }

  public record RegisterRequest(
      @NotBlank String fullName, @Email @NotBlank String email, @NotBlank String password,
      @NotBlank String companyName, String region, String city, String phone) {}

  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

  public record RefreshRequest(@NotBlank String refreshToken) {}

  public record ForgotRequest(@Email @NotBlank String email) {}

  public record ResetRequest(@NotBlank String token, @NotBlank String password) {}

  public record ChangeRequest(@NotBlank String currentPassword, @NotBlank String newPassword) {}

  public record AuthResponse(String token, String refreshToken, long expiresIn, String userId,
                             String email, String fullName, String tenantSlug) {
    static AuthResponse from(AuthService.Tokens tokens) {
      return new AuthResponse(tokens.accessToken(), tokens.refreshToken(), tokens.expiresInSeconds(),
          tokens.userId().toString(), tokens.email(), tokens.fullName(), tokens.tenantSlug());
    }
  }
}
