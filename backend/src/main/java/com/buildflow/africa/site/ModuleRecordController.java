package com.buildflow.africa.site;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Site accommodation records. Search, filters and paging behave as they do on every other list.
 */
@RestController
@RequestMapping("/api/v1/module-records")
public class ModuleRecordController {

  private static final List<String> SEARCHABLE =
      List.of("title", "details", "ownerName", "type", "linkedRecord");
  private static final Map<String, String> FILTERS = Map.of(
      "module", "module", "status", "status", "source", "source", "type", "type",
      "owner", "ownerName", "project", "projectId", "priority", "priority");
  private static final List<String> MODULES = List.of("accommodation");

  private final ModuleRecordRepository repository;
  private final ActivityRecorder activity;
  private final NameBook names;

  public ModuleRecordController(ModuleRecordRepository repository, ActivityRecorder activity,
                                NameBook names) {
    this.repository = repository;
    this.activity = activity;
    this.names = names;
  }

  @GetMapping
  public PageResponse<RecordView> list(@RequestParam Map<String, String> params) {
    Page<ModuleRecord> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    Map<UUID, String> projectNames =
        names.projectNames(page.getContent().stream().map(ModuleRecord::getProjectId).toList());
    return PageResponse.of(page, record ->
        RecordView.of(record, projectNames.get(record.getProjectId())));
  }

  @GetMapping("/{id}")
  public RecordView get(@PathVariable("id") UUID id) {
    return withName(find(id));
  }

