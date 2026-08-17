package com.buildflow.africa.reference;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reference data the interface used to hardcode: regions, units, categories, statuses, roles and
 * the permission matrix. Served from one place so the UI and the API can never disagree.
 */
@RestController
@RequestMapping("/api/v1/reference")
public class ReferenceController {

  @GetMapping
  public Map<String, Object> all() {
    return Map.ofEntries(
        Map.entry("regions", REGIONS),
        Map.entry("units", UNITS),
        Map.entry("categories", CATEGORIES),
        Map.entry("costTypes", List.of("MATERIAL", "LABOUR", "EQUIPMENT", "SUBCONTRACTOR")),
        Map.entry("paymentMethods", List.of("BANK_TRANSFER", "MOBILE_MONEY", "CASH", "CHEQUE", "CARD", "OTHER")),
        Map.entry("leadStages", List.of("NEW", "CONTACTED", "SITE_VISIT", "ESTIMATING", "QUOTED",
            "NEGOTIATING", "WON", "LOST")),
        Map.entry("projectStatuses", List.of("DRAFT", "ESTIMATING", "QUOTED", "APPROVED", "ACTIVE",
            "ON_HOLD", "COMPLETED", "CANCELLED")),
        Map.entry("estimateStatuses", List.of("DRAFT", "READY", "QUOTED", "APPROVED", "REJECTED", "ARCHIVED")),
        Map.entry("quoteStatuses", List.of("DRAFT", "SENT", "VIEWED", "NEGOTIATING", "ACCEPTED",
            "REJECTED", "EXPIRED")),
        Map.entry("invoiceStatuses", List.of("DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED")),
        Map.entry("invoiceTypes", List.of("DEPOSIT", "PROGRESS", "MILESTONE", "VARIATION", "FINAL")),
        Map.entry("expenseCategories", List.of("MATERIALS", "LABOUR", "EQUIPMENT", "TRANSPORT",
            "SUBCONTRACTOR", "FUEL", "SITE", "MISC")),
        Map.entry("roles", ROLES),
        Map.entry("permissions", PERMISSIONS));
  }

  private static final List<String> REGIONS = List.of(
      "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East",
      "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", "Western", "Western North");

  private static final List<String> UNITS = List.of(
      "item", "bag", "kg", "tonne", "m", "m2", "m3", "litre", "trip", "day", "hour", "lot", "roll",
      "sheet", "box", "pack", "pair", "set", "week");

  private static final List<String> CATEGORIES = List.of(
      "Preliminaries", "Site Preparation", "Earthworks", "Foundation", "Concrete Works", "Blockwork",
      "Structural Steel", "Roofing", "Carpentry", "Doors", "Windows", "Plastering", "Ceiling",
      "Floor Finishes", "Wall Finishes", "Painting", "Electrical Works", "Plumbing",
      "Sanitary Installation", "Drainage", "External Works", "Landscaping", "Fencing",
      "Security Systems", "HVAC", "Kitchen", "Bathroom", "Labour", "Equipment", "Transportation",
      "Subcontractors", "Miscellaneous");

  private static final List<String> ROLES = List.of(
      "OWNER", "ADMIN", "ESTIMATOR", "PROJECT_MANAGER", "ACCOUNTANT", "STAFF", "VIEWER");

  /** Capability -> roles allowed. Mirrored by the checks in the service layer. */
  private static final List<Map<String, Object>> PERMISSIONS = List.of(
      Map.of("area", "View dashboard", "roles", ROLES),
      Map.of("area", "Manage clients and leads",
          "roles", List.of("OWNER", "ADMIN", "ESTIMATOR", "PROJECT_MANAGER", "STAFF")),
      Map.of("area", "Create and edit estimates",
          "roles", List.of("OWNER", "ADMIN", "ESTIMATOR", "PROJECT_MANAGER")),
      Map.of("area", "Issue quotations", "roles", List.of("OWNER", "ADMIN", "ESTIMATOR")),
      Map.of("area", "Approve variations", "roles", List.of("OWNER", "ADMIN", "PROJECT_MANAGER")),
      Map.of("area", "Raise invoices", "roles", List.of("OWNER", "ADMIN", "PROJECT_MANAGER", "ACCOUNTANT")),
      Map.of("area", "Record payments", "roles", List.of("OWNER", "ADMIN", "ACCOUNTANT")),
      Map.of("area", "Edit price book", "roles", List.of("OWNER", "ADMIN", "ESTIMATOR")),
      Map.of("area", "View reports", "roles", List.of("OWNER", "ADMIN", "PROJECT_MANAGER", "ACCOUNTANT")),
      Map.of("area", "Manage team and billing", "roles", List.of("OWNER", "ADMIN")));
}
