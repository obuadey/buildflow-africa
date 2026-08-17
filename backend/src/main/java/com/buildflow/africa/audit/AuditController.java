package com.buildflow.africa.audit;

import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** A company's own audit trail. Read-only by design: entries are never edited or deleted. */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

  private static final List<String> SEARCHABLE = List.of("action", "entityType", "actorEmail");
  private static final Map<String, String> FILTERS =
      Map.of("action", "action", "entityType", "entityType", "actor", "actorEmail");

  private final AuditLogRepository repository;

  public AuditController(AuditLogRepository repository) {
    this.repository = repository;
  }

  @GetMapping
  public PageResponse<AuditView> list(@RequestParam Map<String, String> params) {
    Page<AuditLog> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    return PageResponse.of(page, AuditView::from);
  }

  public record AuditView(UUID id, String action, String entityType, UUID entityId, String actor,
                          String previousValues, String newValues, String ipAddress, Instant at) {
    static AuditView from(AuditLog log) {
      return new AuditView(log.getId(), log.getAction(), log.getEntityType(), log.getEntityId(),
          log.getActorEmail(), log.getPreviousValues(), log.getNewValues(), log.getIpAddress(),
          log.getCreatedAt());
    }
  }
}