  @PostMapping
  public RecordView create(@Valid @RequestBody RecordRequest request,
                           @AuthenticationPrincipal AuthPrincipal principal) {
    ModuleRecord record = new ModuleRecord();
    record.setTenantId(TenantContext.getRequired());
    record.setModule(module(request.module()));
    apply(record, request);
    if (record.getOwnerName() == null && principal != null) {
      record.setOwnerName(principal.email());
    }
    ModuleRecord saved = repository.save(record);
    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        label(saved.getModule()) + " — " + saved.getTitle(),
        "module-record", saved.getId(), "/" + saved.getModule());
    return withName(saved);
  }

  @PatchMapping("/{id}")
  public RecordView update(@PathVariable("id") UUID id, @RequestBody RecordRequest request) {
    ModuleRecord record = find(id);
    if (request.module() != null) record.setModule(module(request.module()));
    apply(record, request);
    return withName(repository.save(record));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    repository.delete(find(id));
  }

  @PostMapping("/{id}/{action}")
  public RecordView action(@PathVariable("id") UUID id, @PathVariable("action") String action,
                           @RequestBody(required = false) ActionRequest request,
                           @AuthenticationPrincipal AuthPrincipal principal) {
    ModuleRecord record = find(id);
    String next = nextStatus(record.getModule(), record.getStatus(), action);
    record.setStatus(next);
    if (request != null) {
      if (request.owner() != null && !request.owner().isBlank()) record.setOwnerName(request.owner());
      if (request.priority() != null && !request.priority().isBlank()) record.setPriority(request.priority());
      if (request.dueDate() != null) record.setDueDate(request.dueDate());
      if (request.note() != null && !request.note().isBlank()) {
        String prefix = Instant.now() + " " + actionLabel(action) + ": ";
        record.setDetails((record.getDetails() == null || record.getDetails().isBlank())
            ? prefix + request.note()
            : record.getDetails() + "\n" + prefix + request.note());
      }
    }
    ModuleRecord saved = repository.save(record);
    activity.record(principal == null ? null : principal.email(), "PROJECTS",
        actionLabel(action) + " — " + saved.getTitle(),
        "module-record", saved.getId(), "/" + saved.getModule());
    return withName(saved);
  }

  private ModuleRecord find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("RECORD_NOT_FOUND", "That site record no longer exists."));
  }

  private String module(String value) {
    if (value == null || !MODULES.contains(value)) {
      throw new IllegalArgumentException("That is not a site register this product keeps.");
    }
    return value;
  }

  private String label(String module) {
    return switch (module) {
      case "accommodation" -> "Accommodation recorded";
      default -> "Site record added";
    };
  }

  private String nextStatus(String module, String current, String action) {
    return switch (module) {
      case "accommodation" -> switch (action) {
        case "activate" -> requireStatus(current, "Full", "Closed", "Active");
        case "mark-full" -> requireStatus(current, "Active", "Full");
        case "close" -> requireStatus(current, "Active", "Full", "Closed");
        default -> throw new IllegalArgumentException("That accommodation action is not supported.");
      };
      default -> throw new IllegalArgumentException("That site register does not support workflow actions.");
    };
  }

  private String requireStatus(String current, String allowed, String next) {
    if (!allowed.equals(current)) {
      throw new IllegalArgumentException("This action is not valid while the record is " + current + ".");
    }
    return next;
  }

  private String requireStatus(String current, String first, String second, String next) {
    if (!first.equals(current) && !second.equals(current)) {
      throw new IllegalArgumentException("This action is not valid while the record is " + current + ".");
    }
    return next;
  }

  private String requireStatus(String current, String first, String second, String third, String next) {
    if (!first.equals(current) && !second.equals(current) && !third.equals(current)) {
      throw new IllegalArgumentException("This action is not valid while the record is " + current + ".");
    }
    return next;
  }

  private String requireStatus(String current, String first, String second, String third, String fourth,
                               String next) {
    if (!first.equals(current) && !second.equals(current) && !third.equals(current) && !fourth.equals(current)) {
      throw new IllegalArgumentException("This action is not valid while the record is " + current + ".");
    }
    return next;
  }

  private String actionLabel(String action) {
    return switch (action) {
      case "close" -> "Record closed";
      case "activate" -> "Record activated";
      case "mark-full" -> "Accommodation marked full";
      default -> "Record updated";
    };
  }

  private RecordView withName(ModuleRecord record) {
    UUID projectId = record.getProjectId();
    return RecordView.of(record, projectId == null ? null
        : names.projectNames(List.of(projectId)).get(projectId));
  }

  private void apply(ModuleRecord record, RecordRequest request) {
    if (request.projectId() != null) record.setProjectId(request.projectId());
    if (request.title() != null) record.setTitle(request.title());
    if (request.source() != null) record.setSource(request.source());
    if (request.type() != null) record.setType(request.type());
    if (request.status() != null) record.setStatus(request.status());
    if (request.priority() != null) record.setPriority(request.priority());
    if (request.owner() != null) record.setOwnerName(request.owner());
    if (request.dueDate() != null) record.setDueDate(request.dueDate());
    if (request.value() != null) record.setValue(request.value());
    if (request.quantity() != null) record.setQuantity(request.quantity());
    if (request.unit() != null) record.setUnit(request.unit());
    if (request.linkedRecord() != null) record.setLinkedRecord(request.linkedRecord());
    if (request.details() != null) record.setDetails(request.details());
  }

  public record RecordRequest(
      String module, @NotBlank String title, UUID projectId, String source, String type,
      String status, String priority, String owner, LocalDate dueDate, BigDecimal value,
      BigDecimal quantity, String unit, String linkedRecord, String details) {}

  public record ActionRequest(String note, String owner, String priority, LocalDate dueDate) {}

  public record RecordView(
      UUID id, String module, String title, UUID projectId, String projectName, String source,
      String type, String status, String priority, String owner, LocalDate dueDate, BigDecimal value,
      BigDecimal quantity, String unit, String linkedRecord, String details, Instant createdAt,
      Instant updatedAt) {

    static RecordView of(ModuleRecord record, String projectName) {
      return new RecordView(record.getId(), record.getModule(), record.getTitle(),
          record.getProjectId(), projectName, record.getSource(), record.getType(),
          record.getStatus(), record.getPriority(), record.getOwnerName(), record.getDueDate(),
          record.getValue(), record.getQuantity(), record.getUnit(), record.getLinkedRecord(),
          record.getDetails(), record.getCreatedAt(),
          record.getUpdatedAt() == null ? record.getCreatedAt() : record.getUpdatedAt());
    }
  }
}
