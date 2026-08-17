package com.buildflow.africa.platform;

import com.buildflow.africa.audit.AuditLog;
import com.buildflow.africa.audit.AuditLogRepository;
import com.buildflow.africa.audit.AuditService;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.auth.AuthService;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.membership.TenantMembershipRepository;
import com.buildflow.africa.platform.PlatformEntities.Announcement;
import com.buildflow.africa.platform.PlatformEntities.FeatureFlag;
import com.buildflow.africa.platform.PlatformEntities.ImpersonationSession;
import com.buildflow.africa.platform.PlatformEntities.TenantFeatureFlag;




import com.buildflow.africa.projects.ProjectRepository;
import com.buildflow.africa.tenant.Tenant;
import com.buildflow.africa.tenant.TenantRepository;
import com.buildflow.africa.users.User;
import com.buildflow.africa.users.UserRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/**
 * The operator console.
 *
 * Every action here is recorded in the platform-scope audit trail, including read access to a
 * company through impersonation. A platform role never grants silent access to customer data.
 */
@RestController
@RequestMapping("/api/v1/platform")
public class PlatformController {

  private final PlatformSecurity security;
  private final TenantRepository tenants;
  private final UserRepository users;
  private final TenantMembershipRepository memberships;
  private final ProjectRepository projects;
  private final InvoiceRepository invoices;
  private final AuditLogRepository auditLogs;
  private final AuditService audit;
  private final FeatureFlagRepository flags;
  private final TenantFeatureFlagRepository tenantFlags;
  private final AnnouncementRepository announcements;
  private final ImpersonationSessionRepository impersonations;
  private final AuthService authService;

  public PlatformController(PlatformSecurity security, TenantRepository tenants, UserRepository users,
                            TenantMembershipRepository memberships, ProjectRepository projects,
                            InvoiceRepository invoices, AuditLogRepository auditLogs, AuditService audit,
                            FeatureFlagRepository flags, TenantFeatureFlagRepository tenantFlags,
                            AnnouncementRepository announcements,
                            ImpersonationSessionRepository impersonations, AuthService authService) {
    this.security = security;
    this.tenants = tenants;
    this.users = users;
    this.memberships = memberships;
    this.projects = projects;
    this.invoices = invoices;
    this.auditLogs = auditLogs;
    this.audit = audit;
    this.flags = flags;
    this.tenantFlags = tenantFlags;
    this.announcements = announcements;
    this.impersonations = impersonations;
    this.authService = authService;
  }

  /* ---------------------------------------------------------------- identity */

  @GetMapping("/me")
  public Map<String, Object> me(@AuthenticationPrincipal AuthPrincipal principal) {
    // Deliberately the one call an operator can make before replacing a password chosen for them,
    // so the console can send them somewhere useful instead of refusing them outright.
    User operator = security.requireIdentity(principal);
    return Map.of("id", operator.getId(), "email", operator.getEmail(),
        "name", operator.getFullName(), "platformRole", operator.getPlatformRole(),
        "mustChangePassword", operator.isMustChangePassword());
  }

  /* --------------------------------------------------------------- overview */

  @GetMapping("/overview")
  public Overview overview(@AuthenticationPrincipal AuthPrincipal principal) {
    security.require(principal);
    List<Tenant> all = tenants.findAll();
    long active = all.stream().filter(t -> "ACTIVE".equals(t.getStatus())).count();
    long suspended = all.stream().filter(t -> "SUSPENDED".equals(t.getStatus())).count();
    long operators = users.findAll().stream().filter(u -> u.getPlatformRole() != null).count();

    List<PlanCount> plans = all.stream()
        .collect(java.util.stream.Collectors.groupingBy(
            tenant -> tenant.getPlan() == null ? "Starter" : tenant.getPlan(),
            java.util.stream.Collectors.counting()))
        .entrySet().stream()
        .map(entry -> new PlanCount(entry.getKey(), entry.getValue()))
        .sorted(Comparator.comparing(PlanCount::plan))
        .toList();

    return new Overview(all.size(), active, suspended, users.count(), operators,
        memberships.count(), projects.count(), auditLogs.count(), plans);
  }

  /* ---------------------------------------------------------------- tenants */

