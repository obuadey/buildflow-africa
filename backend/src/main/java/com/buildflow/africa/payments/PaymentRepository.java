package com.buildflow.africa.payments;

import com.buildflow.africa.common.TenantRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends TenantRepository<Payment> {

  List<Payment> findByTenantIdAndInvoiceIdOrderByPaidOnDesc(UUID tenantId, UUID invoiceId);

  @Query("""
      select coalesce(sum(p.amount), 0) from Payment p
      where p.tenantId = :tenantId and p.paidOn >= :from and p.paidOn < :to""")
  BigDecimal collectedBetween(@Param("tenantId") UUID tenantId,
                              @Param("from") LocalDate from, @Param("to") LocalDate to);
}
