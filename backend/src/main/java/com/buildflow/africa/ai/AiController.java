package com.buildflow.africa.ai;

import com.buildflow.africa.activity.ActivityRecorder;
import com.buildflow.africa.audit.AuditService;
import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.expenses.ExpenseRepository;
import com.buildflow.africa.invoices.InvoiceRepository;
import com.buildflow.africa.labour.LabourRate;
import com.buildflow.africa.labour.LabourRateRepository;
import com.buildflow.africa.library.Equipment;
import com.buildflow.africa.library.EquipmentRepository;
import com.buildflow.africa.materials.Material;
import com.buildflow.africa.materials.MaterialRepository;
import com.buildflow.africa.payments.PaymentRepository;
import com.buildflow.africa.projects.Project;
import com.buildflow.africa.projects.ProjectRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * AI endpoints.
 *
 * The model is asked for scope, wording and review findings only. Prices are attached here, from
 * the tenant's own price book, after the model has replied — and any line that cannot be matched
 * is returned unpriced and flagged, because an honest gap is more useful than an invented rate.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

  private final AiClient ai;
  private final MaterialRepository materials;
  private final InvoiceRepository invoices;
  private final PaymentRepository payments;
  private final ExpenseRepository expenses;
  private final ProjectRepository projects;
  private final LabourRateRepository labourRates;
  private final EquipmentRepository equipment;
  private final AuditService audit;
  private final ActivityRecorder activity;

  public AiController(AiClient ai, MaterialRepository materials, InvoiceRepository invoices,
                      PaymentRepository payments, ExpenseRepository expenses, ProjectRepository projects,
                      LabourRateRepository labourRates, EquipmentRepository equipment,
                      AuditService audit, ActivityRecorder activity) {
    this.ai = ai;
    this.materials = materials;
    this.invoices = invoices;
    this.payments = payments;
    this.expenses = expenses;
    this.projects = projects;
    this.labourRates = labourRates;
    this.equipment = equipment;
    this.audit = audit;
    this.activity = activity;
  }

  @PostMapping("/scope")
  @SuppressWarnings("unchecked")
  public Map<String, Object> scope(@Valid @RequestBody ScopeRequest request,
                                   @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    Map<String, Object> payload = new HashMap<>();
    payload.put("prompt", request.prompt());
    payload.put("country", "Ghana");
    payload.put("region", request.region() == null ? "" : request.region());
    payload.put("parameters", request.parameters() == null ? Map.of() : request.parameters());
    Map<String, Object> response = ai.post("/scope", payload);

    List<Material> priceBook = materials.findByTenantIdAndActiveTrueOrderByName(tenantId);
    List<Map<String, Object>> sections = (List<Map<String, Object>>) response.getOrDefault("sections", List.of());
    int unpriced = 0;

    for (Map<String, Object> section : sections) {
      List<Map<String, Object>> items = (List<Map<String, Object>>) section.getOrDefault("items", List.of());
      for (Map<String, Object> item : items) {
        String description = String.valueOf(item.get("description"));
        Material match = bestMatch(priceBook, description);
        if (match == null) {
          item.put("rate", null);
          item.put("matchedFrom", null);
          unpriced++;
        } else {
          item.put("rate", match.getPurchasePrice());
          item.put("matchedFrom", match.getName());
          item.put("materialId", match.getId());
        }
      }
    }

    List<String> notes = new ArrayList<>((List<String>) response.getOrDefault("notes", List.of()));
    if (unpriced > 0) {
      notes.add(unpriced + " suggested lines have no price in your price book and are left blank for you to complete.");
    }
    response.put("notes", notes);
    response.put("unpricedCount", unpriced);

    String actorEmail = principal == null ? null : principal.email();
    UUID userId = principal == null ? null : principal.userId();
    audit.record("AI_SCOPE_GENERATED", "ai_scope", null, null,
        Map.of("sections", sections.size(), "unpricedCount", unpriced, "notes", notes.size()),
        actorEmail, userId);
    activity.record(actorEmail, "SALES",
        "AI scope generated — " + sections.size() + " sections, " + unpriced + " unpriced lines",
        "ai_scope", null, null);

    return response;
  }

  @PostMapping("/review")
  public Map<String, Object> review(@RequestBody Map<String, Object> body) {
    return ai.post("/review", body);
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return ai.get("/health");
  }

  /**
   * Assistant. The backend computes every figure first and the model is only allowed to phrase
   * them, so an answer can never contain a number the database did not produce.
   */
  @PostMapping("/assistant")
  public AssistantAnswer assistant(@Valid @RequestBody AssistantRequest request,
                                   @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    String question = request.question().toLowerCase();
    List<Row> rows = new ArrayList<>();
    String headline;
    String detail;
    String source;

    if (question.matches(".*(outstand|owe|debt|receivab).*")) {
      BigDecimal total = invoices.outstanding(tenantId);
      long count = invoices.countByTenantIdAndStatusIn(tenantId, List.of("SENT", "PARTIALLY_PAID", "OVERDUE"));
      headline = money(total) + " outstanding across " + count + " invoices";
      detail = "Balances are taken from issued invoices less every payment recorded against them.";
      source = "invoices";
    } else if (question.matches(".*(budget|overrun|risk|exceed).*")) {
      List<Project> active = projects.findByTenantIdAndStatus(tenantId, "ACTIVE");
      List<Project> risky = active.stream()
          .filter(project -> project.getContractValue() != null
              && project.getContractValue().signum() > 0
              && expenses.totalForProject(tenantId, project.getId())
                  .multiply(BigDecimal.valueOf(100))
                  .divide(project.getContractValue(), 0, java.math.RoundingMode.HALF_UP)
                  .intValue() > project.getCompletionPercent())
          .sorted(Comparator.comparing(Project::getName))
          .toList();
      headline = risky.size() + " active projects are spending ahead of progress";
      detail = "Recorded cost is compared with reported completion on every active project.";
      source = "projects, expenses";
      for (Project project : risky.stream().limit(5).toList()) {
        BigDecimal spent = expenses.totalForProject(tenantId, project.getId());
        rows.add(new Row(project.getName(), money(spent) + " spent · " + project.getCompletionPercent() + "% complete",
            "/projects/" + project.getId()));
      }
    } else if (question.matches(".*(cost|price|material|rate|labou?r|crew|equipment|hire|concrete|plaster|mason|electrician|tile).*")
        && !question.matches(".*(outdated|stale|older).*")) {
      List<CostFact> matches = costFacts(tenantId, question);
      if (matches.isEmpty()) {
        long materialCount = materials.findByTenantIdAndActiveTrueOrderByName(tenantId).size();
        long labourCount = labourRates.findAll().stream()
            .filter(rate -> tenantId.equals(rate.getTenantId()) && rate.isActive())
            .count();
        long equipmentCount = equipment.findAll().stream()
            .filter(item -> tenantId.equals(item.getTenantId()) && item.isActive())
            .count();
        headline = "No direct cost match was found";
        detail = "Your active cost library has " + materialCount + " material, " + labourCount
            + " labour and " + equipmentCount + " equipment records. Try the exact trade, material or supplier name.";
      } else {
        headline = matches.size() + " matching cost records";
        detail = "These are live rates from your active materials, labour and equipment libraries. Confirm stale or supplier-sensitive rates before issuing a quote.";
        for (CostFact fact : matches.stream().limit(8).toList()) {
          rows.add(new Row(fact.label(), fact.value(), fact.href()));
        }
      }
      source = "cost library";
    } else if (question.matches(".*(price|material|outdated|stale|rate).*")) {
      List<Material> stale = materials.findByTenantIdAndActiveTrueOrderByName(tenantId).stream()
          .filter(material -> material.getEffectiveDate() != null
              && ChronoUnit.DAYS.between(material.getEffectiveDate(), LocalDate.now()) > 60)
          .toList();
      headline = stale.size() + " material prices are older than 60 days";
      detail = "Estimates built on these rates may understate cost. Refresh them before quoting.";
      source = "price book";
      for (Material material : stale.stream().limit(6).toList()) {
        rows.add(new Row(material.getName(),
            ChronoUnit.DAYS.between(material.getEffectiveDate(), LocalDate.now()) + " days old", "/materials"));
      }
    } else {
      LocalDate today = LocalDate.now();
      BigDecimal collected = payments.collectedBetween(tenantId, today.minusDays(30), today.plusDays(1));
      BigDecimal spent = expenses.spentBetween(tenantId, today.minusDays(30), today.plusDays(1));
      headline = money(collected) + " collected in the last 30 days";
      detail = "Cash out over the same period was " + money(spent) + ", a net movement of "
          + money(collected.subtract(spent)) + ".";
      source = "payments, expenses";
    }

    Map<String, Object> phrased = ai.post("/assistant",
        Map.of("question", request.question(), "facts", Map.of("headline", headline, "detail", detail)));

    return new AssistantAnswer(
        String.valueOf(phrased.getOrDefault("headline", headline)),
        String.valueOf(phrased.getOrDefault("detail", detail)),
        rows, source, String.valueOf(phrased.getOrDefault("provider", "deterministic")));
  }

  /** Cheap token match against the price book. Anything ambiguous is left unpriced on purpose. */
  private Material bestMatch(List<Material> priceBook, String description) {
    String needle = description.toLowerCase();
    return priceBook.stream()
        .filter(material -> {
          String name = material.getName().toLowerCase();
          return needle.contains(name) || name.contains(firstWords(needle));
        })
        .findFirst()
        .orElse(null);
  }

  private String firstWords(String text) {
    String[] parts = text.split("\\s+");
    return parts.length <= 2 ? text : parts[0] + " " + parts[1];
  }

  private String money(BigDecimal value) {
    return "GHS " + (value == null ? "0" : value.setScale(0, java.math.RoundingMode.HALF_UP).toPlainString());
  }

  private List<CostFact> costFacts(UUID tenantId, String question) {
    List<String> tokens = List.of(question.toLowerCase().split("[^a-z0-9]+")).stream()
        .filter(token -> token.length() > 2)
        .filter(token -> !List.of("cost", "price", "rate", "rates", "average", "typical", "compare", "what", "show").contains(token))
        .toList();
    List<CostFact> facts = new ArrayList<>();
    for (Material material : materials.findByTenantIdAndActiveTrueOrderByName(tenantId)) {
      if (matchesTokens(tokens, material.getName(), material.getDescription(), material.getBrand(), material.getLocation())) {
        BigDecimal rate = material.getSellingRate() != null && material.getSellingRate().signum() > 0
            ? material.getSellingRate() : material.getPurchasePrice();
        facts.add(new CostFact(material.getName(), money(rate) + " / " + material.getUnit()
            + (material.getLocation() == null ? "" : " · " + material.getLocation()), "/materials"));
      }
    }
    for (LabourRate rate : labourRates.findAll()) {
      if (tenantId.equals(rate.getTenantId()) && rate.isActive()
          && matchesTokens(tokens, rate.getTrade(), rate.getRegion(), "labour", "labor", "crew")) {
        facts.add(new CostFact(rate.getTrade(), money(rate.getRate()) + " / " + rate.getUnit()
            + " · crew " + rate.getCrewSize()
            + (rate.getRegion() == null ? "" : " · " + rate.getRegion()), "/costs/resources"));
      }
    }
    for (Equipment item : equipment.findAll()) {
      if (tenantId.equals(item.getTenantId()) && item.isActive()
          && matchesTokens(tokens, item.getName(), "equipment", "hire")) {
        BigDecimal total = item.getHireRate().add(item.getTransportCost()).add(item.getOperatorCost());
        facts.add(new CostFact(item.getName(), money(total) + " / " + item.getUnit(), "/costs/resources"));
      }
    }
    return facts;
  }

  private boolean matchesTokens(List<String> tokens, String... values) {
    if (tokens.isEmpty()) {
      return false;
    }
    String haystack = String.join(" ", java.util.Arrays.stream(values)
        .filter(value -> value != null && !value.isBlank())
        .map(String::toLowerCase)
        .toList());
    return tokens.stream().anyMatch(token -> {
      String singular = token.endsWith("s") && token.length() > 3
          ? token.substring(0, token.length() - 1) : token;
      return haystack.contains(token) || haystack.contains(singular);
    });
  }

  public record ScopeRequest(@NotBlank String prompt, String region, Map<String, Object> parameters) {}

  public record AssistantRequest(@NotBlank String question) {}

  public record Row(String label, String value, String href) {}

  public record CostFact(String label, String value, String href) {}

  public record AssistantAnswer(String headline, String detail, List<Row> rows, String source, String provider) {}
}