  @GetMapping("/tenants")
  public PageResponse<TenantView> listTenants(@AuthenticationPrincipal AuthPrincipal principal,
                                              @RequestParam Map<String, String> params) {
    security.require(principal);
    String q = params.getOrDefault("q", "").trim().toLowerCase();
    String status = params.get("status");
    List<TenantView> rows = tenants.findAll().stream()
        .filter(tenant -> q.isEmpty()
            || tenant.getName().toLowerCase().contains(q)
            || (tenant.getSlug() != null && tenant.getSlug().contains(q)))
        .filter(tenant -> status == null || status.isBlank() || status.equalsIgnoreCase(tenant.getStatus()))
        .map(tenant -> TenantView.from(tenant,
            memberships.findByTenantId(tenant.getId()).size(),
            projects.countByTenantId(tenant.getId()),
            invoices.countByTenantId(tenant.getId())))
        .sorted(Comparator.comparing(TenantView::name))
        .toList();

    int page = Math.max(1, Integer.parseInt(params.getOrDefault("page", "1")));
    int size = Math.min(100, Integer.parseInt(params.getOrDefault("size", "25")));
    int from = Math.min((page - 1) * size, rows.size());
    int to = Math.min(from + size, rows.size());
    return new PageResponse<>(rows.subList(from, to), rows.size(), page, size,
        Math.max(1, (int) Math.ceil(rows.size() / (double) size)));
  }

  @GetMapping("/tenants/{id}")
  public TenantDetail tenant(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id) {
    security.require(principal);
    Tenant tenant = tenants.findById(id)
        .orElseThrow(() -> new NotFoundException("TENANT_NOT_FOUND", "That company does not exist."));
    List<MemberView> people = memberships.findByTenantId(id).stream()
        .map(membership -> users.findById(membership.getUserId())
            .map(user -> new MemberView(user.getId(), user.getFullName(), user.getEmail(),
                membership.getRole(), membership.getStatus(), user.getLastLoginAt()))
            .orElse(null))
        .filter(java.util.Objects::nonNull)
        .toList();
    List<FlagView> tenantFlagViews = flags.findAll().stream()
        .map(flag -> new FlagView(flag.getCode(), flag.getDescription(),
            tenantFlags.findByTenantIdAndFlagCode(id, flag.getCode())
                .map(TenantFeatureFlag::isEnabled).orElse(flag.isEnabledGlobally())))
        .toList();
    return new TenantDetail(
        TenantView.from(tenant, people.size(), projects.countByTenantId(id), invoices.countByTenantId(id)),
        people, tenantFlagViews);
  }

  @PostMapping("/tenants/{id}/suspend")
  @Transactional
  public TenantView suspend(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id,
                            @Valid @RequestBody ReasonRequest request) {
    User operator = security.requireWrite(principal);
    Tenant tenant = tenants.findById(id)
        .orElseThrow(() -> new NotFoundException("TENANT_NOT_FOUND", "That company does not exist."));
    String before = tenant.getStatus();
    tenant.setStatus("SUSPENDED");
    tenant.setSuspendedReason(request.reason());
    tenant.setSuspendedAt(Instant.now());
    tenants.save(tenant);
    audit.recordPlatform("TENANT_SUSPENDED", "tenant", id, Map.of("status", before),
        Map.of("status", "SUSPENDED", "reason", request.reason()),
        operator.getEmail(), operator.getId(), id);
    return TenantView.from(tenant, 0, 0, 0);
  }

  @PostMapping("/tenants/{id}/reactivate")
  @Transactional
  public TenantView reactivate(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id) {
    User operator = security.requireWrite(principal);
    Tenant tenant = tenants.findById(id)
        .orElseThrow(() -> new NotFoundException("TENANT_NOT_FOUND", "That company does not exist."));
    tenant.setStatus("ACTIVE");
    tenant.setSuspendedReason(null);
    tenant.setSuspendedAt(null);
    tenants.save(tenant);
    audit.recordPlatform("TENANT_REACTIVATED", "tenant", id, Map.of("status", "SUSPENDED"),
        Map.of("status", "ACTIVE"), operator.getEmail(), operator.getId(), id);
    return TenantView.from(tenant, 0, 0, 0);
  }

