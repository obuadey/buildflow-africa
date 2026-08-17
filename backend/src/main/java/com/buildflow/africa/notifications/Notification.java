package com.buildflow.africa.notifications;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification extends TenantEntity {

  @Column(name = "user_id") private UUID userId;
  @Column(nullable = false) private String type;
  @Column(nullable = false) private String tone = "info";
  @Column(nullable = false) private String title;
  private String body;
  private String href;
  @Column(name = "read_at") private Instant readAt;

  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public String getTone() { return tone; }
  public void setTone(String tone) { this.tone = tone; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getBody() { return body; }
  public void setBody(String body) { this.body = body; }
  public String getHref() { return href; }
  public void setHref(String href) { this.href = href; }
  public Instant getReadAt() { return readAt; }
  public void setReadAt(Instant readAt) { this.readAt = readAt; }
}
