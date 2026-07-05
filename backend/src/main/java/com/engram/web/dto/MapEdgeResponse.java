package com.engram.web.dto;

import java.util.UUID;

public record MapEdgeResponse(
        UUID id,
        UUID sourceId,
        UUID targetId) {
}