  @PostMapping("/tenants/{id}/plan")
  @Transactional
  public TenantView changePlan(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id,
                               @RequestBody Map<String, String> body) {
    User operator = security.requireWrite(principal);
    String plan = body.get("plan");
    if (plan == null || !List.of("Starter", "Business", "Enterprise", "Trial").contains(plan)) {
      throw new IllegalArgumentException("That plan is not available.");
    }
    Tenant tenant = tenants.findById(id)
        .orElseThrow(() -> new NotFoundException("TENANT_NOT_FOUND", "That company does not exist."));
    String before = tenant.getPlan();
    tenant.setPlan(plan);
    tenants.save(tenant);
    audit.recordPlatform("TENANT_PLAN_CHANGED", "tenant", id, Map.of("plan", String.valueOf(before)),
        Map.of("plan", plan), operator.getEmail(), operator.getId(), id);
    return TenantView.from(tenant, 0, 0, 0);
  }

  /**
   * Time-boxed support access. The operator receives a token scoped to the company for 30 minutes,
   * and the session is written to the audit trail before the token is issued.
   */
  @PostMapping("/tenants/{id}/impersonate")
  @Transactional
  public Map<String, Object> impersonate(@AuthenticationPrincipal AuthPrincipal principal,
                                         @PathVariable("id") UUID id,
                                         @Valid @RequestBody ReasonRequest request) {
    User operator = security.requireWrite(principal);
    Tenant tenant = tenants.findById(id)
        .orElseThrow(() -> new NotFoundException("TENANT_NOT_FOUND", "That company does not exist."));

    ImpersonationSession session = new ImpersonationSession();
    session.setAdminUserId(operator.getId());
    session.setTenantId(id);
    session.setReason(request.reason());
    session.setExpiresAt(Instant.now().plus(Duration.ofMinutes(30)));
    impersonations.save(session);

    // A membership is granted for the window so the ordinary tenant filter still governs access.
    var membership = memberships.findByTenantIdAndUserId(id, operator.getId())
        .orElseGet(() -> {
          var created = new com.buildflow.africa.membership.TenantMembership();
          created.setTenantId(id);
          created.setUserId(operator.getId());
          return created;
        });
    membership.setRole("VIEWER");
    membership.setStatus("ACTIVE");
    memberships.save(membership);

    audit.recordPlatform("TENANT_IMPERSONATION_STARTED", "tenant", id, null,
        Map.of("reason", request.reason(), "expiresAt", session.getExpiresAt().toString()),
        operator.getEmail(), operator.getId(), id);

    return Map.of("tenantSlug", tenant.getSlug(), "expiresAt", session.getExpiresAt(),
        "message", "Read-only access granted for 30 minutes and recorded in the audit trail.");
  }

  @PostMapping("/tenants/{id}/end-impersonation")
  @Transactional
  public Map<String, String> endImpersonation(@AuthenticationPrincipal AuthPrincipal principal,
                                              @PathVariable("id") UUID id) {
    User operator = security.requireWrite(principal);
    memberships.findByTenantIdAndUserId(id, operator.getId()).ifPresent(membership -> {
      membership.setStatus("REVOKED");
      memberships.save(membership);
    });
    impersonations.findTop50ByOrderByStartedAtDesc().stream()
        .filter(session -> session.getTenantId().equals(id) && session.getEndedAt() == null)
        .forEach(session -> {
          session.setEndedAt(Instant.now());
          impersonations.save(session);
        });
    audit.recordPlatform("TENANT_IMPERSONATION_ENDED", "tenant", id, null, null,
        operator.getEmail(), operator.getId(), id);
    return Map.of("message", "Support access ended.");
  }

  /* ------------------------------------------------------------------ users */

  @GetMapping("/users")
  public List<PlatformUserView> listUsers(@AuthenticationPrincipal AuthPrincipal principal,
                                          @RequestParam(name = "q", required = false) String q) {
    security.require(principal);
    String needle = q == null ? "" : q.trim().toLowerCase();
    return users.findAll().stream()
        .filter(user -> needle.isEmpty()
            || user.getEmail().toLowerCase().contains(needle)
            || user.getFullName().toLowerCase().contains(needle))
        .sorted(Comparator.comparing(User::getEmail))
        .limit(100)
        .map(user -> new PlatformUserView(user.getId(), user.getFullName(), user.getEmail(),
            user.isEnabled(), user.getLockedUntil(), user.getPlatformRole(),
            user.getLastLoginAt(), memberships.findByUserIdAndStatus(user.getId(), "ACTIVE").size()))
        .toList();
  }

