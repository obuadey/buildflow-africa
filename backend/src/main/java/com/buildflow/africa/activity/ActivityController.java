package com.buildflow.africa.activity;

import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/activity")
public class ActivityController {

  private static final List<String> SEARCHABLE = List.of("message", "actorName", "entityType");
  private static final Map<String, String> FILTERS = Map.of("channel", "channel", "entityType", "entityType");

  private final ActivityRepository repository;

  public ActivityController(ActivityRepository repository) {
    this.repository = repository;
  }

  @GetMapping
  public PageResponse<ActivityView> list(@RequestParam Map<String, String> params) {
    Page<Activity> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    return PageResponse.of(page, ActivityView::from);
  }

  public record ActivityView(UUID id, String actor, String channel, String text, String entityType,
                             UUID entityId, String href, Instant at) {
    public static ActivityView from(Activity a) {
      return new ActivityView(a.getId(), a.getActorName(), a.getChannel(), a.getMessage(),
          a.getEntityType(), a.getEntityId(), a.getHref(), a.getCreatedAt());
    }
  }
}
