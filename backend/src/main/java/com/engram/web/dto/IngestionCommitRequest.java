package com.engram.web.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Commit a previewed ingestion plan, creating its pages under an optional parent. */
public record IngestionCommitRequest(
        UUID parentId,
        @NotNull IngestionPlan plan) {
}
