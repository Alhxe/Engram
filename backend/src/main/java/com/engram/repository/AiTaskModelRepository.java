package com.engram.repository;

import com.engram.ai.AiTask;
import com.engram.model.AiTaskModel;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiTaskModelRepository extends JpaRepository<AiTaskModel, UUID> {

    List<AiTaskModel> findByUserId(UUID userId);

    Optional<AiTaskModel> findByUserIdAndTask(UUID userId, AiTask task);
}
