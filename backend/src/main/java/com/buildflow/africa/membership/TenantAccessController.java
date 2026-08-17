package com.buildflow.africa.membership;

import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.users.User;
import com.buildflow.africa.users.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Company switching, slug resolution and team administration. */
@RestController
@RequestMapping("/api/v1")
public class TenantAccessController {

  private static final List<String> ADMIN_ROLES = List.of("OWNER", "ADMIN");
  private static final List<String> ALL_ROLES = List.of(
      "OWNER", "ADMIN", "ESTIMATOR", "PROJECT_MANAGER", "ACCOUNTANT", "STAFF", "VIEWER");
  private static final List<String> STATUSES = List.of("ACTIVE", "INVITED", "DISABLED");

  private final TenantAccessService access;
  private final TenantMembershipRepository memberships;
  private final UserRepository users;

  public TenantAccessController(TenantAccessService access, TenantMembershipRepository memberships,
                                UserRepository users) {
    this.access = access;
    this.memberships = memberships;
    this.users = users;
  }

  /** Companies the caller may open, used by the tenant switcher. */
  @GetMapping("/tenants")
  public List<TenantView> tenants(@AuthenticationPrincipal AuthPrincipal principal) {
    return access.membershipsOf(principal.userId()).stream()
        .map(entry -> TenantView.from(entry.tenant(), entry.role()))
        .toList();
  }

  /** Resolves a slug from the URL. Returns 403 when the caller is not a member. */
  @GetMapping("/tenants/{slug}")
  public TenantView resolve(@PathVariable("slug") String slug, @AuthenticationPrincipal AuthPrincipal principal) {
    TenantAccessService.Access resolved = access.resolve(slug, principal.userId());
    return TenantView.from(resolved.tenant(), resolved.role());
  }

  @GetMapping("/team")
  public PageResponse<MemberView> team(@RequestParam Map<String, String> params,
                                       @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ALL_ROLES);

    List<MemberView> rows = memberships.findByTenantId(tenantId).stream()
        .map(membership -> users.findById(membership.getUserId())
            .map(user -> MemberView.from(membership, user))
            .orElse(null))
        .filter(Objects::nonNull)
        .filter(member -> matches(member, params))
        .sorted(Comparator.comparing(MemberView::name, Comparator.nullsLast(String::compareToIgnoreCase)))
        .toList();

