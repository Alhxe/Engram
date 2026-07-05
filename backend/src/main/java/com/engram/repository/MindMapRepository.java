package com.engram.repository;

import com.engram.model.MindMap;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MindMapRepository extends JpaRepository<MindMap, UUID> {

    List<MindMap> findByParentNodeId(UUID parentNodeId);
}
