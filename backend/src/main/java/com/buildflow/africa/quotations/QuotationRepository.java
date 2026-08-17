package com.buildflow.africa.quotations;

import com.buildflow.africa.common.TenantRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuotationRepository extends TenantRepository<Quotation> {
  List<Quotation> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
  List<Quotation> findByTenantIdAndClientId(UUID tenantId, UUID clientId);
  long countByTenantIdAndStatus(UUID tenantId, String status);
  Optional<Quotation> findByTenantIdAndEstimateId(UUID tenantId, UUID estimateId);
  boolean existsByTenantIdAndEstimateId(UUID tenantId, UUID estimateId);

  @Query("select coalesce(sum(q.clientTotal), 0) from Quotation q where q.tenantId = :tenantId")
  BigDecimal totalQuoteValue(@Param("tenantId") UUID tenantId);

  @Query("""
      select q.status, count(q), coalesce(sum(q.clientTotal), 0) from Quotation q
      where q.tenantId = :tenantId group by q.status""")
  List<Object[]> pipeline(@Param("tenantId") UUID tenantId);

  Optional<Quotation> findByPublicToken(String publicToken);
}
