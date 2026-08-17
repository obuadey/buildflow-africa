package com.buildflow.africa.notifications;

import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

  private static final List<String> SEARCHABLE = List.of("title", "body", "type");
  private static final Map<String, String> FILTERS = Map.of("type", "type", "tone", "tone");

  private final NotificationRepository repository;

  public NotificationController(NotificationRepository repository) {
    this.repository = repository;
  }

  @GetMapping
  public NotificationPage list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    Page<Notification> page = repository.findAll(
        ListQuery.spec(tenantId, params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    PageResponse<NotificationView> body = PageResponse.of(page, NotificationView::from);
    return new NotificationPage(body.rows(), body.total(), body.page(), body.size(), body.pages(),
        repository.countByTenantIdAndReadAtIsNull(tenantId));
  }

  @PostMapping("/{id}/read")
  public NotificationView markRead(@PathVariable("id") UUID id) {
    Notification notification = repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("NOTIFICATION_NOT_FOUND", "That notification no longer exists."));
    if (notification.getReadAt() == null) {
      notification.setReadAt(Instant.now());
      repository.save(notification);
    }
    return NotificationView.from(notification);
  }

  @PostMapping("/read-all")
  @Transactional
  public Map<String, Integer> markAllRead() {
    List<Notification> unread = repository.findByTenantIdAndReadAtIsNull(TenantContext.getRequired());
    Instant now = Instant.now();
    unread.forEach(notification -> notification.setReadAt(now));
    repository.saveAll(unread);
    return Map.of("updated", unread.size());
  }

  public record NotificationView(UUID id, String type, String tone, String title, String body,
                                 String href, boolean read, Instant at) {
    static NotificationView from(Notification n) {
      return new NotificationView(n.getId(), n.getType(), n.getTone(), n.getTitle(), n.getBody(),
          n.getHref(), n.getReadAt() != null, n.getCreatedAt());
    }
  }

  public record NotificationPage(List<NotificationView> rows, long total, int page, int size,
                                 int pages, long unread) {}
}
