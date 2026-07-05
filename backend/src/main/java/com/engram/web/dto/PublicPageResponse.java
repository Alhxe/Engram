package com.engram.web.dto;

import java.time.Instant;

/** A publicly shared page: only what a read-only viewer needs. */
public record PublicPageResponse(String title, String content, Instant updatedAt) {
}
