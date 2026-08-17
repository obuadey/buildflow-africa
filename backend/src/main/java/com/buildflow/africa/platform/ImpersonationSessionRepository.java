package com.buildflow.africa.platform;

import com.buildflow.africa.platform.PlatformEntities.ImpersonationSession;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImpersonationSessionRepository extends JpaRepository<ImpersonationSession, UUID> {
  List<ImpersonationSession> findTop50ByOrderByStartedAtDesc();
}
