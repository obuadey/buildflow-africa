package com.buildflow.africa.auth;

import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.membership.TenantAccessService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.annotation.Order;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Resolves which company a request operates on.
 *
 * The caller may name a company with `X-Tenant-Slug`, but that header only *identifies* it —
 * membership is re-checked here against the authenticated principal on every request. Without a
 * verified membership the request is refused, so changing the slug can never reach another
 * company's data.
 */
@Component
@Order(2)
public class TenantResolutionFilter extends OncePerRequestFilter {

  private final TenantAccessService access;

  public TenantResolutionFilter(TenantAccessService access) {
    this.access = access;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Object principal = SecurityContextHolder.getContext().getAuthentication() == null
        ? null
        : SecurityContextHolder.getContext().getAuthentication().getPrincipal();

    String slug = request.getHeader("X-Tenant-Slug");
    if (principal instanceof AuthPrincipal auth && slug != null && !slug.isBlank()) {
      try {
        TenantAccessService.Access resolved = access.resolve(slug.trim(), auth.userId());
        TenantContext.set(resolved.tenant().getId());
        request.setAttribute("tenantRole", resolved.role());
      } catch (AccessDeniedException denied) {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write(
            "{\"code\":\"TENANT_FORBIDDEN\",\"message\":\"You do not have access to this company.\"}");
        return;
      }
    }
    chain.doFilter(request, response);
  }
}
