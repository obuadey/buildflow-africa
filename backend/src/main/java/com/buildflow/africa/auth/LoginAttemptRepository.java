package com.buildflow.africa.auth;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, UUID> {
  long countByIpAddressAndSuccessfulFalseAndAttemptedAtAfter(String ipAddress, Instant after);
  long countByEmailAndSuccessfulFalseAndAttemptedAtAfter(String email, Instant after);
}
