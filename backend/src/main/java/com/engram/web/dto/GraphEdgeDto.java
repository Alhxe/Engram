package com.engram.web.dto;

import java.util.UUID;

public record GraphEdgeDto(UUID sourceId, UUID targetId, String relType) {
}
