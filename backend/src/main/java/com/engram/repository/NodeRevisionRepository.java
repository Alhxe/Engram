package com.engram.repository;

import com.engram.model.NodeRevision;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NodeRevisionRepository extends JpaRepository<NodeRevision, UUID> {

    List<NodeRevision> findByNodeIdOrderByCreatedAtDesc(UUID nodeId);

    Optional<NodeRevision> findFirstByNodeIdOrderByCreatedAtDesc(UUID nodeId);
}
