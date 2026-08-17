package com.buildflow.africa.integrations;

import com.buildflow.africa.auth.AuthPrincipal;
import com.buildflow.africa.common.TenantContext;
import com.buildflow.africa.membership.TenantAccessService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Per-company integration configuration. The catalogue is fixed here so the interface cannot offer
 * a provider the backend does not understand; the credentials live against the tenant.
 */
@RestController
@RequestMapping("/api/v1/integrations")
public class IntegrationController {

  private record Catalogue(String provider, String name, String detail, List<Map<String, Object>> fields) {}

  private static final List<Catalogue> CATALOGUE = List.of(
      new Catalogue("email", "Email delivery", "Quotation and invoice delivery with open tracking.",
          List.of(field("host", "SMTP host", "smtp.example.com", false),
              field("username", "Username", "postmaster@company.com", false),
              field("password", "Password", "", true))),
      new Catalogue("whatsapp", "WhatsApp Business Platform",
          "Send quotations and collect approvals over WhatsApp.",
          List.of(field("phoneNumberId", "Phone number ID", "", false),
              field("accessToken", "Access token", "", true))),
      new Catalogue("momo", "Mobile Money reconciliation",
          "Match Mobile Money receipts to invoices automatically.",
          List.of(field("merchantId", "Merchant ID", "", false),
              field("apiKey", "API key", "", true))),
      new Catalogue("storage", "S3 / MinIO storage",
          "Plans, bills of quantities, receipts and site photographs.",
          List.of(field("endpoint", "Endpoint", "http://minio:9000", false),
              field("bucket", "Bucket", "buildflow", false),
              field("accessKey", "Access key", "", false),
              field("secretKey", "Secret key", "", true))),
      new Catalogue("accounting", "Accounting export",
          "Export invoices and payments to your accounting package.",
          List.of(field("format", "Format", "CSV", false))));

  private static Map<String, Object> field(String key, String label, String placeholder, boolean secret) {
    return Map.of("key", key, "label", label, "placeholder", placeholder, "secret", secret);
  }

  private static final List<String> ADMIN_ROLES = List.of("OWNER", "ADMIN");
  private static final String MASK = "••••••••";

  private final IntegrationSettingRepository repository;
  private final TenantAccessService access;
  private final ObjectMapper mapper = new ObjectMapper();

  public IntegrationController(IntegrationSettingRepository repository, TenantAccessService access) {
    this.repository = repository;
    this.access = access;
  }

  @GetMapping
  public List<Map<String, Object>> list() {
    UUID tenantId = TenantContext.getRequired();
    List<Map<String, Object>> response = new ArrayList<>();
    for (Catalogue entry : CATALOGUE) {
      IntegrationSetting stored = repository.findByTenantIdAndProvider(tenantId, entry.provider()).orElse(null);
      Map<String, String> config = readConfig(stored);
      Map<String, String> masked = new HashMap<>();
      for (Map<String, Object> definition : entry.fields()) {
        String key = String.valueOf(definition.get("key"));
        String value = config.getOrDefault(key, "");
        masked.put(key, Boolean.TRUE.equals(definition.get("secret")) && !value.isBlank() ? MASK : value);
      }
      response.add(Map.of(
          "provider", entry.provider(),
          "name", entry.name(),
          "detail", entry.detail(),
          "enabled", stored != null && stored.isEnabled(),
          "fields", entry.fields(),
          "config", masked));
    }
    return response;
  }

  @PatchMapping("/{provider}")
  public Map<String, Object> update(@PathVariable("provider") String provider,
                                    @RequestBody UpdateRequest request,
                                    @AuthenticationPrincipal AuthPrincipal principal) {
    UUID tenantId = TenantContext.getRequired();
    access.requireRole(tenantId, principal.userId(), ADMIN_ROLES);
    Catalogue entry = CATALOGUE.stream().filter(row -> row.provider().equals(provider)).findFirst()
        .orElseThrow(() -> new IllegalArgumentException("That integration is not available."));

    IntegrationSetting setting = repository.findByTenantIdAndProvider(tenantId, provider)
        .orElseGet(() -> {
          IntegrationSetting created = new IntegrationSetting();
          created.setTenantId(tenantId);
          created.setProvider(provider);
          return created;
        });

    Map<String, String> existing = readConfig(setting);
    Map<String, String> merged = new HashMap<>(existing);
    if (request.config() != null) {
      request.config().forEach((key, value) -> {
        if (value != null && !MASK.equals(value)) {
          merged.put(key, value);
        }
      });
    }
    try {
      setting.setConfig(mapper.writeValueAsString(merged));
    } catch (Exception ex) {
      throw new IllegalArgumentException("That configuration could not be stored.");
    }
    if (request.enabled() != null) {
      setting.setEnabled(request.enabled());
    }
    repository.save(setting);
    return Map.of("provider", entry.provider(), "enabled", setting.isEnabled());
  }

  @SuppressWarnings("unchecked")
  private Map<String, String> readConfig(IntegrationSetting setting) {
    if (setting == null || setting.getConfig() == null || setting.getConfig().isBlank()) {
      return new HashMap<>();
    }
    try {
      return mapper.readValue(setting.getConfig(), Map.class);
    } catch (Exception ex) {
      return new HashMap<>();
    }
  }

  public record UpdateRequest(Boolean enabled, Map<String, String> config) {}
}
