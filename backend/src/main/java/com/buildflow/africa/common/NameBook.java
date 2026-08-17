package com.buildflow.africa.common;

import com.buildflow.africa.clients.Client;
import com.buildflow.africa.clients.ClientRepository;
import com.buildflow.africa.projects.Project;
import com.buildflow.africa.projects.ProjectRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Resolves the client and project names that every list in the product shows next to a record.
 *
 * Lists fetch a page first and then resolve the names for that page in one query each, so a table
 * of any size costs three queries rather than one per row. Rows from another company can never
 * leak in: the lookup is filtered by the tenant in context, not by the ids alone.
 */
@Component
public class NameBook {

  private final ClientRepository clients;
  private final ProjectRepository projects;

  public NameBook(ClientRepository clients, ProjectRepository projects) {
    this.clients = clients;
    this.projects = projects;
  }

  public Map<UUID, String> clientNames(Collection<UUID> ids) {
    return names(ids, wanted -> clients.findAllById(wanted).stream()
        .filter(this::sameTenant)
        .collect(Collectors.toMap(Client::getId, Client::getName, (a, b) -> a)));
  }

  public Map<UUID, String> projectNames(Collection<UUID> ids) {
    return names(ids, wanted -> projects.findAllById(wanted).stream()
        .filter(this::sameTenant)
        .collect(Collectors.toMap(Project::getId, Project::getName, (a, b) -> a)));
  }

  /** The client a project belongs to, for records that only carry a project id. */
  public Map<UUID, UUID> projectClients(Collection<UUID> ids) {
    Map<UUID, UUID> result = new HashMap<>();
    List<UUID> wanted = distinct(ids);
    if (wanted.isEmpty()) {
      return result;
    }
    projects.findAllById(wanted).stream()
        .filter(this::sameTenant)
        .filter(project -> project.getClientId() != null)
        .forEach(project -> result.put(project.getId(), project.getClientId()));
    return result;
  }

  /**
   * Always a mutable map: callers look names up by an id that is often null (an invoice with no
   * project, say), and {@code Map.of()} rejects a null key outright.
   */
  private Map<UUID, String> names(Collection<UUID> ids,
                                  java.util.function.Function<List<UUID>, Map<UUID, String>> load) {
    List<UUID> wanted = distinct(ids);
    return wanted.isEmpty() ? new HashMap<>() : new HashMap<>(load.apply(wanted));
  }

  private List<UUID> distinct(Collection<UUID> ids) {
    return ids == null ? List.of() : ids.stream().filter(Objects::nonNull).distinct().toList();
  }

  private boolean sameTenant(TenantScoped row) {
    return TenantContext.getRequired().equals(row.getTenantId());
  }
}
