package com.engram.web.dto;

import com.engram.model.NodeKind;
import java.util.UUID;

public record MapPlacementResponse(
        UUID nodeId,
        String title,
        NodeKind kind,
        double x,
        double y,
        String color) {
}
