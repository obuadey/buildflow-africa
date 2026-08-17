package com.buildflow.africa.leads;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/leads")
public class LeadController {

  private static final List<String> SEARCHABLE =
      List.of("reference", "name", "contactName", "ownerName", "source", "region");
  private static final Map<String, String> FILTERS =
      Map.of("stage", "stage", "owner", "ownerName", "source", "source", "region", "region");

  private final LeadRepository repository;
  private final ActivityRecorder activity;

  public LeadController(LeadRepository repository, ActivityRecorder activity) {
    this.repository = repository;
    this.activity = activity;
  }

  @GetMapping
  public PageResponse<LeadView> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    Page<Lead> page = repository.findAll(
        ListQuery.spec(tenantId, params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    return PageResponse.of(page, LeadView::from);
  }

  @GetMapping("/{id}")
  public LeadView get(@PathVariable("id") UUID id) {
    return LeadView.from(find(id));
  }

  @PostMapping
  public LeadView create(@Valid @RequestBody LeadRequest request, @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Lead lead = new Lead();
    lead.setTenantId(tenantId);
    lead.setReference("LD-" + String.format("%04d", repository.countByTenantId(tenantId) + 1));
    apply(lead, request);
    Lead saved = repository.save(lead);
    activity.record(principal == null ? null : principal.email(), "SALES",
        "Lead " + saved.getReference() + " created — " + saved.getName(), "lead", saved.getId(), "/leads");
    return LeadView.from(saved);
  }

  @PatchMapping("/{id}")
  public LeadView update(@PathVariable("id") UUID id, @RequestBody LeadRequest request,
                         @AuthenticationPrincipal AuthPrincipal principal) {
    Lead lead = find(id);
    String previousStage = lead.getStage();
    apply(lead, request);
    Lead saved = repository.save(lead);
    if (request.stage() != null && !request.stage().equals(previousStage)) {
      activity.record(principal == null ? null : principal.email(), "SALES",
          "Lead " + saved.getReference() + " moved to " + saved.getStage().toLowerCase().replace('_', ' '),
          "lead", saved.getId(), "/leads");
    }
    return LeadView.from(saved);
  }

  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    repository.delete(find(id));
  }

  private Lead find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("LEAD_NOT_FOUND", "The requested lead could not be found."));
  }

  private void apply(Lead lead, LeadRequest request) {
    if (request.name() != null) lead.setName(request.name());
    if (request.contactName() != null) lead.setContactName(request.contactName());
    if (request.phone() != null) lead.setPhone(request.phone());
    if (request.email() != null) lead.setEmail(request.email());
    if (request.stage() != null) lead.setStage(request.stage());
    if (request.estimatedValue() != null) lead.setEstimatedValue(request.estimatedValue());
    if (request.source() != null) lead.setSource(request.source());
    if (request.ownerName() != null) lead.setOwnerName(request.ownerName());
    if (request.region() != null) lead.setRegion(request.region());
    if (request.city() != null) lead.setCity(request.city());
    if (request.nextAction() != null) lead.setNextAction(request.nextAction());
    if (request.clientId() != null) lead.setClientId(request.clientId());
    if (request.projectId() != null) lead.setProjectId(request.projectId());
    if (request.notes() != null) lead.setNotes(request.notes());
  }

  public record LeadRequest(
      @NotBlank String name, String contactName, String phone, String email, String stage,
      BigDecimal estimatedValue, String source, String ownerName, String region, String city,
      String nextAction, UUID clientId, UUID projectId, String notes) {}

  public record LeadView(
      UUID id, String reference, String name, String contact, String phone, String email, String stage,
      BigDecimal value, String source, String owner, String region, String city, String nextAction,
      UUID clientId, UUID projectId, Instant createdAt) {

    static LeadView from(Lead lead) {
      return new LeadView(lead.getId(), lead.getReference(), lead.getName(), lead.getContactName(),
          lead.getPhone(), lead.getEmail(), lead.getStage(), lead.getEstimatedValue(), lead.getSource(),
          lead.getOwnerName(), lead.getRegion(), lead.getCity(), lead.getNextAction(),
          lead.getClientId(), lead.getProjectId(), lead.getCreatedAt());
    }
  }
}
