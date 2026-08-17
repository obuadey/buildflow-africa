package com.buildflow.africa.expenses;

import com.buildflow.africa.common.TenantRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends TenantRepository<Expense> {

  @Query("select coalesce(sum(e.amount), 0) from Expense e where e.tenantId = :tenantId and e.projectId = :projectId")
  BigDecimal totalForProject(@Param("tenantId") UUID tenantId, @Param("projectId") UUID projectId);

  @Query("""
      select coalesce(sum(e.amount), 0) from Expense e
      where e.tenantId = :tenantId and e.spentOn >= :from and e.spentOn < :to""")
  BigDecimal spentBetween(@Param("tenantId") UUID tenantId,
                          @Param("from") LocalDate from, @Param("to") LocalDate to);
}
