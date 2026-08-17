package com.buildflow.africa.settings;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentNumberingRepository extends TenantRepository<DocumentNumbering> {
  List<DocumentNumbering> findByTenantId(UUID tenantId);
  Optional<DocumentNumbering> findByTenantIdAndDocumentType(UUID tenantId, String documentType);
}
