package com.engram.web.dto;

import java.util.UUID;

/** An AI-proposed relationship from the current page to another page. */
public record LinkSuggestion(UUID targetId, String title, String relType, String reason) {
}
