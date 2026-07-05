package com.engram.service;

import com.engram.model.MapPlacement;
import com.engram.model.MindMap;
import com.engram.model.Node;
import com.engram.repository.LinkRepository;
import com.engram.repository.MapPlacementRepository;
import com.engram.repository.MindMapRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.CreateMapRequest;
import com.engram.web.dto.MapDetailResponse;
import com.engram.web.dto.MapEdgeResponse;
import com.engram.web.dto.MapPlacementResponse;
import com.engram.web.dto.MapSummaryResponse;
import com.engram.web.dto.PlacementRequest;
import com.engram.web.error.NotFoundException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MindMapService {

    private final MindMapRepository mindMapRepository;
    private final MapPlacementRepository placementRepository;
    private final NodeRepository nodeRepository;
    private final LinkRepository linkRepository;

    public MindMapService(MindMapRepository mindMapRepository,
                          MapPlacementRepository placementRepository,
                          NodeRepository nodeRepository,
                          LinkRepository linkRepository) {
        this.mindMapRepository = mindMapRepository;
        this.placementRepository = placementRepository;
        this.nodeRepository = nodeRepository;
        this.linkRepository = linkRepository;
    }

    @Transactional
    public MapSummaryResponse create(CreateMapRequest request) {
        MindMap map = new MindMap();
        map.setName(request.name());
        if (request.parentNodeId() != null) {
            map.setParentNode(requireNode(request.parentNodeId()));
        }
        return toSummary(mindMapRepository.saveAndFlush(map));
    }

    @Transactional(readOnly = true)
    public List<MapSummaryResponse> list(UUID parentNodeId) {
        List<MindMap> maps = parentNodeId != null
                ? mindMapRepository.findByParentNodeId(parentNodeId)
                : mindMapRepository.findAll();
        return maps.stream().map(MindMapService::toSummary).toList();
    }

    @Transactional
    public MapSummaryResponse rename(UUID id, String name) {
        MindMap map = requireMap(id);
        map.setName(name);
        return toSummary(map);
    }

    @Transactional
    public void delete(UUID id) {
        if (!mindMapRepository.existsById(id)) {
            throw new NotFoundException("Map not found: " + id);
        }
        mindMapRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public MapDetailResponse getDetail(UUID id) {
        MindMap map = requireMap(id);
        List<MapPlacement> placements = placementRepository.findByMindMapId(id);

        List<MapPlacementResponse> placementResponses = placements.stream()
                .map(placement -> {
                    Node node = placement.getNode();
                    return new MapPlacementResponse(
                            node.getId(), node.getTitle(), node.getKind(),
                            placement.getX(), placement.getY(), placement.getColor());
                })
                .toList();

        Set<UUID> nodeIds = placements.stream()
                .map(placement -> placement.getNode().getId())
                .collect(Collectors.toSet());

        List<MapEdgeResponse> edges = nodeIds.isEmpty()
                ? List.of()
                : linkRepository.findBySourceIdInAndTargetIdIn(nodeIds, nodeIds).stream()
                        .map(link -> new MapEdgeResponse(
                                link.getId(), link.getSource().getId(), link.getTarget().getId()))
                        .toList();

        UUID parentNodeId = map.getParentNode() != null ? map.getParentNode().getId() : null;
        return new MapDetailResponse(map.getId(), map.getName(), parentNodeId, placementResponses, edges);
    }

    @Transactional
    public MapPlacementResponse upsertPlacement(UUID mapId, PlacementRequest request) {
        MindMap map = requireMap(mapId);
        Node node = nodeRepository.findById(request.nodeId())
                .orElseThrow(() -> new NotFoundException("Node not found: " + request.nodeId()));

        MapPlacement placement = placementRepository.findByMindMapIdAndNodeId(mapId, node.getId())
                .orElseGet(() -> {
                    MapPlacement created = new MapPlacement();
                    created.setMindMap(map);
                    created.setNode(node);
                    return created;
                });
        placement.setX(request.x());
        placement.setY(request.y());
        placement.setColor(request.color());
        placement = placementRepository.saveAndFlush(placement);

        return new MapPlacementResponse(
                node.getId(), node.getTitle(), node.getKind(),
                placement.getX(), placement.getY(), placement.getColor());
    }

    @Transactional
    public void removePlacement(UUID mapId, UUID nodeId) {
        placementRepository.deleteByMindMapIdAndNodeId(mapId, nodeId);
    }

    private MindMap requireMap(UUID id) {
        return mindMapRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Map not found: " + id));
    }

    private Node requireNode(UUID id) {
        return nodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Node not found: " + id));
    }

    private static MapSummaryResponse toSummary(MindMap map) {
        UUID parentNodeId = map.getParentNode() != null ? map.getParentNode().getId() : null;
        return new MapSummaryResponse(map.getId(), map.getName(), parentNodeId, map.getCreatedAt());
    }
}
