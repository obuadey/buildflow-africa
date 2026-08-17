package com.buildflow.africa.files;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Project documents: plans, bills of quantities, signed quotations, receipts and site photographs. */
@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

  private static final List<String> SEARCHABLE = List.of("name", "uploadedBy", "kind");
  private static final Map<String, String> FILTERS = Map.of("kind", "kind", "project", "projectId");

  private final ProjectFileRepository repository;
  private final StorageService storage;
  private final ActivityRecorder activity;

  public DocumentController(ProjectFileRepository repository, StorageService storage, ActivityRecorder activity) {
    this.repository = repository;
    this.storage = storage;
    this.activity = activity;
  }

  @GetMapping
  public PageResponse<DocumentView> list(@RequestParam Map<String, String> params) {
    return PageResponse.of(repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt")), DocumentView::from);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public DocumentView upload(@RequestPart("file") MultipartFile file,
                             @RequestParam(name = "projectId", required = false) UUID projectId,
                             @RequestParam(name = "kind", defaultValue = "PLAN") String kind,
                             @AuthenticationPrincipal AuthPrincipal principal) throws IOException {
    UUID tenantId = TenantContext.getRequired();
    String key = storage.store(tenantId, file);

    ProjectFile document = new ProjectFile();
    document.setTenantId(tenantId);
    document.setProjectId(projectId);
    document.setName(file.getOriginalFilename() == null ? "document" : file.getOriginalFilename());
    document.setKind(kind);
    document.setStorageKey(key);
    document.setContentType(file.getContentType());
    document.setSizeBytes(file.getSize());
    document.setUploadedBy(principal == null ? null : principal.email());
    ProjectFile saved = repository.save(document);

    activity.record(document.getUploadedBy(), "PROJECTS",
        "Document uploaded — " + saved.getName(), "document", saved.getId(), "/documents");
    return DocumentView.from(saved);
  }

  @GetMapping("/{id}/download")
  public ResponseEntity<FileSystemResource> download(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    ProjectFile document = repository.findByIdAndTenantId(id, tenantId)
        .orElseThrow(() -> new NotFoundException("DOCUMENT_NOT_FOUND", "That document no longer exists."));
    Path path = storage.resolve(tenantId, document.getStorageKey());
    if (!Files.exists(path)) {
      throw new NotFoundException("DOCUMENT_MISSING", "The stored file could not be found.");
    }
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getName() + "\"")
        .contentType(document.getContentType() == null
            ? MediaType.APPLICATION_OCTET_STREAM
            : MediaType.parseMediaType(document.getContentType()))
        .body(new FileSystemResource(path));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    ProjectFile document = repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("DOCUMENT_NOT_FOUND", "That document no longer exists."));
    repository.delete(document);
  }

  public record DocumentView(UUID id, String name, String kind, UUID projectId, long sizeBytes,
                             String contentType, String uploadedBy, Instant uploadedAt) {
    static DocumentView from(ProjectFile file) {
      return new DocumentView(file.getId(), file.getName(), file.getKind(), file.getProjectId(),
          file.getSizeBytes(), file.getContentType(), file.getUploadedBy(), file.getCreatedAt());
    }
  }
}
