package com.buildflow.africa.clients;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "clients")
public class Client extends TenantEntity {
  private String clientType;
  private String name;
  private String companyName;
  private String phone;
  private String whatsapp;
  private String email;
  private String address;
  private String region;
  private String city;
  private String taxInformation;
  private String notes;

  public String getClientType() { return clientType; }
  public void setClientType(String clientType) { this.clientType = clientType; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getCompanyName() { return companyName; }
  public void setCompanyName(String companyName) { this.companyName = companyName; }
  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }
  public String getWhatsapp() { return whatsapp; }
  public void setWhatsapp(String whatsapp) { this.whatsapp = whatsapp; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getAddress() { return address; }
  public void setAddress(String address) { this.address = address; }
  public String getRegion() { return region; }
  public void setRegion(String region) { this.region = region; }
  public String getCity() { return city; }
  public void setCity(String city) { this.city = city; }
  public String getTaxInformation() { return taxInformation; }
  public void setTaxInformation(String taxInformation) { this.taxInformation = taxInformation; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
}

