package com.engram.web.dto;

import java.util.List;
import java.util.UUID;

public record IngestionResult(int createdPages, int createdLinks, List<UUID> pageIds, UUID importId) {
}