    // The team of a single company is small enough to filter in memory; the shape still matches
    // every other list so the table, search and paging controls behave the same.
    int page = Math.max(parse(params.get("page"), 1), 1);
    int size = Math.min(Math.max(parse(params.get("size"), 25), 1), 200);
    int from = Math.min((page - 1) * size, rows.size());
    int to = Math.min(from + size, rows.size());
    return new PageResponse<>(rows.subList(from, to), rows.size(), page, size,
        Math.max((int) Math.ceil(rows.size() / (double) size), 1));
  }

  @PostMapping("/team")
  public MemberView invite(@Valid @RequestBody InviteRequest request,
                           @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    String role = request.role() == null ? "STAFF" : request.role();
    if (!ALL_ROLES.contains(role)) {
      throw new IllegalArgumentException("That is not a role this product has.");
    }

    User user = users.findByEmailIgnoreCase(request.email()).orElseGet(() -> {
      User created = new User();
      created.setTenantId(tenantId);
      created.setFullName(request.name());
      created.setEmail(request.email().toLowerCase(Locale.ROOT));
      // Not a usable hash: the account cannot be signed into until the invitation is accepted
      // and a password is set.
      created.setPasswordHash("!invited");
      return users.save(created);
    });

    TenantMembership membership = memberships.findByTenantIdAndUserId(tenantId, user.getId())
        .orElseGet(TenantMembership::new);
    membership.setTenantId(tenantId);
    membership.setUserId(user.getId());
    membership.setRole(role);
    membership.setStatus("INVITED");
    return MemberView.from(memberships.save(membership), user);
  }

  @PatchMapping("/team/{userId}")
  public MemberView update(@PathVariable("userId") UUID userId, @RequestBody MemberUpdate update,
                           @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    TenantMembership membership = memberships.findByTenantIdAndUserId(tenantId, userId)
        .orElseThrow(() -> new AccessDeniedException("That person is not a member of this company."));

    if (update.role() != null) {
      if (!ALL_ROLES.contains(update.role())) {
        throw new IllegalArgumentException("That is not a role this product has.");
      }
      guardLastOwner(tenantId, membership, update.role(), membership.getStatus());
      membership.setRole(update.role());
    }
    if (update.status() != null) {
      if (!STATUSES.contains(update.status())) {
        throw new IllegalArgumentException("That is not a valid membership status.");
      }
      guardLastOwner(tenantId, membership, membership.getRole(), update.status());
      membership.setStatus(update.status());
    }

    TenantMembership saved = memberships.save(membership);
    User user = users.findById(userId)
        .orElseThrow(() -> new AccessDeniedException("That person is not a member of this company."));
    return MemberView.from(saved, user);
  }

  /** A company must keep at least one active owner, or nobody can administer it again. */
  private void guardLastOwner(UUID tenantId, TenantMembership membership, String nextRole,
                              String nextStatus) {
    boolean wasActiveOwner =
        "OWNER".equals(membership.getRole()) && "ACTIVE".equals(membership.getStatus());
    boolean staysActiveOwner = "OWNER".equals(nextRole) && "ACTIVE".equals(nextStatus);
    if (!wasActiveOwner || staysActiveOwner) {
      return;
    }
    long owners = memberships.findByTenantId(tenantId).stream()
        .filter(other -> "OWNER".equals(other.getRole()) && "ACTIVE".equals(other.getStatus()))
        .count();
    if (owners <= 1) {
      throw new IllegalArgumentException(
          "This is the last owner of the company. Make someone else an owner first.");
    }
  }

  private boolean matches(MemberView member, Map<String, String> params) {
    String q = params.get("q");
    if (q != null && !q.isBlank()) {
      String needle = q.trim().toLowerCase(Locale.ROOT);
      boolean hit = contains(member.name(), needle) || contains(member.email(), needle)
          || contains(member.role(), needle);
      if (!hit) {
        return false;
      }
    }
    return in(params.get("role"), member.role()) && in(params.get("status"), member.status());
  }

  private boolean in(String filter, String value) {
    if (filter == null || filter.isBlank()) {
      return true;
    }
    return Arrays.stream(filter.split(","))
        .map(String::trim).filter(part -> !part.isEmpty())
        .anyMatch(part -> part.equalsIgnoreCase(value));
  }

  private boolean contains(String value, String needle) {
    return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
  }

  private int parse(String value, int fallback) {
    try {
      return value == null ? fallback : Integer.parseInt(value);
    } catch (NumberFormatException ex) {
      return fallback;
    }
  }

  public record InviteRequest(@NotBlank String name, @Email @NotBlank String email, String role) {}

  public record MemberUpdate(String role, String status) {}

  public record TenantView(UUID id, String slug, String name, String region, String city,
                           String currency, String plan, String tin, String initials,
                           String accentColor, String role) {
    static TenantView from(Tenant tenant, String role) {
      return new TenantView(tenant.getId(), tenant.getSlug(), tenant.getName(), tenant.getRegion(),
          tenant.getCity(), tenant.getDefaultCurrency(), tenant.getPlan(), tenant.getTin(),
          initials(tenant.getName()), tenant.getAccentColor(), role);
    }

    private static String initials(String name) {
      return name == null ? "" : Arrays.stream(name.trim().split("\\s+"))
          .filter(part -> !part.isEmpty())
          .limit(2)
          .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT))
          .collect(Collectors.joining());
    }
  }

  public record MemberView(UUID id, String name, String email, String role, String status,
                           Instant lastActive) {
    static MemberView from(TenantMembership membership, User user) {
      return new MemberView(user.getId(), user.getFullName(), user.getEmail(), membership.getRole(),
          membership.getStatus(), membership.getLastActiveAt());
    }
  }
}
