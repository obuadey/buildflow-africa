package com.buildflow.africa.rates;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReferencePriceRepository
    extends JpaRepository<ReferencePrice, UUID>, JpaSpecificationExecutor<ReferencePrice> {

  /**
   * Candidates for a description, newest first. A region is preferred but never required: a
   * national figure is still better than nothing, and the caller is told which it got.
   *
   * The ordering is three-tiered rather than two, because the library holds rates for regions a
   * company is not in. The company's own region comes first, the national figure second, and
   * another region's rate last — it is the only one of the three that would be wrong to quote.
   * Ties in the caller's scoring resolve to the earlier candidate, so this ordering is what
   * decides the rate an estimate is actually priced at.
   */
  @Query("""
      select p from ReferencePrice p
      where lower(p.materialName) like lower(concat('%', :needle, '%'))
        and p.country = :country
      order by case
                 when p.region = :region then 0
                 when p.region is null then 1
                 else 2
               end, p.effectiveDate desc""")
  List<ReferencePrice> candidates(@Param("needle") String needle,
                                  @Param("country") String country,
                                  @Param("region") String region);

  List<ReferencePrice> findByImportId(UUID importId);

  long countByCountry(String country);
}
