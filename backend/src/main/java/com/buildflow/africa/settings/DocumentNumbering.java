package com.buildflow.africa.settings;

import com.buildflow.africa.common.TenantEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "document_numbering")
public class DocumentNumbering extends TenantEntity {
  @Column(name = "document_type", nullable = false) private String documentType;
  @Column(nullable = false) private String pattern;
  @Column(name = "next_sequence", nullable = false) private int nextSequence = 1;

  public String getDocumentType() { return documentType; }
  public void setDocumentType(String documentType) { this.documentType = documentType; }
  public String getPattern() { return pattern; }
  public void setPattern(String pattern) { this.pattern = pattern; }
  public int getNextSequence() { return nextSequence; }
  public void setNextSequence(int nextSequence) { this.nextSequence = nextSequence; }
}
