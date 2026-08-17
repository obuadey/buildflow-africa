package com.buildflow.africa.suppliers;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "suppliers")
public class Supplier extends TenantEntity {
  @Column(nullable = false) private String name;
  @Column(name = "contact_person") private String contactPerson;
  private String phone;
  private String whatsapp;
  private String email;
  private String address;
  private String region;
  private String city;
  @Column(name = "payment_terms") private String paymentTerms;
  private String notes;

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getContactPerson() { return contactPerson; }
  public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }
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
  public String getPaymentTerms() { return paymentTerms; }
  public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }
  public String getNotes() { return notes; }
  public void setNotes(String notes) { this.notes = notes; }
}
