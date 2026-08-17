package com.buildflow.africa.integrations;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "integration_settings")
public class IntegrationSetting extends TenantEntity {
  @Column(nullable = false) private String provider;
  @Column(nullable = false) private boolean enabled;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb", nullable = false) private String config = "{}";

  public String getProvider() { return provider; }
  public void setProvider(String provider) { this.provider = provider; }
  public boolean isEnabled() { return enabled; }
  public void setEnabled(boolean enabled) { this.enabled = enabled; }
  public String getConfig() { return config; }
  public void setConfig(String config) { this.config = config; }
}
