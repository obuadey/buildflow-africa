package com.buildflow.africa.auth;

import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.users.User;
import com.buildflow.africa.users.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates the bearer token.
 *
 * A signature alone is not enough: the token's version must still match the user record, so
 * revoking sessions or changing a password invalidates tokens that have not yet expired.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UserRepository users;

  public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
    this.jwtService = jwtService;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    try {
      String header = request.getHeader("Authorization");
      if (header != null && header.startsWith("Bearer ")) {
        AuthPrincipal principal = jwtService.parse(header.substring(7));
        if (principal != null) {
          User user = users.findById(principal.userId()).orElse(null);
          boolean current = user != null && user.isEnabled() && user.getTokenVersion() == principal.tokenVersion();
          if (current) {
            TenantContext.set(principal.tenantId());
            var authentication = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
            SecurityContextHolder.getContext().setAuthentication(authentication);
          }
        }
      }
      chain.doFilter(request, response);
    } finally {
      TenantContext.clear();
      SecurityContextHolder.clearContext();
    }
  }
}
