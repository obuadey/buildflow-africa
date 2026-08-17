package com.buildflow.africa.contracts;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "contract_milestones")
public class ContractMilestone extends TenantEntity {

  @Column(name = "contract_id", nullable = false) private UUID contractId;
  @Column(nullable = false) private String name;
  @Column(nullable = false) private BigDecimal percent = BigDecimal.ZERO;
  @Column(nullable = false) private BigDecimal amount = BigDecimal.ZERO;
  @Column(nullable = false) private String status = "PENDING";
  @Column(name = "sort_order", nullable = false) private int sortOrder;

  public UUID getContractId() { return contractId; }
  public void setContractId(UUID contractId) { this.contractId = contractId; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public BigDecimal getPercent() { return percent; }
  public void setPercent(BigDecimal percent) { this.percent = percent; }
  public BigDecimal getAmount() { return amount; }
  public void setAmount(BigDecimal amount) { this.amount = amount; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public int getSortOrder() { return sortOrder; }
  public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
