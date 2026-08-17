package com.buildflow.africa.files;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "project_files")
public class ProjectFile extends TenantEntity {
  @Column(name = "project_id") private UUID projectId;
  @Column(nullable = false) private String name;
  @Column(nullable = false) private String kind = "PLAN";
  @Column(name = "storage_key", nullable = false) private String storageKey;
  @Column(name = "content_type") private String contentType;
  @Column(name = "size_bytes", nullable = false) private long sizeBytes;
  @Column(name = "uploaded_by") private String uploadedBy;

  public UUID getProjectId() { return projectId; }
  public void setProjectId(UUID projectId) { this.projectId = projectId; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getKind() { return kind; }
  public void setKind(String kind) { this.kind = kind; }
  public String getStorageKey() { return storageKey; }
  public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
  public String getContentType() { return contentType; }
  public void setContentType(String contentType) { this.contentType = contentType; }
  public long getSizeBytes() { return sizeBytes; }
  public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }
  public String getUploadedBy() { return uploadedBy; }
  public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }
}
