package com.engram.web.dto;

import java.time.Instant;
import java.util.UUID;

public record WebhookResponse(UUID id, String url, boolean enabled, Instant createdAt) {
}
