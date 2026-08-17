package com.buildflow.africa.rates;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferenceAssemblyRepository extends JpaRepository<ReferenceAssembly, UUID> {
  List<ReferenceAssembly> findByCountryOrderBySortOrderAsc(String country);
}
