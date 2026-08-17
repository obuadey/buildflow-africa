package com.buildflow.africa.clients;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.Flat;
import com.buildflow.africa.common.ListQuery;
import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.PageResponse;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.estimates.EstimateController.EstimateView;
import com.buildflow.africa.estimates.EstimateRepository;
import com.buildflow.africa.invoices.Invoice;
import com.buildflow.africa.invoices.InvoiceController.InvoiceView;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.projects.Project;
import com.buildflow.africa.projects.ProjectController.ProjectView;
import com.buildflow.africa.projects.ProjectRepository;
import com.buildflow.africa.quotations.QuotationController.QuotationView;
import com.buildflow.africa.quotations.QuotationRepository;
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
@RequestMapping("/api/v1/clients")
public class ClientController {

  private static final List<String> SEARCHABLE =
      List.of("name", "companyName", "email", "phone", "city", "region");
  private static final Map<String, String> FILTERS =
      Map.of("type", "clientType", "region", "region", "city", "city");

  private final ClientRepository repository;
  private final ProjectRepository projects;
  private final InvoiceRepository invoices;
  private final EstimateRepository estimates;
  private final QuotationRepository quotations;
  private final ActivityRecorder activity;
  private final Flat flat;

  public ClientController(ClientRepository repository, ProjectRepository projects,
                          InvoiceRepository invoices, EstimateRepository estimates,
                          QuotationRepository quotations, ActivityRecorder activity, Flat flat) {
    this.repository = repository;
    this.projects = projects;
    this.invoices = invoices;
    this.estimates = estimates;
    this.quotations = quotations;
    this.activity = activity;
    this.flat = flat;
  }

  @GetMapping
  public PageResponse<ClientView> list(@RequestParam Map<String, String> params) {
    UUID tenantId = TenantContext.getRequired();
    Page<Client> page = repository.findAll(
        ListQuery.spec(tenantId, params, SEARCHABLE, FILTERS, "createdAt"),
        ListQuery.pageable(params, "createdAt"));
    return PageResponse.of(page, client -> view(tenantId, client));
  }

  /** The client record together with the work attached to it, as one flat object. */
  @GetMapping("/{id}")
  public Map<String, Object> get(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Client client = find(id);
    String name = client.getName();
    List<Project> clientProjects = projects.findByTenantIdAndClientId(tenantId, id);
    return flat.of(view(tenantId, client), Map.of(
        "projectList", clientProjects.stream().map(project -> ProjectView.of(project, name)).toList(),
        "estimates", estimates.findByTenantIdAndClientId(tenantId, id).stream()
            .map(estimate -> EstimateView.of(estimate, null, name)).toList(),
        "quotations", quotations.findByTenantIdAndClientId(tenantId, id).stream()
            .map(quotation -> QuotationView.of(quotation, null, name)).toList(),
        "invoices", invoicesFor(tenantId, id).stream()
            .map(invoice -> InvoiceView.of(invoice, name, null)).toList()));
  }

  @PostMapping
  public ClientView create(@Valid @RequestBody ClientRequest request,
                           @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Client client = new Client();
    client.setTenantId(tenantId);
    client.setClientType("INDIVIDUAL");
    apply(client, request);
    Client saved = repository.save(client);
    activity.record(principal == null ? null : principal.email(), "SALES",
        "Client added — " + saved.getName(), "client", saved.getId(), "/clients/" + saved.getId());
    return view(tenantId, saved);
  }

  @PatchMapping("/{id}")
  public ClientView update(@PathVariable("id") UUID id, @RequestBody ClientRequest request) {
    Client client = find(id);
    apply(client, request);
    return view(TenantContext.getRequired(), repository.save(client));
  }

  /**
   * A client that has been invoiced is never deleted — the ledger has to keep pointing somewhere.
   * The caller is told exactly what is still attached so it can be reassigned first.
   */
  @DeleteMapping("/{id}")
  public void delete(@PathVariable("id") UUID id) {
    UUID tenantId = TenantContext.getRequired();
    Client client = find(id);
    if (!projects.findByTenantIdAndClientId(tenantId, id).isEmpty()) {
      throw new IllegalArgumentException(
          "This client still has projects. Move or close them before removing the client.");
    }
    if (!invoicesFor(tenantId, id).isEmpty()) {
      throw new IllegalArgumentException(
          "This client has been invoiced, so the record must be kept for the audit trail.");
    }
    repository.delete(client);
  }

  private Client find(UUID id) {
    return repository.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("CLIENT_NOT_FOUND", "The requested client could not be found."));
  }

  private List<Invoice> invoicesFor(UUID tenantId, UUID clientId) {
    return invoices.findAll((root, query, cb) ->
        cb.and(cb.equal(root.get("tenantId"), tenantId), cb.equal(root.get("clientId"), clientId)));
  }

  /** Revenue and outstanding are read from the invoice ledger, never from a stored running total. */
  private ClientView view(UUID tenantId, Client client) {
    List<Invoice> billed = invoicesFor(tenantId, client.getId());
    BigDecimal revenue = billed.stream()
        .filter(invoice -> !"DRAFT".equals(invoice.getStatus()) && !"CANCELLED".equals(invoice.getStatus()))
        .map(Invoice::getPaidAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal outstanding = billed.stream()
        .filter(invoice -> List.of("SENT", "PARTIALLY_PAID", "OVERDUE").contains(invoice.getStatus()))
        .map(Invoice::outstanding)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    long projectCount = projects.findByTenantIdAndClientId(tenantId, client.getId()).size();
    return ClientView.of(client, revenue, outstanding, projectCount);
  }

  private void apply(Client client, ClientRequest request) {
    if (request.type() != null) client.setClientType(request.type());
    if (request.name() != null) client.setName(request.name());
    if (request.company() != null) client.setCompanyName(request.company());
    if (request.phone() != null) client.setPhone(request.phone());
    if (request.whatsapp() != null) client.setWhatsapp(request.whatsapp());
    if (request.email() != null) client.setEmail(request.email());
    if (request.address() != null) client.setAddress(request.address());
    if (request.region() != null) client.setRegion(request.region());
    if (request.city() != null) client.setCity(request.city());
    if (request.taxInformation() != null) client.setTaxInformation(request.taxInformation());
    if (request.notes() != null) client.setNotes(request.notes());
  }

  public record ClientRequest(
      String type, @NotBlank String name, String company, String phone, String whatsapp,
      String email, String address, String region, String city, String taxInformation, String notes) {}

  public record ClientView(
      UUID id, String type, String name, String company, String phone, String whatsapp, String email,
      String address, String region, String city, String taxInformation, BigDecimal revenue,
      BigDecimal outstanding, long projects, String notes, Instant createdAt) {

    public static ClientView of(Client client, BigDecimal revenue, BigDecimal outstanding, long projects) {
      return new ClientView(client.getId(), client.getClientType(), client.getName(),
          client.getCompanyName(), client.getPhone(), client.getWhatsapp(), client.getEmail(),
          client.getAddress(), client.getRegion(), client.getCity(), client.getTaxInformation(),
          revenue, outstanding, projects, client.getNotes(), client.getCreatedAt());
    }
  }
}
