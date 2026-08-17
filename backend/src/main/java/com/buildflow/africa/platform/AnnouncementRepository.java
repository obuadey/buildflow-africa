package com.buildflow.africa.platform;

import com.buildflow.africa.platform.PlatformEntities.Announcement;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {
  List<Announcement> findByPublishedTrueOrderByStartsAtDesc();
}