  @PostMapping("/users/{id}/unlock")
  public PlatformUserView unlock(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id) {
    User operator = security.requireWrite(principal);
    User user = users.findById(id)
        .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "That user does not exist."));
    user.setLockedUntil(null);
    user.setFailedLoginAttempts(0);
    users.save(user);
    audit.recordPlatform("USER_UNLOCKED", "user", id, null, null, operator.getEmail(), operator.getId(), null);
    return new PlatformUserView(user.getId(), user.getFullName(), user.getEmail(), user.isEnabled(),
        null, user.getPlatformRole(), user.getLastLoginAt(), 0);
  }

  @PostMapping("/users/{id}/disable")
  public PlatformUserView disable(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id,
                                  @Valid @RequestBody ReasonRequest request) {
    User operator = security.requireWrite(principal);
    User user = users.findById(id)
        .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "That user does not exist."));
    user.setEnabled(false);
    users.save(user);
    authService.revokeAll(user.getId());
    audit.recordPlatform("USER_DISABLED", "user", id, Map.of("enabled", true),
        Map.of("enabled", false, "reason", request.reason()), operator.getEmail(), operator.getId(), null);
    return new PlatformUserView(user.getId(), user.getFullName(), user.getEmail(), false,
        user.getLockedUntil(), user.getPlatformRole(), user.getLastLoginAt(), 0);
  }

  @PostMapping("/users/{id}/enable")
  public PlatformUserView enable(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id) {
    User operator = security.requireWrite(principal);
    User user = users.findById(id)
        .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "That user does not exist."));
    user.setEnabled(true);
    users.save(user);
    audit.recordPlatform("USER_ENABLED", "user", id, null, null, operator.getEmail(), operator.getId(), null);
    return new PlatformUserView(user.getId(), user.getFullName(), user.getEmail(), true,
        user.getLockedUntil(), user.getPlatformRole(), user.getLastLoginAt(), 0);
  }

  @PostMapping("/users/{id}/revoke-sessions")
  public Map<String, String> revokeSessions(@AuthenticationPrincipal AuthPrincipal principal,
                                            @PathVariable("id") UUID id) {
    User operator = security.requireWrite(principal);
    authService.revokeAll(id);
    audit.recordPlatform("USER_SESSIONS_REVOKED", "user", id, null, null,
        operator.getEmail(), operator.getId(), null);
    return Map.of("message", "Every session for that user has been revoked.");
  }

  /** Granting platform access is restricted to the platform owner. */
  @PostMapping("/users/{id}/platform-role")
  public PlatformUserView setPlatformRole(@AuthenticationPrincipal AuthPrincipal principal,
                                          @PathVariable("id") UUID id, @RequestBody Map<String, String> body) {
    User operator = security.requireOwner(principal);
    String role = body.get("platformRole");
    if (role != null && !List.of(PlatformSecurity.SUPPORT, PlatformSecurity.ADMIN,
        PlatformSecurity.OWNER).contains(role)) {
      throw new IllegalArgumentException("That platform role does not exist.");
    }
    User user = users.findById(id)
        .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "That user does not exist."));
    String before = user.getPlatformRole();
    user.setPlatformRole(role);
    user.setTokenVersion(user.getTokenVersion() + 1);
    users.save(user);
    audit.recordPlatform("PLATFORM_ROLE_CHANGED", "user", id,
        Map.of("platformRole", String.valueOf(before)), Map.of("platformRole", String.valueOf(role)),
        operator.getEmail(), operator.getId(), null);
    return new PlatformUserView(user.getId(), user.getFullName(), user.getEmail(), user.isEnabled(),
        user.getLockedUntil(), role, user.getLastLoginAt(), 0);
  }

  /* ------------------------------------------------------------------ audit */

  @GetMapping("/audit")
  public PageResponse<AuditView> audit(@AuthenticationPrincipal AuthPrincipal principal,
                                       @RequestParam Map<String, String> params) {
    security.require(principal);
    String q = params.getOrDefault("q", "").trim().toLowerCase();
    String scope = params.get("scope");
    String action = params.get("action");
    String tenantId = params.get("tenant");

    Specification<AuditLog> spec = (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (!q.isEmpty()) {
        predicates.add(cb.or(
            cb.like(cb.lower(root.get("action")), "%" + q + "%"),
            cb.like(cb.lower(root.get("entityType")), "%" + q + "%"),
            cb.like(cb.lower(root.get("actorEmail").as(String.class)), "%" + q + "%")));
      }
      if (scope != null && !scope.isBlank()) {
        predicates.add(cb.equal(root.get("scope"), scope));
      }
      if (action != null && !action.isBlank()) {
        predicates.add(cb.equal(root.get("action"), action));
      }
      if (tenantId != null && !tenantId.isBlank()) {
        predicates.add(cb.equal(root.get("tenantId"), UUID.fromString(tenantId)));
      }
      return cb.and(predicates.toArray(Predicate[]::new));
    };

    int page = Math.max(1, Integer.parseInt(params.getOrDefault("page", "1")));
    int size = Math.min(200, Integer.parseInt(params.getOrDefault("size", "50")));
    Page<AuditLog> result = auditLogs.findAll(spec,
        PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    return PageResponse.of(result, AuditView::from);
  }

  /* ------------------------------------------------------------------ flags */

  @GetMapping("/flags")
  public List<FeatureFlagView> listFlags(@AuthenticationPrincipal AuthPrincipal principal) {
    security.require(principal);
    return flags.findAll().stream()
        .map(flag -> new FeatureFlagView(flag.getId(), flag.getCode(), flag.getDescription(),
            flag.isEnabledGlobally()))
        .sorted(Comparator.comparing(FeatureFlagView::code))
        .toList();
  }

  @PatchMapping("/flags/{code}")
  public FeatureFlagView setFlag(@AuthenticationPrincipal AuthPrincipal principal,
                                 @PathVariable("code") String code, @RequestBody Map<String, Boolean> body) {
    User operator = security.requireWrite(principal);
    FeatureFlag flag = flags.findByCode(code)
        .orElseThrow(() -> new NotFoundException("FLAG_NOT_FOUND", "That feature flag does not exist."));
    boolean before = flag.isEnabledGlobally();
    flag.setEnabledGlobally(Boolean.TRUE.equals(body.get("enabled")));
    flag.setUpdatedAt(Instant.now());
    flags.save(flag);
    audit.recordPlatform("FEATURE_FLAG_CHANGED", "feature_flag", flag.getId(),
        Map.of("enabled", before), Map.of("enabled", flag.isEnabledGlobally()),
        operator.getEmail(), operator.getId(), null);
    return new FeatureFlagView(flag.getId(), flag.getCode(), flag.getDescription(), flag.isEnabledGlobally());
  }

  @PatchMapping("/tenants/{id}/flags/{code}")
  public FlagView setTenantFlag(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable("id") UUID id,
                                @PathVariable("code") String code, @RequestBody Map<String, Boolean> body) {
    User operator = security.requireWrite(principal);
    TenantFeatureFlag row = tenantFlags.findByTenantIdAndFlagCode(id, code)
        .orElseGet(() -> {
          TenantFeatureFlag created = new TenantFeatureFlag();
          created.setTenantId(id);
          created.setFlagCode(code);
          return created;
        });
    row.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
    row.setUpdatedAt(Instant.now());
    tenantFlags.save(row);
    audit.recordPlatform("TENANT_FEATURE_FLAG_CHANGED", "feature_flag", id, null,
        Map.of("code", code, "enabled", row.isEnabled()), operator.getEmail(), operator.getId(), id);
    return new FlagView(code, null, row.isEnabled());
  }

  /* ---------------------------------------------------------- announcements */

  @GetMapping("/announcements")
  public List<Announcement> listAnnouncements(@AuthenticationPrincipal AuthPrincipal principal) {
    security.require(principal);
    return announcements.findAll(Sort.by(Sort.Direction.DESC, "startsAt"));
  }

  @PostMapping("/announcements")
  public Announcement createAnnouncement(@AuthenticationPrincipal AuthPrincipal principal,
                                         @Valid @RequestBody AnnouncementRequest request) {
    User operator = security.requireWrite(principal);
    Announcement announcement = new Announcement();
    announcement.setTitle(request.title());
    announcement.setBody(request.body());
    if (request.severity() != null) announcement.setSeverity(request.severity());
    if (request.audience() != null) announcement.setAudience(request.audience());
    announcement.setPublished(Boolean.TRUE.equals(request.published()));
    announcement.setCreatedBy(operator.getEmail());
    Announcement saved = announcements.save(announcement);
    audit.recordPlatform("ANNOUNCEMENT_CREATED", "announcement", saved.getId(), null,
        Map.of("title", saved.getTitle(), "published", saved.isPublished()),
        operator.getEmail(), operator.getId(), null);
    return saved;
  }

  @PatchMapping("/announcements/{id}")
  public Announcement updateAnnouncement(@AuthenticationPrincipal AuthPrincipal principal,
                                         @PathVariable("id") UUID id, @RequestBody AnnouncementRequest request) {
    User operator = security.requireWrite(principal);
    Announcement announcement = announcements.findById(id)
        .orElseThrow(() -> new NotFoundException("ANNOUNCEMENT_NOT_FOUND", "That announcement does not exist."));
    if (request.title() != null) announcement.setTitle(request.title());
    if (request.body() != null) announcement.setBody(request.body());
    if (request.severity() != null) announcement.setSeverity(request.severity());
    if (request.audience() != null) announcement.setAudience(request.audience());
    if (request.published() != null) announcement.setPublished(request.published());
    announcement.setUpdatedAt(Instant.now());
    Announcement saved = announcements.save(announcement);
    audit.recordPlatform("ANNOUNCEMENT_UPDATED", "announcement", id, null,
        Map.of("published", saved.isPublished()), operator.getEmail(), operator.getId(), null);
    return saved;
  }

  /* ---------------------------------------------------------- impersonation log */

  @GetMapping("/impersonations")
  public List<ImpersonationSession> impersonationLog(@AuthenticationPrincipal AuthPrincipal principal) {
    security.require(principal);
    return impersonations.findTop50ByOrderByStartedAtDesc();
  }

  /* --------------------------------------------------------------- responses */

  public record ReasonRequest(@NotBlank String reason) {}

  public record AnnouncementRequest(@NotBlank String title, @NotBlank String body, String severity,
                                    String audience, Boolean published) {}

  public record PlanCount(String plan, long count) {}

  public record Overview(long tenants, long activeTenants, long suspendedTenants, long users,
                         long operators, long memberships, long projects, long auditEntries,
                         List<PlanCount> plans) {}

  public record TenantView(UUID id, String slug, String name, String region, String city, String plan,
                           String status, String suspendedReason, int members, long projects,
                           long invoices, Instant createdAt) {
    static TenantView from(Tenant tenant, int members, long projects, long invoices) {
      return new TenantView(tenant.getId(), tenant.getSlug(), tenant.getName(), tenant.getRegion(),
          tenant.getCity(), tenant.getPlan(), tenant.getStatus(), tenant.getSuspendedReason(),
          members, projects, invoices, tenant.getCreatedAt());
    }
  }

  public record MemberView(UUID userId, String name, String email, String role, String status,
                           Instant lastLogin) {}

  public record FlagView(String code, String description, boolean enabled) {}

  public record TenantDetail(TenantView tenant, List<MemberView> members, List<FlagView> flags) {}

  public record PlatformUserView(UUID id, String name, String email, boolean enabled, Instant lockedUntil,
                                 String platformRole, Instant lastLogin, int companies) {}

  public record FeatureFlagView(UUID id, String code, String description, boolean enabledGlobally) {}

  public record AuditView(UUID id, String scope, UUID tenantId, String action, String entityType,
                          UUID entityId, String actor, String previousValues, String newValues,
                          String ipAddress, Instant at) {
    static AuditView from(AuditLog log) {
      return new AuditView(log.getId(), log.getScope(), log.getTenantId(), log.getAction(),
          log.getEntityType(), log.getEntityId(), log.getActorEmail(), log.getPreviousValues(),
          log.getNewValues(), log.getIpAddress(), log.getCreatedAt());
    }
  }
}
