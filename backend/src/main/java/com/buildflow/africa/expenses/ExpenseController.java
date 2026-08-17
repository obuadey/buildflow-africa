package com.buildflow.africa.expenses;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NameBook;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.files.StorageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

  private static final List<String> SEARCHABLE = List.of("reference", "vendor", "recordedBy", "notes");
  private static final Map<String, String> FILTERS =
      Map.of("category", "category", "project", "projectId", "supplier", "supplierId");

  private final ExpenseRepository repository;
  private final ActivityRecorder activity;
  private final NameBook names;
  private final StorageService storage;

  public ExpenseController(ExpenseRepository repository, ActivityRecorder activity, NameBook names,
                           StorageService storage) {
    this.repository = repository;
    this.activity = activity;
    this.names = names;
    this.storage = storage;
  }

  @GetMapping
  public PageResponse<ExpenseView> list(@RequestParam Map<String, String> params) {
    Page<Expense> page = repository.findAll(
        ListQuery.spec(TenantContext.getRequired(), params, SEARCHABLE, FILTERS, "spentOn"),
        ListQuery.pageable(params, "spentOn"));
    Map<UUID, String> projectNames =
        names.projectNames(page.getContent().stream().map(Expense::getProjectId).toList());
    return PageResponse.of(page, expense ->
        ExpenseView.of(expense, projectNames.get(expense.getProjectId())));
  }

  @GetMapping("/{id}")
  public ExpenseView get(@PathVariable("id") UUID id) {
    return withName(find(id));
  }

  @PostMapping
  public ExpenseView create(@Valid @RequestBody ExpenseRequest request,
                            @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Expense expense = new Expense();
    expense.setTenantId(tenantId);
    expense.setReference("EXP-" + LocalDate.now().getYear() + "-"
        + String.format("%04d", repository.countByTenantId(tenantId) + 1));
    expense.setProjectId(request.projectId());
    apply(expense, request);
    expense.setRecordedBy(principal == null ? request.recordedBy() : principal.email());
    Expense saved = repository.save(expense);
    activity.record(expense.getRecordedBy(), "FINANCE",
        "Expense " + saved.getReference() + " recorded — " + saved.getAmount().toPlainString(),
        "expense", saved.getId(), "/expenses");
    return withName(saved);
  }

  @PatchMapping("/{id}")
  public ExpenseView update(@PathVariable("id") UUID id, @RequestBody ExpenseRequest request) {
    Expense expense = find(id);
    apply(expense, request);
    return withName(repository.save(expense));
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    repository.delete(find(id));
  }

  @PostMapping(path = "/{id}/receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ExpenseView uploadReceipt(@PathVariable("id") UUID id,
                                   @RequestPart("file") MultipartFile file,
                                   @AuthenticationPrincipal AuthPrincipal principal) throws IOException {
    Expense expense = find(id);
    String key = storage.store(TenantContext.getRequired(), file);
    expense.setReceiptKey(key);
    expense.setHasReceipt(true);
    Expense saved = repository.save(expense);
    activity.record(principal == null ? null : principal.email(), "FINANCE",
        "Receipt attached — " + saved.getReference(), "expense", saved.getId(), "/expenses");
    return withName(saved);
  }

  @GetMapping("/{id}/receipt")
  public ResponseEntity<FileSystemResource> downloadReceipt(@PathVariable("id") UUID id) {
    Expense expense = find(id);
    if (expense.getReceiptKey() == null || expense.getReceiptKey().isBlank()) {
      throw new NotFoundException("RECEIPT_NOT_FOUND", "That expense does not have a receipt attached.");
    }
    Path path = storage.resolve(TenantContext.getRequired(), expense.getReceiptKey());
    if (!Files.exists(path)) {
      throw new NotFoundException("RECEIPT_MISSING", "The stored receipt file could not be found.");
    }
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + expense.getReference() + "-receipt\"")
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .body(new FileSystemResource(path));
  }

  private Expense find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("EXPENSE_NOT_FOUND", "The requested expense could not be found."));
  }

  private ExpenseView withName(Expense expense) {
    UUID projectId = expense.getProjectId();
    return ExpenseView.of(expense, projectId == null ? null
        : names.projectNames(List.of(projectId)).get(projectId));
  }

  private void apply(Expense expense, ExpenseRequest request) {
    if (request.projectId() != null) expense.setProjectId(request.projectId());
    if (request.supplierId() != null) expense.setSupplierId(request.supplierId());
    if (request.category() != null) expense.setCategory(request.category());
    if (request.vendor() != null) expense.setVendor(request.vendor());
    if (request.amount() != null) expense.setAmount(request.amount());
    if (request.date() != null) expense.setSpentOn(request.date());
    if (request.receipt() != null) {
      expense.setHasReceipt(request.receipt());
      if (!request.receipt()) expense.setReceiptKey(null);
    }
    if (request.receiptKey() != null) {
      expense.setReceiptKey(request.receiptKey());
      expense.setHasReceipt(true);
    }
    if (request.notes() != null) expense.setNotes(request.notes());
  }

  public record ExpenseRequest(
      @NotNull UUID projectId, UUID supplierId, String category, String vendor, BigDecimal amount,
      LocalDate date, Boolean receipt, String receiptKey, String recordedBy, String notes) {}

  public record ExpenseView(
      UUID id, String reference, UUID projectId, String projectName, UUID supplierId, String category,
      String vendor, BigDecimal amount, LocalDate date, boolean receipt, String recordedBy,
      String notes, boolean hasReceiptFile) {

    public static ExpenseView of(Expense expense, String projectName) {
      return new ExpenseView(expense.getId(), expense.getReference(), expense.getProjectId(),
          projectName, expense.getSupplierId(), expense.getCategory(), expense.getVendor(),
          expense.getAmount(), expense.getSpentOn(), expense.isHasReceipt(), expense.getRecordedBy(),
          expense.getNotes(), expense.getReceiptKey() != null && !expense.getReceiptKey().isBlank());
    }
  }
}
