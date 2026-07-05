package com.engram.web.dto;

import java.util.List;
import java.util.UUID;

public record MapDetailResponse(
        UUID id,
        String name,
        UUID parentNodeId,
        List<MapPlacementResponse> placements,
        List<MapEdgeResponse> edges) {
}
