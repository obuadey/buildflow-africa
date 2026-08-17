package com.buildflow.africa.estimates;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EstimateItemRepository extends JpaRepository<EstimateItem, UUID> {

  /**
   * How many lines each estimate has, and how many carry a rate. The estimates table and the
   * dashboard show these counts, and doing it as one grouped query keeps a list of estimates from
   * loading every sheet behind it.
   */
  @Query("""
      select i.estimate.id, count(i), sum(case when i.unitCost > 0 then 1 else 0 end)
      from EstimateItem i
      where i.tenantId = :tenantId and i.estimate.id in :estimateIds
      group by i.estimate.id""")
  List<Object[]> countsFor(@Param("tenantId") UUID tenantId,
                           @Param("estimateIds") List<UUID> estimateIds);
}
