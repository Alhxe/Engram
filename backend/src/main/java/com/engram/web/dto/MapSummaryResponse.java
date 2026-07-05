package com.engram.web.dto;

import java.time.Instant;
import java.util.UUID;

public record MapSummaryResponse(
        UUID id,
        String name,
        UUID parentNodeId,
        Instant createdAt) {
}
