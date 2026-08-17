package com.buildflow.africa.search;

import com.buildflow.africa.common.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Global search across the eight record types the command palette offers. Each statement is
 * tenant-filtered in SQL; nothing is filtered in application code.
 */
@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

  private record Source(String group, String table, String titleColumn, String subtitleColumn,
                        String metaColumn, String hrefPrefix) {}

  private static final List<Source> SOURCES = List.of(
      new Source("Projects", "projects", "name", "project_number", "status", "/projects/"),
      new Source("Clients", "clients", "name", "email", "client_type", "/clients/"),
      new Source("Estimates", "estimates", "title", "estimate_number", "status", "/estimates/"),
      new Source("Quotations", "quotations", "quote_number", "quote_number", "status", "/quotations/"),
      new Source("Invoices", "invoices", "invoice_number", "invoice_number", "status", "/invoices/"),
      new Source("Leads", "leads", "name", "contact_name", "stage", "/leads"),
      new Source("Suppliers", "suppliers", "name", "city", "payment_terms", "/suppliers/"),
      new Source("Materials", "materials", "name", "brand", "unit", "/materials"));

  @PersistenceContext
  private EntityManager entityManager;

  @GetMapping
  public SearchResponse search(@RequestParam("q") String term,
                               @RequestParam(name = "scope", required = false) String scope,
                               @RequestParam(name = "limit", defaultValue = "5") int limit) {
    UUID tenantId = TenantContext.getRequired();
    List<Group> groups = new ArrayList<>();
    if (term == null || term.trim().length() < 2) {
      return new SearchResponse(groups);
    }
    String needle = "%" + term.trim().toLowerCase() + "%";

    for (Source source : SOURCES) {
      if (scope != null && !scope.isBlank() && !"all".equals(scope)
          && !source.group().toLowerCase().startsWith(scope.toLowerCase())) {
        continue;
      }
      String sql = "select id, " + source.titleColumn() + ", " + source.subtitleColumn() + ", "
          + source.metaColumn() + " from " + source.table()
          + " where tenant_id = ?1 and (lower(" + source.titleColumn() + ") like ?2 or lower(cast("
          + source.subtitleColumn() + " as text)) like ?2) limit ?3";
      Query query = entityManager.createNativeQuery(sql)
          .setParameter(1, tenantId)
          .setParameter(2, needle)
          .setParameter(3, Math.min(Math.max(limit, 1), 20));
      List<?> rows = query.getResultList();
      if (rows.isEmpty()) {
        continue;
      }
      List<Item> items = new ArrayList<>();
      for (Object row : rows) {
        Object[] cells = (Object[]) row;
        String id = String.valueOf(cells[0]);
        items.add(new Item(id, String.valueOf(cells[1]),
            cells[2] == null ? "" : String.valueOf(cells[2]),
            cells[3] == null ? null : String.valueOf(cells[3]),
            source.hrefPrefix().endsWith("/") ? source.hrefPrefix() + id : source.hrefPrefix()));
      }
      groups.add(new Group(source.group(), items));
    }
    return new SearchResponse(groups);
  }

  public record Item(String id, String title, String subtitle, String meta, String href) {}
  public record Group(String group, List<Item> items) {}
  public record SearchResponse(List<Group> groups) {}
}
