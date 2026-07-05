package com.engram.repository;

import com.engram.model.AiUsage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiUsageRepository extends JpaRepository<AiUsage, UUID> {

    List<AiUsage> findByUserId(UUID userId);
}
