package com.buildflow.africa.common;

import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * Translates the list query parameters used across the product — q, exact filters, date range,
 * sort, dir, page, size — into a tenant-scoped JPA specification.
 */
public final class ListQuery {

  private static final int MAX_SIZE = 200;

  private ListQuery() {}

  public static Pageable pageable(Map<String, String> params, String defaultSort) {
    int page = Math.max(parseInt(params.get("page"), 1), 1);
    int size = Math.min(Math.max(parseInt(params.get("size"), 25), 1), MAX_SIZE);
    String sort = params.getOrDefault("sort", defaultSort);
    Sort.Direction direction = "asc".equalsIgnoreCase(params.get("dir")) ? Sort.Direction.ASC : Sort.Direction.DESC;
    return sort == null || sort.isBlank()
        ? PageRequest.of(page - 1, size)
        : PageRequest.of(page - 1, size, Sort.by(direction, sort));
  }

  /**
   * @param searchable entity fields scanned by the free-text `q` parameter
   * @param filters    request parameter name -> entity field, matched case-insensitively and
   *                   supporting comma separated values
   * @param dateField  entity field used by the `from` and `to` parameters
   */
  public static <T> Specification<T> spec(
      UUID tenantId,
      Map<String, String> params,
      List<String> searchable,
      Map<String, String> filters,
      String dateField) {

    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      predicates.add(cb.equal(root.get("tenantId"), tenantId));

      String q = params.get("q");
      if (q != null && !q.isBlank() && !searchable.isEmpty()) {
        String needle = "%" + q.trim().toLowerCase() + "%";
        List<Predicate> matches = new ArrayList<>();
        for (String field : searchable) {
          matches.add(cb.like(cb.lower(root.get(field).as(String.class)), needle));
        }
        predicates.add(cb.or(matches.toArray(Predicate[]::new)));
      }

      for (Map.Entry<String, String> filter : filters.entrySet()) {
        String raw = params.get(filter.getKey());
        if (raw == null || raw.isBlank()) {
          continue;
        }
        List<String> values = Arrays.stream(raw.split(",")).map(String::trim).filter(v -> !v.isEmpty()).toList();
        if (values.isEmpty()) {
          continue;
        }
        String field = filter.getValue();
        if (field.endsWith("Id")) {
          List<UUID> ids = values.stream().map(ListQuery::parseUuid).filter(java.util.Objects::nonNull).toList();
          if (!ids.isEmpty()) {
            predicates.add(root.get(field).in(ids));
          }
          continue;
        }
        List<Predicate> matches = new ArrayList<>();
        for (String value : values) {
          matches.add(cb.equal(cb.lower(root.get(field).as(String.class)), value.toLowerCase()));
        }
        predicates.add(cb.or(matches.toArray(Predicate[]::new)));
      }

      if (dateField != null) {
        LocalDate from = parseDate(params.get("from"));
        LocalDate to = parseDate(params.get("to"));
        if (from != null || to != null) {
          Class<?> type = root.get(dateField).getJavaType();
          if (type.equals(Instant.class)) {
            if (from != null) {
              predicates.add(cb.greaterThanOrEqualTo(root.get(dateField), from.atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
            if (to != null) {
              predicates.add(cb.lessThan(root.get(dateField), to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)));
            }
          } else {
            if (from != null) {
              predicates.add(cb.greaterThanOrEqualTo(root.get(dateField), from));
            }
            if (to != null) {
              predicates.add(cb.lessThanOrEqualTo(root.get(dateField), to));
            }
          }
        }
      }

      return cb.and(predicates.toArray(Predicate[]::new));
    };
  }

  private static int parseInt(String value, int fallback) {
    try {
      return value == null ? fallback : Integer.parseInt(value);
    } catch (NumberFormatException ex) {
      return fallback;
    }
  }

  private static LocalDate parseDate(String value) {
    try {
      return value == null || value.isBlank() ? null : LocalDate.parse(value.substring(0, 10));
    } catch (RuntimeException ex) {
      return null;
    }
  }

  private static UUID parseUuid(String value) {
    try {
      return UUID.fromString(value);
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }
}
