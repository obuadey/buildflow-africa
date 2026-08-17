package com.buildflow.africa.contracts;

import com.buildflow.africa.common.TenantRepository;
import java.util.List;
import java.util.UUID;

public interface ContractMilestoneRepository extends TenantRepository<ContractMilestone> {
  List<ContractMilestone> findByTenantIdAndContractIdOrderBySortOrderAsc(UUID tenantId, UUID contractId);
}
