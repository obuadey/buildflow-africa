package com.buildflow.africa.contracts;

import com.buildflow.africa.common.NotFoundException;
import com.buildflow.africa.common.TenantContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContractService {

  /** The schedule used when a contract is created without an explicit one. */
  private static final List<Object[]> DEFAULT_SCHEDULE = List.of(
      new Object[] {"Mobilisation", 20},
      new Object[] {"Foundation complete", 15},
      new Object[] {"Superstructure complete", 20},
      new Object[] {"Roofing complete", 15},
      new Object[] {"MEP first fix", 10},
      new Object[] {"Finishing", 15},
      new Object[] {"Practical completion", 5});

  private final ContractRepository contracts;
  private final ContractMilestoneRepository milestones;

  public ContractService(ContractRepository contracts, ContractMilestoneRepository milestones) {
    this.contracts = contracts;
    this.milestones = milestones;
  }

  public Contract require(UUID id) {
    return contracts.findByIdAndTenantId(id, TenantContext.getRequired())
        .orElseThrow(() -> new NotFoundException("CONTRACT_NOT_FOUND", "The requested contract could not be found."));
  }

  public List<ContractMilestone> milestonesFor(UUID contractId) {
    return milestones.findByTenantIdAndContractIdOrderBySortOrderAsc(TenantContext.getRequired(), contractId);
  }

  @Transactional
  public List<ContractMilestone> createDefaultSchedule(Contract contract) {
    UUID tenantId = TenantContext.getRequired();
    int order = 0;
    for (Object[] row : DEFAULT_SCHEDULE) {
      ContractMilestone milestone = new ContractMilestone();
      milestone.setTenantId(tenantId);
      milestone.setContractId(contract.getId());
      milestone.setName((String) row[0]);
      milestone.setPercent(BigDecimal.valueOf((Integer) row[1]));
      milestone.setSortOrder(order++);
      milestones.save(milestone);
    }
    return recalculate(contract);
  }

  /** Milestone amounts always follow the current contract value, including approved variations. */
  @Transactional
  public List<ContractMilestone> recalculate(Contract contract) {
    BigDecimal value = contract.contractValue();
    List<ContractMilestone> rows = milestonesFor(contract.getId());
    for (ContractMilestone milestone : rows) {
      milestone.setAmount(value.multiply(milestone.getPercent())
          .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
      milestones.save(milestone);
    }
    return rows;
  }
}
