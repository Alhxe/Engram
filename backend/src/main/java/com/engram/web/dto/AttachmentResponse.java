package com.engram.web.dto;

import java.time.Instant;
import java.util.UUID;

public record AttachmentResponse(
        UUID id,
        UUID nodeId,
        String filename,
        String contentType,
        long sizeBytes,
        Instant createdAt) {
}
