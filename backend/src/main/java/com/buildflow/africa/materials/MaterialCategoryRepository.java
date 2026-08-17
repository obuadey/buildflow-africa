package com.buildflow.africa.materials;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MaterialCategoryRepository extends JpaRepository<MaterialCategory, UUID> {

  /** A company's own trades plus the shared starter list every tenant sees. */
  @Query("""
      select c from MaterialCategory c
      where c.tenantId is null or c.tenantId = :tenantId
      order by c.name""")
  List<MaterialCategory> visibleTo(@Param("tenantId") UUID tenantId);

  /** A company's own trade of that name wins over the shared one. */
  @Query("""
      select c from MaterialCategory c
      where lower(c.name) = lower(:name) and (c.tenantId is null or c.tenantId = :tenantId)
      order by case when c.tenantId is null then 1 else 0 end""")
  List<MaterialCategory> matching(@Param("name") String name, @Param("tenantId") UUID tenantId);

  default Optional<MaterialCategory> byName(String name, UUID tenantId) {
    return matching(name, tenantId).stream().findFirst();
  }
}
