package com.buildflow.africa.rates;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferencePriceImportRepository extends JpaRepository<ReferencePriceImport, UUID> {
  List<ReferencePriceImport> findTop20ByOrderByCreatedAtDesc();
}
