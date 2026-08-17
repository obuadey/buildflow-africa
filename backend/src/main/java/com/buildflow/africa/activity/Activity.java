package com.buildflow.africa.activity;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "activities")
public class Activity extends TenantEntity {

  @Column(name = "actor_name", nullable = false) private String actorName;
  @Column(nullable = false) private String channel = "PROJECTS";
  @Column(nullable = false) private String message;
  @Column(name = "entity_type") private String entityType;
  @Column(name = "entity_id") private UUID entityId;
  private String href;

  public String getActorName() { return actorName; }
  public void setActorName(String actorName) { this.actorName = actorName; }
  public String getChannel() { return channel; }
  public void setChannel(String channel) { this.channel = channel; }
  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }
  public String getEntityType() { return entityType; }
  public void setEntityType(String entityType) { this.entityType = entityType; }
  public UUID getEntityId() { return entityId; }
  public void setEntityId(UUID entityId) { this.entityId = entityId; }
  public String getHref() { return href; }
  public void setHref(String href) { this.href = href; }
}
