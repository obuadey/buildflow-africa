package com.buildflow.africa.audit;

import com.buildflow.africa.common.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Writes the audit trail.
 *
 * Financial records are audited with their before and after state, because a dispute six months
 * later is settled from this table. Audit writes never throw into the caller: losing a log line
 * must not roll back a payment.
 */
@Service
public class AuditService {

  private final AuditLogRepository repository;
  private final ObjectMapper mapper = new ObjectMapper();

  public AuditService(AuditLogRepository repository) {
    this.repository = repository;
  }

  public void record(String action, String entityType, UUID entityId, Object before, Object after,
                     String actorEmail, UUID userId) {
    write("TENANT", TenantContext.getOrNull(), action, entityType, entityId, before, after, actorEmail, userId);
  }

  /** Platform-scope entry: an operator action, which may or may not name a company. */
  public void recordPlatform(String action, String entityType, UUID entityId, Object before, Object after,
                             String actorEmail, UUID userId, UUID tenantId) {
    write("PLATFORM", tenantId, action, entityType, entityId, before, after, actorEmail, userId);
  }

  private void write(String scope, UUID tenantId, String action, String entityType, UUID entityId,
                     Object before, Object after, String actorEmail, UUID userId) {
    try {
      AuditLog log = new AuditLog();
      log.setScope(scope);
      log.setTenantId(tenantId);
      log.setAction(action);
      log.setEntityType(entityType);
      log.setEntityId(entityId);
      log.setActorEmail(actorEmail);
      log.setUserId(userId);
      log.setPreviousValues(before == null ? null : mapper.writeValueAsString(before));
      log.setNewValues(after == null ? null : mapper.writeValueAsString(after));

      ServletRequestAttributes attributes =
          (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
      if (attributes != null) {
        HttpServletRequest request = attributes.getRequest();
        String forwarded = request.getHeader("X-Forwarded-For");
        log.setIpAddress(forwarded == null || forwarded.isBlank()
            ? request.getRemoteAddr() : forwarded.split(",")[0].trim());
        String agent = request.getHeader("User-Agent");
        log.setUserAgent(agent == null ? null : agent.substring(0, Math.min(agent.length(), 240)));
      }
      repository.save(log);
    } catch (Exception ignored) {
      // An audit failure must never break the business transaction that triggered it.
    }
  }
}
