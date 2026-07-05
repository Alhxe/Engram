package com.engram.repository;

import com.engram.model.MapPlacement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapPlacementRepository extends JpaRepository<MapPlacement, UUID> {

    List<MapPlacement> findByMindMapId(UUID mindMapId);

    Optional<MapPlacement> findByMindMapIdAndNodeId(UUID mindMapId, UUID nodeId);

    long deleteByMindMapIdAndNodeId(UUID mindMapId, UUID nodeId);
}
