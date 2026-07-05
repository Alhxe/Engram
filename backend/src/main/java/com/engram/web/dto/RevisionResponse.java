package com.engram.web.dto;

import java.time.Instant;
import java.util.UUID;

/** A page revision in the history list: metadata + a short text preview. */
public record RevisionResponse(UUID id, Instant createdAt, String title, String preview) {
}
