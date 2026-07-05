package com.engram.web.dto;

import java.util.UUID;

/** A page the AI judges to be a likely duplicate of the current page. */
public record DuplicateSuggestion(UUID nodeId, String title, String reason) {
}
