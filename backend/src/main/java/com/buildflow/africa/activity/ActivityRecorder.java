package com.buildflow.africa.activity;

import com.buildflow.africa.common.TenantContext;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Writes the activity feed. Called by services after a record changes state. */
@Service
public class ActivityRecorder {

  private final ActivityRepository repository;

  public ActivityRecorder(ActivityRepository repository) {
    this.repository = repository;
  }

  public void record(String actor, String channel, String message, String entityType, UUID entityId, String href) {
    Activity activity = new Activity();
    activity.setTenantId(TenantContext.getRequired());
    activity.setActorName(actor == null || actor.isBlank() ? "System" : actor);
    activity.setChannel(channel);
    activity.setMessage(message);
    activity.setEntityType(entityType);
    activity.setEntityId(entityId);
    activity.setHref(href);
    repository.save(activity);
  }
}
