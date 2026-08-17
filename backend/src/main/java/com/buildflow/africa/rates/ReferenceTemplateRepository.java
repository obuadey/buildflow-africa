package com.buildflow.africa.rates;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferenceTemplateRepository extends JpaRepository<ReferenceTemplate, UUID> {
  List<ReferenceTemplate> findByCountryOrderBySortOrderAsc(String country);
}
