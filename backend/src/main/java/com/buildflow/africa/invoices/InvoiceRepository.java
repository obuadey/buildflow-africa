package com.buildflow.africa.invoices;

import com.buildflow.africa.common.TenantRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceRepository extends TenantRepository<Invoice> {

  @Query("""
      select coalesce(sum(i.totalAmount), 0) from Invoice i
      where i.tenantId = :tenantId and i.status <> 'DRAFT' and i.status <> 'CANCELLED'
        and i.issueDate between :from and :to""")
  BigDecimal revenueBetween(@Param("tenantId") UUID tenantId,
                            @Param("from") LocalDate from, @Param("to") LocalDate to);

  @Query("""
      select coalesce(sum(i.totalAmount - i.paidAmount), 0) from Invoice i
      where i.tenantId = :tenantId and i.status in ('SENT', 'PARTIALLY_PAID', 'OVERDUE')""")
  BigDecimal outstanding(@Param("tenantId") UUID tenantId);

  long countByTenantIdAndStatusIn(UUID tenantId, List<String> statuses);

  List<Invoice> findByTenantIdAndProjectId(UUID tenantId, UUID projectId);

  boolean existsByTenantIdAndContractId(UUID tenantId, UUID contractId);

  @Query("""
      select coalesce(sum(i.totalAmount), 0) from Invoice i
      where i.tenantId = :tenantId and i.status <> 'DRAFT' and i.status <> 'CANCELLED'
        and i.issueDate >= :from and i.issueDate < :to""")
  BigDecimal revenueForMonth(@Param("tenantId") UUID tenantId,
                             @Param("from") LocalDate from, @Param("to") LocalDate to);
}
